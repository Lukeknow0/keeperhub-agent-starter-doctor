import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { canonicalJson, sha256 } from "../core/json.js";
import { UsageError } from "../core/errors.js";
import { SEPOLIA_CHAIN_ID } from "../core/constants.js";
import type {
  FileSha256Condition,
  ReleaseIntent,
  ReleasePlan,
  ReleasePlanUnsigned,
  SimulationEvidence,
  TransferSimulationResult
} from "./types.js";

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function usage(message: string, step: string, causes: string[], fixCommands: string[] = []): never {
  throw new UsageError(message, { step, causes, fixCommands });
}

function isInside(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === "" || (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path));
}

function assertSafePathText(input: string): void {
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(input)) {
    usage(
      "Path contains terminal control characters.",
      "Validate workspace path",
      ["Control characters are not allowed in release paths."],
      ["find . -maxdepth 4 -print"]
    );
  }
}

async function lstatIfExists(path: string): Promise<Awaited<ReturnType<typeof lstat>> | null> {
  try {
    return await lstat(path);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function assertPhysicalWorkspacePath(root: string, candidate: string, input: string): Promise<void> {
  const relativePath = relative(root, candidate);
  const components = relativePath === "" ? [] : relativePath.split(sep);
  let cursor = root;
  for (const [index, component] of components.entries()) {
    cursor = join(cursor, component);
    const metadata = await lstatIfExists(cursor);
    if (metadata === null) break;
    if (metadata.isSymbolicLink()) {
      usage(
        "Release path contains a symbolic link.",
        "Validate workspace path",
        [input],
        ["find . -type l -print"]
      );
    }
    if (index < components.length - 1 && !metadata.isDirectory()) {
      usage("Release path has a non-directory parent component.", "Validate workspace path", [input]);
    }
  }

  let existingParent = dirname(candidate);
  while (await lstatIfExists(existingParent) === null) {
    const next = dirname(existingParent);
    if (next === existingParent) break;
    existingParent = next;
  }
  const physicalParent = await realpath(existingParent);
  if (!isInside(root, physicalParent)) {
    usage("Release path resolves outside the workspace.", "Validate workspace path", [input]);
  }
}

export async function workspaceRoot(workspace: string): Promise<string> {
  return await realpath(resolve(workspace));
}

export async function resolveWorkspacePath(workspace: string, input: string): Promise<string> {
  assertSafePathText(input);
  const root = await workspaceRoot(workspace);
  const candidate = resolve(root, input);
  if (!isInside(root, candidate)) {
    usage("Path escapes the workspace.", "Validate workspace path", [input], ["pwd"]);
  }
  await assertPhysicalWorkspacePath(root, candidate, input);
  return candidate;
}

export async function inspectFileCondition(
  workspace: string,
  inputPath: string,
  expectedSha256: string
): Promise<FileSha256Condition> {
  assertSafePathText(inputPath);
  const normalizedExpected = expectedSha256.trim().toLowerCase();
  if (!SHA256_PATTERN.test(normalizedExpected)) {
    usage(
      "Expected file SHA-256 must be 64 lowercase hexadecimal characters.",
      "Validate release condition",
      ["The supplied digest is not a SHA-256 value."],
      ["shasum -a 256 <file>"]
    );
  }

  const root = await workspaceRoot(workspace);
  const unresolved = resolve(root, inputPath);
  if (!isInside(root, unresolved)) {
    usage("Condition file escapes the workspace.", "Validate release condition", [inputPath]);
  }

  let target: string;
  try {
    target = await realpath(unresolved);
  } catch {
    usage("Condition file does not exist.", "Validate release condition", [inputPath]);
  }
  if (!isInside(root, target)) {
    usage("Condition file resolves outside the workspace.", "Validate release condition", [inputPath]);
  }
  if (!(await stat(target)).isFile()) {
    usage("Condition path is not a regular file.", "Validate release condition", [inputPath]);
  }

  const actual = await hashFile(target);
  if (actual !== normalizedExpected) {
    usage(
      "Release condition is not satisfied.",
      "Verify file SHA-256 condition",
      ["The current file digest does not match the approved digest."],
      [`shasum -a 256 ${JSON.stringify(inputPath)}`]
    );
  }

  return {
    type: "file-sha256",
    path: relative(root, target).split(sep).join("/"),
    sha256: actual
  };
}

export async function verifyFileCondition(workspace: string, condition: FileSha256Condition): Promise<void> {
  const checked = await inspectFileCondition(workspace, condition.path, condition.sha256);
  if (checked.path !== condition.path) {
    usage(
      "Condition file path no longer resolves to the approved target.",
      "Recheck file SHA-256 condition",
      ["The path or a symbolic link changed after preparation."]
    );
  }
}

export async function hashFile(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

export function normalizeAddress(value: string, field: string): string {
  if (!ADDRESS_PATTERN.test(value)) {
    usage(`Invalid ${field}.`, "Validate release intent", [`${field} must be a 20-byte 0x-prefixed address.`]);
  }
  return value.toLowerCase();
}

export function normalizeAmount(value: string): string {
  const trimmed = value.trim();
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,18})?$/.test(trimmed)) {
    usage(
      "Invalid ETH amount.",
      "Validate release intent",
      ["Use a positive base-10 ETH amount with at most 18 decimal places."],
      ["node dist/cli.js release prepare --amount 0.000001 --help"]
    );
  }
  if (ethToWei(trimmed) <= 0n) {
    usage("Release amount must be greater than zero.", "Validate release intent", [trimmed]);
  }
  return trimmed;
}

export function ethToWei(amount: string): bigint {
  const [whole = "0", fraction = ""] = amount.split(".");
  return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0"));
}

export function assertSepoliaEoa(chainId: number, walletType: string): asserts walletType is "eoa" {
  if (chainId !== SEPOLIA_CHAIN_ID) {
    usage(
      "Only Ethereum Sepolia is enabled for the rehearsal release workflow.",
      "Validate release network",
      [`Received chainId ${chainId}.`],
      [`node dist/cli.js release prepare --chain-id ${SEPOLIA_CHAIN_ID} --help`]
    );
  }
  if (walletType !== "eoa") {
    usage(
      "Release execution requires an explicitly asserted EOA wallet.",
      "Validate wallet type",
      [`Received wallet type ${walletType || "unknown"}.`],
      ["node dist/cli.js release prepare --wallet-type eoa --help"]
    );
  }
}

export function createIntentDigest(intent: ReleaseIntent): string {
  return sha256(canonicalJson(intent));
}

export function createPlanDigest(plan: ReleasePlanUnsigned): string {
  return sha256(canonicalJson(plan));
}

export function createPlan(unsigned: ReleasePlanUnsigned): ReleasePlan {
  return { ...unsigned, planDigest: createPlanDigest(unsigned) };
}

export function validatePlan(plan: ReleasePlan, now: Date, allowExpired = false): void {
  if (plan.schemaVersion !== 1 || plan.intent.schemaVersion !== 1) {
    usage("Unsupported release plan version.", "Validate release plan", ["Expected schemaVersion 1."]);
  }
  assertSepoliaEoa(plan.intent.chainId, plan.intent.walletType);
  normalizeAddress(plan.intent.walletAddress, "wallet address");
  normalizeAddress(plan.intent.recipientAddress, "recipient address");
  normalizeAmount(plan.intent.amount);

  const intentDigest = createIntentDigest(plan.intent);
  if (intentDigest !== plan.intentDigest) {
    usage("Release intent was modified after preparation.", "Validate release plan", ["Intent digest mismatch."]);
  }
  const { planDigest: _planDigest, ...unsigned } = plan;
  if (createPlanDigest(unsigned) !== plan.planDigest) {
    usage("Release plan was modified after preparation.", "Validate release plan", ["Plan digest mismatch."]);
  }

  const createdAt = Date.parse(plan.createdAt);
  const expiresAt = Date.parse(plan.expiresAt);
  if (
    !Number.isFinite(createdAt)
    || !Number.isFinite(expiresAt)
    || expiresAt - createdAt !== 10 * 60 * 1_000
  ) {
    usage(
      "Release plan must have an exact ten-minute TTL.",
      "Validate release plan",
      ["expiresAt must be exactly ten minutes after createdAt."]
    );
  }
  validateStoredSimulation(plan.simulation, plan.intent);
  if (!allowExpired && now.getTime() >= expiresAt) {
    usage(
      "Release plan has expired.",
      "Validate release plan",
      ["Plans are valid for ten minutes."],
      ["node dist/cli.js release prepare --help"]
    );
  }
}

export function validateSimulation(
  simulation: TransferSimulationResult,
  intent: ReleaseIntent
): SimulationEvidence {
  if (simulation.status !== "simulated") {
    usage(
      "KeeperHub did not return a simulation-only status.",
      "Validate simulation response",
      [`Expected status "simulated"; received ${JSON.stringify(simulation.status)}.`]
    );
  }
  if (
    (simulation.executionId !== undefined && simulation.executionId !== null)
    || (simulation.transactionHash !== undefined && simulation.transactionHash !== null)
    || (simulation.explorerUrl !== undefined && simulation.explorerUrl !== null)
  ) {
    usage(
      "KeeperHub simulation returned execution or transaction artifacts.",
      "Validate simulation response",
      ["A simulation must not contain an executionId, transaction hash, or explorer URL."]
    );
  }
  if (simulation.success !== true) {
    usage(
      "KeeperHub did not report a successful simulation.",
      "Simulate release transaction",
      [simulation.revertReason || "The simulation response had success=false."]
    );
  }
  if (simulation.wouldRevert !== false) {
    usage(
      "KeeperHub simulation would revert.",
      "Simulate release transaction",
      [simulation.revertReason || "The simulation did not provide a revert reason."]
    );
  }
  const from = normalizeAddress(simulation.from, "simulation sender");
  const to = normalizeAddress(simulation.to, "simulation recipient");
  if (from !== intent.walletAddress || to !== intent.recipientAddress) {
    usage(
      "KeeperHub simulation does not match the approved intent.",
      "Validate simulation response",
      ["Sender or recipient mismatch."]
    );
  }
  const value = simulation.value ?? null;
  if (value === null) {
    usage("KeeperHub simulation omitted the transfer value.", "Validate simulation response", ["Cannot prove the simulated amount."]);
  }
  if (!/^[0-9]+$/.test(value) || BigInt(value) !== ethToWei(intent.amount)) {
    usage("KeeperHub simulation amount does not match the approved intent.", "Validate simulation response", ["Value mismatch."]);
  }
  const gasEstimate = simulation.gasEstimate ?? null;
  if (gasEstimate === null) {
    usage("KeeperHub simulation omitted the gas estimate.", "Validate simulation response", ["Cannot verify the Gas prerequisite."]);
  }
  if (!/^[0-9]+$/.test(gasEstimate) || BigInt(gasEstimate) <= 0n) {
    usage("KeeperHub returned an invalid gas estimate.", "Validate simulation response", [gasEstimate]);
  }
  return { status: "simulated", from, to, value, gasEstimate, wouldRevert: false };
}

function validateStoredSimulation(simulation: SimulationEvidence, intent: ReleaseIntent): void {
  if (
    simulation.status !== "simulated"
    || simulation.wouldRevert !== false
    || normalizeAddress(simulation.from, "simulation sender") !== intent.walletAddress
    || normalizeAddress(simulation.to, "simulation recipient") !== intent.recipientAddress
    || !/^[0-9]+$/.test(simulation.value)
    || BigInt(simulation.value) !== ethToWei(intent.amount)
    || !/^[0-9]+$/.test(simulation.gasEstimate)
    || BigInt(simulation.gasEstimate) <= 0n
  ) {
    usage(
      "Stored simulation evidence does not match the approved intent.",
      "Validate release plan",
      ["Simulation status, sender, recipient, value, Gas, or revert result is inconsistent."]
    );
  }
}
