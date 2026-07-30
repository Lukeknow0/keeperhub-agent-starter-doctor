import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import type { Stats } from "node:fs";
import { access, chmod, lstat, mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { canonicalJson, sha256 } from "../core/json.js";
import { UsageError } from "../core/errors.js";
import type { ReleaseExecutionState, ReleaseExecutionStateUnsigned, ReleasePlan } from "./types.js";
import { resolveWorkspacePath } from "./validation.js";

const digestSchema = z.string().regex(/^[0-9a-f]{64}$/);
const addressSchema = z.string().regex(/^0x[0-9a-f]{40}$/);
const uuidSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
const intentSchema = z.object({
  schemaVersion: z.literal(1),
  chainId: z.literal(11_155_111),
  walletType: z.literal("eoa"),
  walletAddress: addressSchema,
  recipientAddress: addressSchema,
  amount: z.string().regex(/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,18})?$/),
  condition: z.object({
    type: z.literal("file-sha256"),
    path: z.string().min(1),
    sha256: digestSchema
  }).strict()
}).strict();
const simulationEvidenceSchema = z.object({
  status: z.literal("simulated"),
  from: addressSchema,
  to: addressSchema,
  value: z.string().regex(/^[0-9]+$/),
  gasEstimate: z.string().regex(/^[0-9]+$/),
  wouldRevert: z.literal(false)
}).strict();
const releasePlanSchema = z.object({
  schemaVersion: z.literal(1),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  intent: intentSchema,
  intentDigest: digestSchema,
  simulation: simulationEvidenceSchema,
  planDigest: digestSchema
}).strict();
const executionStateSchema = z.object({
  schemaVersion: z.literal(1),
  planDigest: digestSchema,
  intentDigest: digestSchema,
  intent: intentSchema,
  idempotencyKey: uuidSchema,
  idempotencyDigest: digestSchema,
  attemptCount: z.number().int().min(0).max(4),
  maxAttempts: z.literal(4),
  phase: z.enum(["submitting", "submitted", "completed", "ambiguous", "failed", "blocked"]),
  executionId: z.string().min(1).nullable(),
  keeperHubStatus: z.string().min(1).nullable(),
  transactionHash: z.string().min(1).nullable(),
  explorerUrl: z.string().min(1).nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  lastError: z.string().nullable(),
  stateDigest: digestSchema
}).strict();

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

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

function planReservationError(message: string, causes: string[]): UsageError {
  return new UsageError(message, {
    step: "Reserve release plan destination",
    causes
  });
}

async function planPathIsRetained(path: string, expected: FileIdentity): Promise<boolean> {
  const metadata = await lstatIfExists(path);
  return metadata !== null
    && metadata.isFile()
    && metadata.nlink === 1
    && sameIdentity(fileIdentity(metadata), expected);
}

async function assertPlanPathRetained(path: string, expected: FileIdentity): Promise<void> {
  if (!(await planPathIsRetained(path, expected))) {
    throw planReservationError("Release plan reservation identity or link count changed.", [path]);
  }
}

async function assertPlanHandleRetained(handle: FileHandle, expected: FileIdentity): Promise<void> {
  const metadata = await handle.stat();
  if (
    !metadata.isFile()
    || metadata.nlink !== 1
    || !sameIdentity(fileIdentity(metadata), expected)
  ) {
    throw planReservationError("Retained release plan identity or link count changed.", [
      "The reserved plan file was replaced, removed, or multiply linked."
    ]);
  }
}

async function readPlanHandle(handle: FileHandle, expected: FileIdentity): Promise<string> {
  await assertPlanHandleRetained(handle, expected);
  const metadata = await handle.stat();
  const buffer = Buffer.alloc(metadata.size);
  let offset = 0;
  while (offset < buffer.length) {
    const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset);
    if (bytesRead === 0) {
      throw planReservationError("Retained release plan contents changed.", [
        "The reserved plan became shorter while it was being checked."
      ]);
    }
    offset += bytesRead;
  }
  await assertPlanHandleRetained(handle, expected);
  if ((await handle.stat()).size !== metadata.size) {
    throw planReservationError("Retained release plan contents changed.", [
      "The reserved plan size changed while it was being checked."
    ]);
  }
  return buffer.toString("utf8");
}

async function assertPlanContents(
  handle: FileHandle,
  expectedIdentity: FileIdentity,
  expectedContents: string
): Promise<void> {
  if (await readPlanHandle(handle, expectedIdentity) !== expectedContents) {
    throw planReservationError("Retained release plan contents changed.", [
      "Another writer mutated the reserved plan file."
    ]);
  }
}

async function assertClosedPlanRetained(
  path: string,
  expectedIdentity: FileIdentity,
  expectedContents: string
): Promise<void> {
  await assertPlanPathRetained(path, expectedIdentity);
  const verificationHandle = await open(
    path,
    constants.O_RDONLY | constants.O_NOFOLLOW
  );
  try {
    await assertPlanContents(verificationHandle, expectedIdentity, expectedContents);
  } finally {
    await verificationHandle.close();
  }
  await assertPlanPathRetained(path, expectedIdentity);
}

async function atomicWrite(workspace: string, inputPath: string, value: string, mode: number): Promise<string> {
  let path = await resolveWorkspacePath(workspace, inputPath);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  path = await resolveWorkspacePath(workspace, inputPath);
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx", mode);
  try {
    await handle.writeFile(value, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await chmod(temporary, mode);
  await rename(temporary, path);
  await chmod(path, mode);
  return path;
}

export async function writePlanFile(workspace: string, inputPath: string, plan: ReleasePlan): Promise<string> {
  return await atomicWrite(workspace, inputPath, `${JSON.stringify(plan, null, 2)}\n`, 0o644);
}

export interface PlanFileReservation {
  readonly identity: FileIdentity;
  write(plan: ReleasePlan): Promise<string>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export async function reservePlanFile(workspace: string, inputPath: string): Promise<PlanFileReservation> {
  let path = await resolveWorkspacePath(workspace, inputPath);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  path = await resolveWorkspacePath(workspace, inputPath);
  let handle: FileHandle;
  try {
    handle = await open(path, "wx+", 0o644);
  } catch (error) {
    throw new UsageError("Cannot reserve release plan exclusively.", {
      step: "Reserve release plan destination",
      causes: [error instanceof Error ? error.message : String(error)]
    });
  }
  let identity: FileIdentity | null = null;
  try {
    const metadata = await handle.stat();
    identity = fileIdentity(metadata);
    await assertPlanHandleRetained(handle, identity);
    await assertPlanPathRetained(path, identity);
    await assertPlanContents(handle, identity, "");
  } catch (error) {
    await handle.close().catch(() => undefined);
    if (identity !== null && await planPathIsRetained(path, identity)) {
      await unlink(path).catch(() => undefined);
    }
    if (error instanceof UsageError) throw error;
    throw planReservationError("Cannot establish a retained release plan reservation.", [
      error instanceof Error ? error.message : String(error)
    ]);
  }
  let active = true;
  let handleClosed = false;
  let written = false;
  let expectedContents = "";
  return {
    identity: { ...identity! },
    async write(plan): Promise<string> {
      if (!active) throw new Error("Release plan reservation is no longer active.");
      if (written) throw new Error("Release plan reservation has already been written.");
      await assertPlanHandleRetained(handle, identity!);
      await assertPlanPathRetained(path, identity!);
      await assertPlanContents(handle, identity!, "");
      const serializedPlan = `${JSON.stringify(plan, null, 2)}\n`;
      await handle.writeFile(serializedPlan, "utf8");
      expectedContents = serializedPlan;
      await handle.sync();
      await assertPlanHandleRetained(handle, identity!);
      await assertPlanPathRetained(path, identity!);
      await assertPlanContents(handle, identity!, expectedContents);
      await handle.chmod(0o644);
      await handle.sync();
      await assertPlanHandleRetained(handle, identity!);
      await assertPlanPathRetained(path, identity!);
      await assertPlanContents(handle, identity!, expectedContents);
      written = true;
      return path;
    },
    async commit(): Promise<void> {
      if (!active) throw new Error("Release plan reservation is no longer active.");
      if (!written) throw new Error("Release plan reservation cannot commit before it is written.");
      await assertPlanHandleRetained(handle, identity!);
      await assertPlanPathRetained(path, identity!);
      await assertPlanContents(handle, identity!, expectedContents);
      await handle.close();
      handleClosed = true;
      await assertClosedPlanRetained(path, identity!, expectedContents);
      active = false;
    },
    async rollback(): Promise<void> {
      if (!active) return;
      active = false;
      let retentionError: unknown;
      if (!handleClosed) {
        try {
          await assertPlanHandleRetained(handle, identity!);
          await assertPlanPathRetained(path, identity!);
          await assertPlanContents(handle, identity!, expectedContents);
          await unlink(path);
        } catch (error) {
          retentionError = error;
        }
        try {
          await handle.close();
          handleClosed = true;
        } catch (error) {
          retentionError ??= error;
        }
      } else {
        try {
          await assertClosedPlanRetained(path, identity!, expectedContents);
          await unlink(path);
        } catch (error) {
          retentionError = error;
        }
      }
      if (retentionError !== undefined) throw retentionError;
    }
  };
}

export async function readPlanFile(workspace: string, inputPath: string): Promise<ReleasePlan> {
  const path = await resolveWorkspacePath(workspace, inputPath);
  let value: unknown;
  try {
    value = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new UsageError("Cannot read release plan.", {
      step: "Load release plan",
      causes: [error instanceof Error ? error.message : String(error)]
    });
  }
  const result = releasePlanSchema.safeParse(value);
  if (!result.success) {
    throw new UsageError("Release plan has an invalid schema.", {
      step: "Validate release plan",
      causes: result.error.issues.map((issue) => `${issue.path.join(".") || "plan"}: ${issue.message}`)
    });
  }
  return result.data as ReleasePlan;
}

export function signState(unsigned: ReleaseExecutionStateUnsigned): ReleaseExecutionState {
  return { ...unsigned, stateDigest: sha256(canonicalJson(unsigned)) };
}

export async function writeStateFile(
  workspace: string,
  inputPath: string,
  state: ReleaseExecutionState
): Promise<string> {
  return await atomicWrite(workspace, inputPath, `${JSON.stringify(state, null, 2)}\n`, 0o600);
}

export async function createStateFile(
  workspace: string,
  inputPath: string,
  state: ReleaseExecutionState
): Promise<string> {
  let path = await resolveWorkspacePath(workspace, inputPath);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  path = await resolveWorkspacePath(workspace, inputPath);
  let handle;
  try {
    handle = await open(path, "wx", 0o600);
    await handle.writeFile(`${JSON.stringify(state, null, 2)}\n`, "utf8");
    await handle.sync();
  } catch (error) {
    throw new UsageError("Cannot create private execution state exclusively.", {
      step: "Create private execution state",
      causes: [error instanceof Error ? error.message : String(error)],
      fixCommands: ["node dist/cli.js release status --help"]
    });
  } finally {
    await handle?.close();
  }
  await chmod(path, 0o600);
  return path;
}

export async function assertStateFileAbsent(workspace: string, inputPath: string): Promise<void> {
  const path = await resolveWorkspacePath(workspace, inputPath);
  if (await exists(path)) {
    throw new UsageError("Execution state already exists.", {
      step: "Create private execution state",
      causes: ["Refusing to replace an idempotency key or an in-flight execution."],
      fixCommands: ["node dist/cli.js release status --help"]
    });
  }
}

export async function readStateFile(workspace: string, inputPath: string): Promise<ReleaseExecutionState> {
  const path = await resolveWorkspacePath(workspace, inputPath);
  const mode = (await stat(path)).mode & 0o777;
  if ((mode & 0o077) !== 0) {
    throw new UsageError("Private execution state has unsafe permissions.", {
      step: "Load private execution state",
      causes: [`Expected mode 600; found ${mode.toString(8)}.`],
      fixCommands: [`chmod 600 ${JSON.stringify(inputPath)}`]
    });
  }
  let value: unknown;
  try {
    value = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new UsageError("Cannot read private execution state.", {
      step: "Load private execution state",
      causes: [error instanceof Error ? error.message : String(error)]
    });
  }
  const result = executionStateSchema.safeParse(value);
  if (!result.success) {
    throw new UsageError("Private execution state has an invalid schema.", {
      step: "Validate private execution state",
      causes: result.error.issues.map((issue) => `${issue.path.join(".") || "state"}: ${issue.message}`)
    });
  }
  const parsed = result.data as ReleaseExecutionState;
  const { stateDigest, ...unsigned } = parsed;
  if (typeof stateDigest !== "string" || sha256(canonicalJson(unsigned)) !== stateDigest) {
    throw new UsageError("Private execution state was modified.", {
      step: "Validate private execution state",
      causes: ["State digest mismatch."]
    });
  }
  if (sha256(parsed.idempotencyKey) !== parsed.idempotencyDigest) {
    throw new UsageError("Private execution state has an inconsistent idempotency digest.", {
      step: "Validate private execution state",
      causes: ["idempotencyDigest does not match the persisted UUID."]
    });
  }
  if (sha256(canonicalJson(parsed.intent)) !== parsed.intentDigest) {
    throw new UsageError("Private execution state has an inconsistent intent digest.", {
      step: "Validate private execution state",
      causes: ["intentDigest does not match the persisted release intent."]
    });
  }
  return parsed;
}
