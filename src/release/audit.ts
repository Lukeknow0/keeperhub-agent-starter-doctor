import { constants } from "node:fs";
import type { Stats } from "node:fs";
import { lstat, mkdir, open, readFile, unlink } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { dirname } from "node:path";
import { canonicalJson, sha256 } from "../core/json.js";
import { UsageError } from "../core/errors.js";
import { redact } from "../core/redact.js";
import type { JsonValue } from "../core/types.js";
import type { AuditRecord, AuditRecordUnsigned, AuditVerification } from "./types.js";
import { resolveWorkspacePath } from "./validation.js";

interface FileIdentity {
  dev: number;
  ino: number;
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;
}

async function lstatIfExists(path: string): Promise<Stats | null> {
  try {
    return await lstat(path);
  } catch (error) {
    if (errorCode(error) === "ENOENT") return null;
    throw error;
  }
}

function fileIdentity(stats: Stats): FileIdentity {
  return { dev: stats.dev, ino: stats.ino };
}

function sameIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function auditUsage(message: string, causes: string[]): UsageError {
  return new UsageError(message, {
    step: "Reserve public audit destination",
    causes
  });
}

async function pathHasIdentity(path: string, expected: FileIdentity): Promise<boolean> {
  const metadata = await lstatIfExists(path);
  return metadata !== null
    && metadata.isFile()
    && metadata.nlink === 1
    && sameIdentity(fileIdentity(metadata), expected);
}

async function assertPathIdentity(path: string, expected: FileIdentity, label: string): Promise<void> {
  if (!(await pathHasIdentity(path, expected))) {
    throw auditUsage(`${label} identity changed while exclusively reserved.`, [path]);
  }
}

async function readRetainedFile(handle: FileHandle, expected: FileIdentity): Promise<string> {
  const before = await handle.stat();
  if (!before.isFile() || before.nlink !== 1 || !sameIdentity(fileIdentity(before), expected)) {
    throw auditUsage("Retained audit file identity or link count changed.", [
      "The open audit handle no longer names one uniquely linked reserved file."
    ]);
  }
  const buffer = Buffer.alloc(before.size);
  let offset = 0;
  while (offset < buffer.length) {
    const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset);
    if (bytesRead === 0) {
      throw auditUsage("Audit destination changed while exclusively reserved.", [
        "The retained file became shorter while it was being checked."
      ]);
    }
    offset += bytesRead;
  }
  const after = await handle.stat();
  if (
    !after.isFile()
    || after.nlink !== 1
    || !sameIdentity(fileIdentity(after), expected)
    || after.size !== before.size
  ) {
    throw auditUsage("Audit destination changed while exclusively reserved.", [
      "The retained file changed while it was being checked."
    ]);
  }
  return buffer.toString("utf8");
}

function recordHash(unsigned: AuditRecordUnsigned): string {
  return sha256(canonicalJson(unsigned));
}

function parseLines(contents: string): { records: AuditRecord[]; errors: string[] } {
  const lines = contents.split("\n");
  if (lines.at(-1) === "") lines.pop();
  const records: AuditRecord[] = [];
  const errors: string[] = [];
  for (const [offset, line] of lines.entries()) {
    if (line.trim() === "") {
      errors.push(`line ${offset + 1}: blank records are not allowed`);
      continue;
    }
    try {
      const value: unknown = JSON.parse(line);
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        errors.push(`line ${offset + 1}: record must be a JSON object`);
      } else {
        records.push(value as AuditRecord);
      }
    } catch {
      errors.push(`line ${offset + 1}: invalid JSON`);
    }
  }
  return { records, errors };
}

export function verifyAuditContents(contents: string): AuditVerification {
  const { records, errors } = parseLines(contents);
  let previousHash: string | null = null;
  for (const [offset, record] of records.entries()) {
    const line = offset + 1;
    if (record.schemaVersion !== 1) errors.push(`line ${line}: unsupported schemaVersion`);
    if (record.index !== offset) errors.push(`line ${line}: expected index ${offset}`);
    if (record.previousHash !== previousHash) errors.push(`line ${line}: previousHash mismatch`);
    const { hash, ...unsigned } = record;
    if (typeof hash !== "string" || recordHash(unsigned) !== hash) errors.push(`line ${line}: hash mismatch`);
    previousHash = typeof record.hash === "string" ? record.hash : null;
  }
  return {
    ok: errors.length === 0,
    records: records.length,
    headHash: records.at(-1)?.hash ?? null,
    errors
  };
}

export async function verifyAuditFile(workspace: string, inputPath: string): Promise<AuditVerification> {
  const path = await resolveWorkspacePath(workspace, inputPath);
  if ((await lstatIfExists(path)) === null) {
    return { ok: false, records: 0, headHash: null, errors: ["Audit file does not exist."] };
  }
  return verifyAuditContents(await readFile(path, "utf8"));
}

export interface AuditDestinationReservation {
  readonly identity: FileIdentity;
  append(event: string, data: JsonValue, now: Date): Promise<AuditRecord>;
  assertRetained(): Promise<void>;
  release(): Promise<void>;
}

export async function reserveAuditDestination(
  workspace: string,
  inputPath: string
): Promise<AuditDestinationReservation> {
  let path = await resolveWorkspacePath(workspace, inputPath);
  await mkdir(dirname(path), { recursive: true });
  path = await resolveWorkspacePath(workspace, inputPath);
  const lockPath = await resolveWorkspacePath(workspace, `${inputPath}.lock`);
  let lockHandle: FileHandle | null = null;
  let lockIdentity: FileIdentity | null = null;
  let destinationHandle: FileHandle | null = null;
  let destinationIdentity: FileIdentity | null = null;
  let createdDestination = false;

  try {
    try {
      lockHandle = await open(lockPath, "wx", 0o600);
      lockIdentity = fileIdentity(await lockHandle.stat());
      await lockHandle.writeFile("keeperhub audit reservation\n", "utf8");
      await lockHandle.sync();
      await assertPathIdentity(lockPath, lockIdentity, "Audit lock");
    } catch (error) {
      throw auditUsage("Cannot reserve audit destination exclusively.", [
        error instanceof Error ? error.message : String(error),
        "An existing lock is treated as active or ambiguous and is never removed automatically."
      ]);
    }

    try {
      destinationHandle = await open(path, "ax+", 0o644);
      createdDestination = true;
    } catch (error) {
      if (errorCode(error) !== "EEXIST") throw error;
      destinationHandle = await open(
        path,
        constants.O_RDWR | constants.O_APPEND | constants.O_NOFOLLOW
      );
    }

    const destinationStats = await destinationHandle.stat();
    if (!destinationStats.isFile() || destinationStats.nlink !== 1) {
      throw auditUsage("Audit destination is not a uniquely linked regular file.", [inputPath]);
    }
    destinationIdentity = fileIdentity(destinationStats);
    await assertPathIdentity(path, destinationIdentity, "Audit destination");
    let expectedContents = await readRetainedFile(destinationHandle, destinationIdentity);
    const initialVerification = verifyAuditContents(expectedContents);
    if (!initialVerification.ok) {
      throw auditUsage("Existing audit destination has an invalid hash chain.", initialVerification.errors);
    }

    let active = true;
    let closing = false;
    let appendTail = Promise.resolve();
    const assertRetained = async (): Promise<void> => {
      if (!active) throw new Error("Audit destination reservation is no longer active.");
      await assertPathIdentity(lockPath, lockIdentity!, "Audit lock");
      await assertPathIdentity(path, destinationIdentity!, "Audit destination");
      const currentContents = await readRetainedFile(destinationHandle!, destinationIdentity!);
      if (currentContents !== expectedContents) {
        throw auditUsage("Audit destination changed while exclusively reserved.", [
          "The retained audit contents were mutated by another writer."
        ]);
      }
      await assertPathIdentity(path, destinationIdentity!, "Audit destination");
      await assertPathIdentity(lockPath, lockIdentity!, "Audit lock");
    };

    const appendRecord = async (event: string, data: JsonValue, now: Date): Promise<AuditRecord> => {
      await assertRetained();
      const verification = verifyAuditContents(expectedContents);
      if (!verification.ok) {
        throw new Error(`Refusing to append to an invalid audit chain: ${verification.errors.join("; ")}`);
      }
      const unsigned: AuditRecordUnsigned = {
        schemaVersion: 1,
        index: verification.records,
        timestamp: now.toISOString(),
        event,
        data: redact(data),
        previousHash: verification.headHash
      };
      const record: AuditRecord = { ...unsigned, hash: recordHash(unsigned) };
      const separator = expectedContents.length > 0 && !expectedContents.endsWith("\n") ? "\n" : "";
      const addition = `${separator}${JSON.stringify(record)}\n`;
      await destinationHandle!.appendFile(addition, "utf8");
      await destinationHandle!.sync();
      expectedContents += addition;
      await assertRetained();
      return record;
    };

    return {
      identity: { ...destinationIdentity! },
      append(event, data, now): Promise<AuditRecord> {
        if (!active || closing) {
          return Promise.reject(new Error("Audit destination reservation is no longer accepting appends."));
        }
        const operation = appendTail.then(async () => await appendRecord(event, data, now));
        appendTail = operation.then(() => undefined, () => undefined);
        return operation;
      },
      assertRetained,
      async release(): Promise<void> {
        if (!active) return;
        closing = true;
        await appendTail;
        let retentionError: unknown;
        let cleanupError: unknown;
        try {
          await assertRetained();
        } catch (error) {
          retentionError = error;
        }
        let ownsLock = false;
        try {
          ownsLock = await pathHasIdentity(lockPath, lockIdentity!);
          if (
            createdDestination
            && expectedContents.length === 0
            && ownsLock
            && await pathHasIdentity(path, destinationIdentity!)
            && await readRetainedFile(destinationHandle!, destinationIdentity!) === ""
          ) {
            await unlink(path);
          }
        } catch (error) {
          cleanupError = error;
        }
        try {
          await destinationHandle!.close();
        } catch (error) {
          cleanupError ??= error;
        }
        if (ownsLock) {
          try {
            await unlink(lockPath);
          } catch (error) {
            cleanupError ??= error;
          }
        }
        try {
          await lockHandle!.close();
        } catch (error) {
          cleanupError ??= error;
        }
        active = false;
        if (retentionError !== undefined) throw retentionError;
        if (cleanupError !== undefined) throw cleanupError;
      }
    };
  } catch (error) {
    let cleanupError: unknown;
    try {
      if (
        createdDestination
        && destinationHandle !== null
        && destinationIdentity !== null
        && await pathHasIdentity(path, destinationIdentity)
        && await readRetainedFile(destinationHandle, destinationIdentity) === ""
      ) {
        await unlink(path);
      }
    } catch (caught) {
      cleanupError = caught;
    }
    try {
      await destinationHandle?.close();
    } catch (caught) {
      cleanupError ??= caught;
    }
    if (lockHandle !== null && lockIdentity === null) {
      try {
        lockIdentity = fileIdentity(await lockHandle.stat());
      } catch (caught) {
        cleanupError ??= caught;
      }
    }
    try {
      if (lockHandle !== null && lockIdentity !== null && await pathHasIdentity(lockPath, lockIdentity)) {
        await unlink(lockPath);
      }
    } catch (caught) {
      cleanupError ??= caught;
    }
    try {
      await lockHandle?.close();
    } catch (caught) {
      cleanupError ??= caught;
    }
    if (error instanceof UsageError) throw error;
    throw auditUsage("Cannot safely open the audit destination.", [
      error instanceof Error ? error.message : String(error),
      ...(cleanupError === undefined
        ? []
        : [`Cleanup also failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`])
    ]);
  }
}

export async function appendAuditEvent(
  workspace: string,
  inputPath: string,
  event: string,
  data: JsonValue,
  now: Date
): Promise<AuditRecord> {
  const reservation = await reserveAuditDestination(workspace, inputPath);
  try {
    return await reservation.append(event, data, now);
  } finally {
    await reservation.release();
  }
}
