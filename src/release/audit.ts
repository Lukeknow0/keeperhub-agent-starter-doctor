import { constants } from "node:fs";
import { access, appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { canonicalJson, sha256 } from "../core/json.js";
import { redact } from "../core/redact.js";
import type { JsonValue } from "../core/types.js";
import type { AuditRecord, AuditRecordUnsigned, AuditVerification } from "./types.js";
import { resolveWorkspacePath } from "./validation.js";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
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
  if (!(await exists(path))) {
    return { ok: false, records: 0, headHash: null, errors: ["Audit file does not exist."] };
  }
  return verifyAuditContents(await readFile(path, "utf8"));
}

export async function appendAuditEvent(
  workspace: string,
  inputPath: string,
  event: string,
  data: JsonValue,
  now: Date
): Promise<AuditRecord> {
  let path = await resolveWorkspacePath(workspace, inputPath);
  const existing = (await exists(path)) ? await readFile(path, "utf8") : "";
  const verification = verifyAuditContents(existing);
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
  await mkdir(dirname(path), { recursive: true });
  path = await resolveWorkspacePath(workspace, inputPath);
  const separator = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
  await appendFile(path, `${separator}${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o644 });
  return record;
}
