import { randomUUID as nodeRandomUUID } from "node:crypto";
import { setTimeout as sleepTimer } from "node:timers/promises";
import { PLAN_TTL_MS, SEPOLIA_CHAIN_ID } from "../core/constants.js";
import { AppError, UsageError, errorMessage } from "../core/errors.js";
import { canonicalJson, sha256 } from "../core/json.js";
import { redactString } from "../core/redact.js";
import type { JsonValue } from "../core/types.js";
import { appendAuditEvent } from "./audit.js";
import { nodeConfirmIO, requestConfirmation, requestRetryConfirmation } from "./confirm.js";
import {
  assertStateFileAbsent,
  createStateFile,
  readPlanFile,
  readStateFile,
  signState,
  writePlanFile,
  writeStateFile
} from "./files.js";
import type {
  ExecutionStatusResult,
  ReleaseExecutionState,
  ReleaseExecutionStateUnsigned,
  ReleasePlan,
  ReleaseRuntime,
  TransferRequest
} from "./types.js";
import {
  assertSepoliaEoa,
  createIntentDigest,
  createPlan,
  inspectFileCondition,
  normalizeAddress,
  normalizeAmount,
  validatePlan,
  validateSimulation,
  verifyFileCondition
} from "./validation.js";

const MAX_SAFE_RETRIES = 3;
const MAX_ATTEMPTS = 1 + MAX_SAFE_RETRIES;
const MAX_RETRY_DELAY_MS = 30_000;
const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled", "canceled"]);
const TRANSACTION_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;
// The rehearsal branch must not broadcast before the conservative hackathon
// opening checkpoint (2026-07-27 19:01 Asia/Shanghai).
const EXECUTION_NOT_BEFORE_MS = Date.parse("2026-07-27T11:01:00.000Z");

type Clock = () => Date;

export interface PrepareReleaseInput {
  conditionFile: string;
  expectedSha256: string;
  recipientAddress: string;
  amount: string;
  chainId: number;
  walletType: string;
  planPath: string;
  auditPath: string;
}

export interface ExecuteReleaseInput {
  planPath: string;
  statePath: string;
  auditPath: string;
  walletType: string;
  maxStatusPolls?: number;
}

export interface RetryReleaseInput {
  planPath: string;
  statePath: string;
  auditPath: string;
  maxStatusPolls?: number;
}

export interface StatusReleaseInput {
  statePath: string;
  auditPath: string;
  poll?: boolean;
  maxStatusPolls?: number;
}

export interface ExecuteReleaseResult {
  outcome: "cancelled" | "submitted" | "completed" | "ambiguous" | "failed";
  state: ReleaseExecutionState | null;
  status: ExecutionStatusResult | null;
}

function clock(runtime: ReleaseRuntime): Clock {
  return runtime.now ?? (() => new Date());
}

function sleeper(runtime: ReleaseRuntime): (milliseconds: number) => Promise<void> {
  return runtime.sleep ?? (async (milliseconds) => { await sleepTimer(milliseconds); });
}

function assertExecutionWindow(now: Date): void {
  if (now.getTime() < EXECUTION_NOT_BEFORE_MS) {
    throw new UsageError("Real release execution is locked during the pre-event rehearsal.", {
      step: "Enforce hackathon execution window",
      causes: ["Broadcasts are disabled until 2026-07-27 19:01 Asia/Shanghai."],
      fixCommands: ["node dist/cli.js release prepare --help"]
    });
  }
}

function transferRequest(plan: ReleasePlan): TransferRequest {
  return {
    chainId: plan.intent.chainId,
    recipientAddress: plan.intent.recipientAddress,
    amount: plan.intent.amount
  };
}

async function revalidateBeforePost(
  approvedPlan: ReleasePlan,
  planPath: string,
  runtime: ReleaseRuntime,
  allowExpired: boolean
): Promise<void> {
  const currentPlan = await readPlanFile(runtime.workspace, planPath);
  validatePlan(currentPlan, clock(runtime)(), allowExpired);
  if (
    currentPlan.planDigest !== approvedPlan.planDigest
    || currentPlan.intentDigest !== approvedPlan.intentDigest
    || canonicalJson(currentPlan.intent) !== canonicalJson(approvedPlan.intent)
  ) {
    throw new UsageError("Release plan changed after confirmation.", {
      step: "Revalidate confirmed release",
      causes: ["The current plan no longer matches the exact request shown in the TTY."],
      fixCommands: ["node dist/cli.js release prepare --help"]
    });
  }
  await verifyFileCondition(runtime.workspace, currentPlan.intent.condition);
  const currentWallet = normalizeAddress(
    (await runtime.client.getWallet(currentPlan.intent.chainId)).walletAddress,
    "wallet address"
  );
  if (currentWallet !== currentPlan.intent.walletAddress) {
    throw new UsageError("The active KeeperHub wallet changed after simulation.", {
      step: "Revalidate confirmed release sender",
      causes: [`Expected ${currentPlan.intent.walletAddress}; KeeperHub now reports ${currentWallet}.`],
      fixCommands: ["node dist/cli.js release prepare --help"]
    });
  }
}

function toJsonData(value: Record<string, unknown>): JsonValue {
  return value as JsonValue;
}

export async function prepareRelease(input: PrepareReleaseInput, runtime: ReleaseRuntime): Promise<ReleasePlan> {
  assertSepoliaEoa(input.chainId, input.walletType);
  const now = clock(runtime)();
  const condition = await inspectFileCondition(runtime.workspace, input.conditionFile, input.expectedSha256);
  const chain = await runtime.client.getChain(input.chainId);
  if (chain === null || chain.chainId !== SEPOLIA_CHAIN_ID || !chain.enabled || !chain.isTestnet) {
    throw new AppError("Ethereum Sepolia is not available for release simulation.", {
      step: "Check KeeperHub network",
      causes: [chain === null ? "Chain was not returned by KeeperHub." : "Chain is disabled or is not marked as testnet."]
    });
  }
  const wallet = await runtime.client.getWallet(input.chainId);
  const walletAddress = normalizeAddress(wallet.walletAddress, "wallet address");
  const intent = {
    schemaVersion: 1 as const,
    chainId: input.chainId,
    walletType: "eoa" as const,
    walletAddress,
    recipientAddress: normalizeAddress(input.recipientAddress, "recipient address"),
    amount: normalizeAmount(input.amount),
    condition
  };
  const intentDigest = createIntentDigest(intent);
  const rawSimulation = await runtime.client.simulateTransfer({
    chainId: intent.chainId,
    recipientAddress: intent.recipientAddress,
    amount: intent.amount,
    simulate: true
  });
  const simulation = validateSimulation(rawSimulation, intent);
  const plan = createPlan({
    schemaVersion: 1,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + PLAN_TTL_MS).toISOString(),
    intent,
    intentDigest,
    simulation
  });
  await writePlanFile(runtime.workspace, input.planPath, plan);
  await appendAuditEvent(runtime.workspace, input.auditPath, "condition", {
    type: condition.type,
    path: condition.path,
    sha256: condition.sha256,
    satisfied: true
  }, now);
  await appendAuditEvent(runtime.workspace, input.auditPath, "simulation", {
    planDigest: plan.planDigest,
    intentDigest,
    chainId: intent.chainId,
    from: simulation.from,
    to: simulation.to,
    amount: intent.amount,
    gasEstimate: simulation.gasEstimate,
    wouldRevert: simulation.wouldRevert
  }, now);
  return plan;
}

interface ErrorShape {
  status: number | undefined;
  code: string | undefined;
  retryAfterMs: number | undefined;
  message: string;
}

function errorShape(error: unknown): ErrorShape {
  const record = typeof error === "object" && error !== null ? error as Record<string, unknown> : {};
  const body = typeof record.body === "object" && record.body !== null
    ? record.body as Record<string, unknown>
    : {};
  const bodyCode = typeof body.code === "string"
    ? body.code
    : typeof body.error === "string" && body.error === "idempotency_in_progress"
      ? body.error
      : undefined;
  const headers = record.headers instanceof Headers ? record.headers : null;
  const retryAfter = headers?.get("Retry-After") ?? null;
  const retryAfterSeconds = retryAfter === null ? undefined : Number(retryAfter);
  const directRetryAfter = typeof record.retryAfterMs === "number"
    && Number.isFinite(record.retryAfterMs)
    && record.retryAfterMs >= 0
    ? Math.min(record.retryAfterMs, MAX_RETRY_DELAY_MS)
    : undefined;
  const message = redactString(errorMessage(error));
  return {
    status: typeof record.status === "number" ? record.status : undefined,
    code: typeof record.code === "string"
      ? record.code
      : bodyCode ?? (message.includes("idempotency_in_progress") ? "idempotency_in_progress" : undefined),
    retryAfterMs: directRetryAfter !== undefined
      ? directRetryAfter
      : retryAfterSeconds !== undefined && Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0
        ? Math.min(retryAfterSeconds * 1_000, MAX_RETRY_DELAY_MS)
        : undefined,
    message
  };
}

function canRetry(error: ErrorShape): boolean {
  if (error.code === "idempotency_in_progress") return true;
  if (error.status === undefined || error.status === 0) return true;
  return error.status === 408 || error.status === 429 || error.status >= 500;
}

function updateState(state: ReleaseExecutionState, patch: Partial<ReleaseExecutionStateUnsigned>, now: Date): ReleaseExecutionState {
  const { stateDigest: _stateDigest, ...unsigned } = state;
  return signState({ ...unsigned, ...patch, updatedAt: now.toISOString() });
}

async function persistState(runtime: ReleaseRuntime, path: string, state: ReleaseExecutionState): Promise<void> {
  await writeStateFile(runtime.workspace, path, state);
}

async function submitWithSafeRetries(
  plan: ReleasePlan,
  initialState: ReleaseExecutionState,
  input: { planPath: string; statePath: string; auditPath: string; allowExpiredPlan: boolean },
  runtime: ReleaseRuntime
): Promise<ReleaseExecutionState> {
  const now = clock(runtime);
  const sleep = sleeper(runtime);
  let state = initialState;
  while (state.attemptCount < state.maxAttempts) {
    assertExecutionWindow(now());
    await revalidateBeforePost(plan, input.planPath, runtime, input.allowExpiredPlan);
    const attempt = state.attemptCount + 1;
    state = updateState(state, { attemptCount: attempt, phase: "submitting", lastError: null }, now());
    await persistState(runtime, input.statePath, state);
    try {
      const submission = await runtime.client.executeTransfer(transferRequest(plan), {
        idempotencyKey: state.idempotencyKey
      });
      if (!submission.executionId) throw new Error("KeeperHub returned no executionId.");
      state = updateState(state, {
        phase: "submitted",
        executionId: submission.executionId,
        keeperHubStatus: submission.status,
        lastError: null
      }, now());
      await persistState(runtime, input.statePath, state);
      await appendAuditEvent(runtime.workspace, input.auditPath, "submit", {
        planDigest: plan.planDigest,
        executionId: submission.executionId,
        status: submission.status,
        attempt,
        idempotencyDigest: state.idempotencyDigest
      }, now());
      return state;
    } catch (error) {
      const shaped = errorShape(error);
      const retryable = canRetry(shaped);
      const hasBudget = attempt < state.maxAttempts;
      state = updateState(state, {
        phase: retryable && hasBudget ? "submitting" : (shaped.status === 409 ? "blocked" : "failed"),
        lastError: shaped.message
      }, now());
      await persistState(runtime, input.statePath, state);
      if (!retryable || !hasBudget) {
        throw new AppError(
          shaped.status === 409 ? "KeeperHub rejected the idempotency key with a conflict." : "KeeperHub submission failed.",
          {
            step: "Submit release transaction",
            causes: [shaped.message],
            fixCommands: shaped.status === 409
              ? ["node dist/cli.js release status --help"]
              : ["node dist/cli.js release retry --help"]
          }
        );
      }
      const delayMs = shaped.retryAfterMs ?? [250, 500, 1_000][attempt - 1] ?? 1_000;
      await appendAuditEvent(runtime.workspace, input.auditPath, "retry", {
        planDigest: plan.planDigest,
        attempt,
        nextAttempt: attempt + 1,
        reason: shaped.code ?? (shaped.status === undefined ? "network_error" : `http_${shaped.status}`),
        delayMs,
        idempotencyDigest: state.idempotencyDigest
      }, now());
      await sleep(delayMs);
    }
  }
  throw new AppError("Safe retry budget is exhausted.", {
    step: "Submit release transaction",
    causes: [`Maximum ${MAX_SAFE_RETRIES} retries reached.`]
  });
}

function terminal(status: string): boolean {
  return TERMINAL_STATUSES.has(status.toLowerCase());
}

function isSepoliaExplorerTransaction(value: string | null | undefined, transactionHash: string): boolean {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    const path = url.pathname.replace(/\/$/, "").toLowerCase();
    return url.protocol === "https:"
      && url.hostname.toLowerCase() === "sepolia.etherscan.io"
      && path === `/tx/${transactionHash.toLowerCase()}`;
  } catch {
    return false;
  }
}

function hasVerifiedReceipt(status: ExecutionStatusResult): boolean {
  const transactionHash = status.transactionHash;
  return status.status.toLowerCase() === "completed"
    && status.result?.success === true
    && typeof transactionHash === "string"
    && TRANSACTION_HASH_PATTERN.test(transactionHash)
    && isSepoliaExplorerTransaction(status.explorerUrl, transactionHash);
}

function outcomeForStatus(status: ExecutionStatusResult): ExecuteReleaseResult["outcome"] {
  const lowered = status.status.toLowerCase();
  if (lowered === "completed") return hasVerifiedReceipt(status) ? "completed" : "ambiguous";
  if (lowered === "failed" || lowered.startsWith("cancel")) return "failed";
  return "submitted";
}

async function recordStatus(
  status: ExecutionStatusResult,
  state: ReleaseExecutionState,
  statePath: string,
  auditPath: string,
  runtime: ReleaseRuntime
): Promise<ReleaseExecutionState> {
  const now = clock(runtime)();
  const lowered = status.status.toLowerCase();
  const phase = lowered === "completed"
    ? (hasVerifiedReceipt(status) ? "completed" : "ambiguous")
    : (lowered === "failed" || lowered.startsWith("cancel")) ? "failed" : "submitted";
  const updated = updateState(state, {
    phase,
    keeperHubStatus: status.status,
    transactionHash: status.transactionHash ?? null,
    explorerUrl: status.explorerUrl ?? null
  }, now);
  await persistState(runtime, statePath, updated);
  await appendAuditEvent(runtime.workspace, auditPath, "status", {
    executionId: status.executionId,
    status: status.status,
    transactionHash: status.transactionHash ?? null,
    explorerUrl: status.explorerUrl ?? null
  }, now);
  if (lowered === "completed" && hasVerifiedReceipt(status)) {
    await appendAuditEvent(runtime.workspace, auditPath, "receipt", {
      executionId: status.executionId,
      transactionHash: status.transactionHash ?? null,
      explorerUrl: status.explorerUrl ?? null,
      result: status.result ?? null
    }, now);
  } else if (lowered === "completed") {
    await appendAuditEvent(runtime.workspace, auditPath, "receipt_ambiguous", {
      executionId: status.executionId,
      keeperHubCompleted: true,
      resultSuccess: status.result?.success === true,
      hasValidTransactionHash: typeof status.transactionHash === "string" && TRANSACTION_HASH_PATTERN.test(status.transactionHash),
      hasSepoliaExplorerUrl: typeof status.transactionHash === "string"
        && isSepoliaExplorerTransaction(status.explorerUrl, status.transactionHash),
      action: "Do not rebroadcast; inspect this execution and its chain receipt."
    }, now);
  }
  return updated;
}

async function pollStatus(
  state: ReleaseExecutionState,
  input: { statePath: string; auditPath: string; maxStatusPolls?: number },
  runtime: ReleaseRuntime
): Promise<{ state: ReleaseExecutionState; status: ExecutionStatusResult }> {
  if (state.executionId === null) {
    throw new UsageError("No KeeperHub executionId is available yet.", {
      step: "Poll release execution",
      causes: ["Submission did not return an execution identifier."],
      fixCommands: ["node dist/cli.js release retry --help"]
    });
  }
  const sleep = sleeper(runtime);
  const maxPolls = input.maxStatusPolls ?? 120;
  let current = state;
  for (let poll = 0; poll < maxPolls; poll += 1) {
    const status = await runtime.client.getExecutionStatus(state.executionId);
    if (status.executionId !== state.executionId) {
      throw new AppError("KeeperHub returned status for a different execution.", {
        step: "Validate execution status",
        causes: ["executionId mismatch."]
      });
    }
    current = await recordStatus(status, current, input.statePath, input.auditPath, runtime);
    if (terminal(status.status)) return { state: current, status };
    if (poll + 1 < maxPolls) {
      const hint = status.pollIntervalHintMs;
      const delay = typeof hint === "number" && Number.isFinite(hint) && hint >= 0 ? hint : 1_000;
      await sleep(delay);
    }
  }
  throw new AppError("Execution status polling limit reached.", {
    step: "Poll release execution",
    causes: [`No terminal status after ${maxPolls} polls.`],
    fixCommands: ["node dist/cli.js release status --poll --help"]
  });
}

export async function executeRelease(input: ExecuteReleaseInput, runtime: ReleaseRuntime): Promise<ExecuteReleaseResult> {
  assertSepoliaEoa(SEPOLIA_CHAIN_ID, input.walletType);
  const now = clock(runtime);
  assertExecutionWindow(now());
  const plan = await readPlanFile(runtime.workspace, input.planPath);
  validatePlan(plan, now());
  if (plan.intent.walletType !== input.walletType) {
    throw new UsageError("Wallet type does not match the prepared plan.", {
      step: "Validate wallet type",
      causes: ["Prepare and execute must both explicitly use eoa."]
    });
  }
  await verifyFileCondition(runtime.workspace, plan.intent.condition);
  await assertStateFileAbsent(runtime.workspace, input.statePath);
  const summary = [
    "KeeperHub release confirmation",
    `  Network: Ethereum Sepolia (${plan.intent.chainId})`,
    `  From: ${plan.intent.walletAddress}`,
    `  To: ${plan.intent.recipientAddress}`,
    `  Amount: ${plan.intent.amount} ETH`,
    `  Condition: ${plan.intent.condition.path} sha256:${plan.intent.condition.sha256}`,
    `  Simulation gas estimate: ${plan.simulation.gasEstimate}`,
    `  Simulation would revert: ${plan.simulation.wouldRevert}`,
    `  Plan digest: ${plan.planDigest}`,
    `  Expires: ${plan.expiresAt}`
  ].join("\n");
  const confirmed = await requestConfirmation(runtime.confirmIO ?? nodeConfirmIO(), plan.intentDigest, summary);
  if (!confirmed) {
    await appendAuditEvent(runtime.workspace, input.auditPath, "confirmation_cancelled", {
      planDigest: plan.planDigest,
      intentDigest: plan.intentDigest
    }, now());
    return { outcome: "cancelled", state: null, status: null };
  }
  await revalidateBeforePost(plan, input.planPath, runtime, false);
  const idempotencyKey = (runtime.randomUUID ?? nodeRandomUUID)();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    throw new AppError("UUID generation returned an invalid idempotency key.", {
      step: "Create idempotent release request",
      causes: ["The generated value is not a UUID."]
    });
  }
  const createdAt = now().toISOString();
  let state = signState({
    schemaVersion: 1,
    planDigest: plan.planDigest,
    intentDigest: plan.intentDigest,
    intent: plan.intent,
    idempotencyKey,
    idempotencyDigest: sha256(idempotencyKey),
    attemptCount: 0,
    maxAttempts: MAX_ATTEMPTS,
    phase: "submitting",
    executionId: null,
    keeperHubStatus: null,
    transactionHash: null,
    explorerUrl: null,
    createdAt,
    updatedAt: createdAt,
    lastError: null
  });
  await createStateFile(runtime.workspace, input.statePath, state);
  await appendAuditEvent(runtime.workspace, input.auditPath, "confirmation", {
    planDigest: plan.planDigest,
    intentDigest: plan.intentDigest,
    phraseSuffix: plan.intentDigest.slice(0, 8)
  }, now());
  state = await submitWithSafeRetries(plan, state, { ...input, allowExpiredPlan: false }, runtime);
  const polled = await pollStatus(state, input, runtime);
  const outcome = outcomeForStatus(polled.status);
  return { outcome, state: polled.state, status: polled.status };
}

export async function retryRelease(input: RetryReleaseInput, runtime: ReleaseRuntime): Promise<ExecuteReleaseResult> {
  const now = clock(runtime);
  const plan = await readPlanFile(runtime.workspace, input.planPath);
  // A persisted idempotency key may represent an ambiguous POST. Expiry must
  // never force creation of a fresh key, so retry verifies integrity and the
  // live condition while allowing the original ten-minute plan to be old.
  validatePlan(plan, now(), true);
  await verifyFileCondition(runtime.workspace, plan.intent.condition);
  let state = await readStateFile(runtime.workspace, input.statePath);
  if (
    state.planDigest !== plan.planDigest
    || state.intentDigest !== plan.intentDigest
    || canonicalJson(state.intent) !== canonicalJson(plan.intent)
  ) {
    throw new UsageError("Private state does not belong to this release plan.", {
      step: "Validate safe retry",
      causes: ["Plan or intent digest mismatch."]
    });
  }
  if (state.executionId === null) {
    assertExecutionWindow(now());
    if (state.attemptCount >= state.maxAttempts || state.phase === "blocked") {
      throw new UsageError("This execution cannot be retried safely.", {
        step: "Validate safe retry",
        causes: [state.phase === "blocked" ? "Idempotency conflict requires investigation." : "Retry budget is exhausted."],
        fixCommands: ["node dist/cli.js release status --help"]
      });
    }
    const retrySummary = [
      "KeeperHub safe retry confirmation",
      `  Network: Ethereum Sepolia (${plan.intent.chainId})`,
      `  From: ${plan.intent.walletAddress}`,
      `  To: ${plan.intent.recipientAddress}`,
      `  Amount: ${plan.intent.amount} ETH`,
      `  Simulation gas estimate: ${plan.simulation.gasEstimate}`,
      `  Intent digest: ${plan.intentDigest}`,
      `  Existing idempotency digest: ${state.idempotencyDigest}`,
      `  Attempts used: ${state.attemptCount}/${state.maxAttempts}`
    ].join("\n");
    const confirmed = await requestRetryConfirmation(
      runtime.confirmIO ?? nodeConfirmIO(),
      plan.intentDigest,
      retrySummary
    );
    if (!confirmed) {
      await appendAuditEvent(runtime.workspace, input.auditPath, "retry_confirmation_cancelled", {
        planDigest: plan.planDigest,
        intentDigest: plan.intentDigest,
        idempotencyDigest: state.idempotencyDigest
      }, now());
      return { outcome: "cancelled", state, status: null };
    }
    await revalidateBeforePost(plan, input.planPath, runtime, true);
    await appendAuditEvent(runtime.workspace, input.auditPath, "retry_confirmation", {
      planDigest: plan.planDigest,
      intentDigest: plan.intentDigest,
      idempotencyDigest: state.idempotencyDigest,
      nextAttempt: state.attemptCount + 1
    }, now());
    state = await submitWithSafeRetries(plan, state, { ...input, allowExpiredPlan: true }, runtime);
  }
  const polled = await pollStatus(state, input, runtime);
  return {
    outcome: outcomeForStatus(polled.status),
    state: polled.state,
    status: polled.status
  };
}

export async function statusRelease(input: StatusReleaseInput, runtime: ReleaseRuntime): Promise<ExecuteReleaseResult> {
  const state = await readStateFile(runtime.workspace, input.statePath);
  if (state.executionId === null) {
    throw new UsageError("No executionId exists in the private state.", {
      step: "Read release status",
      causes: ["The request has not been accepted by KeeperHub."],
      fixCommands: ["node dist/cli.js release retry --help"]
    });
  }
  if (input.poll) {
    const polled = await pollStatus(state, input, runtime);
    return {
      outcome: outcomeForStatus(polled.status),
      state: polled.state,
      status: polled.status
    };
  }
  const status = await runtime.client.getExecutionStatus(state.executionId);
  if (status.executionId !== state.executionId) {
    throw new AppError("KeeperHub returned status for a different execution.", {
      step: "Validate execution status",
      causes: ["executionId mismatch."]
    });
  }
  const updated = await recordStatus(status, state, input.statePath, input.auditPath, runtime);
  return {
    outcome: outcomeForStatus(status),
    state: updated,
    status
  };
}
