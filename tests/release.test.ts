import { mkdir, readFile, readdir, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createReleaseCommand } from "../src/commands/release.js";
import { UsageError } from "../src/core/errors.js";
import { canonicalJson, sha256 } from "../src/core/json.js";
import { confirmationPhrase, retryConfirmationPhrase } from "../src/release/confirm.js";
import { appendAuditEvent } from "../src/release/audit.js";
import { readPlanFile, readStateFile, signState, writePlanFile, writeStateFile } from "../src/release/files.js";
import { executeRelease, prepareRelease, retryRelease } from "../src/release/service.js";
import { resolveWorkspacePath } from "../src/release/validation.js";
import type {
  ExecutionStatusResult,
  ReleaseKeeperHubClient,
  ReleaseRuntime,
  TransferRequest,
  TransferSimulationRequest
} from "../src/release/types.js";

const WALLET = "0x1111111111111111111111111111111111111111";
const RECIPIENT = "0x2222222222222222222222222222222222222222";
const UUID = "d90f2cb8-5f75-4c3d-a1bc-eaff8967ce4f";
const AFTER_OPEN = new Date("2026-07-28T00:00:00.000Z");

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function fakeClient(overrides: Partial<ReleaseKeeperHubClient> = {}): ReleaseKeeperHubClient {
  return {
    async getChain(chainId) {
      return { chainId, enabled: true, isTestnet: true, name: "Ethereum Sepolia" };
    },
    async getWallet() {
      return { walletAddress: WALLET };
    },
    async simulateTransfer(request: TransferSimulationRequest) {
      return {
        success: true,
        from: WALLET,
        to: request.recipientAddress,
        value: "1000000000000",
        gasEstimate: "21000",
        wouldRevert: false
      };
    },
    async executeTransfer(_request: TransferRequest, _options: { idempotencyKey: string }) {
      return { executionId: "exec-1", status: "queued" };
    },
    async getExecutionStatus(executionId): Promise<ExecutionStatusResult> {
      return {
        executionId,
        status: "completed",
        transactionHash: `0x${"3".repeat(64)}`,
        explorerUrl: `https://sepolia.etherscan.io/tx/0x${"3".repeat(64)}`,
        result: { success: true }
      };
    },
    ...overrides
  };
}

async function writeRetryState(paths: Awaited<ReturnType<typeof prepared>>): Promise<void> {
  const plan = await readPlanFile(paths.workspace, paths.planPath);
  const timestamp = AFTER_OPEN.toISOString();
  await writeStateFile(paths.workspace, paths.statePath, signState({
    schemaVersion: 1,
    planDigest: plan.planDigest,
    intentDigest: plan.intentDigest,
    intent: plan.intent,
    idempotencyKey: UUID,
    idempotencyDigest: digest(UUID),
    attemptCount: 1,
    maxAttempts: 4,
    phase: "failed",
    executionId: null,
    keeperHubStatus: null,
    transactionHash: null,
    explorerUrl: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastError: "network connection ended before a response"
  }));
}

async function prepared(client: ReleaseKeeperHubClient = fakeClient()): Promise<{
  workspace: string;
  runtime: ReleaseRuntime;
  planPath: string;
  statePath: string;
  auditPath: string;
}> {
  const workspace = await mkdtemp(join(tmpdir(), "keeperhub-release-"));
  await mkdir(join(workspace, "deliverables"));
  const contents = "approved bounty deliverable\n";
  await writeFile(join(workspace, "deliverables/result.txt"), contents);
  const runtime: ReleaseRuntime = {
    client,
    workspace,
    now: () => AFTER_OPEN,
    randomUUID: () => UUID,
    sleep: async () => undefined
  };
  const planPath = ".keeperhub/plan.json";
  const statePath = ".keeperhub/state.json";
  const auditPath = "audit/release.jsonl";
  await prepareRelease({
    conditionFile: "deliverables/result.txt",
    expectedSha256: digest(contents),
    recipientAddress: RECIPIENT,
    amount: "0.000001",
    chainId: 11_155_111,
    walletType: "eoa",
    planPath,
    auditPath
  }, runtime);
  return { workspace, runtime, planPath, statePath, auditPath };
}

function executeInput(paths: Awaited<ReturnType<typeof prepared>>) {
  return {
    planPath: paths.planPath,
    statePath: paths.statePath,
    auditPath: paths.auditPath,
    walletType: "eoa"
  };
}

describe("conditional release", () => {
  it("keeps condition paths inside the workspace and prepares a ten-minute plan", async () => {
    const paths = await prepared();
    const plan = JSON.parse(await readFile(join(paths.workspace, paths.planPath), "utf8")) as {
      createdAt: string; expiresAt: string; intent: { condition: { path: string } };
    };
    expect(plan.intent.condition.path).toBe("deliverables/result.txt");
    expect(Date.parse(plan.expiresAt) - Date.parse(plan.createdAt)).toBe(600_000);

    const outside = join(paths.workspace, "../outside-condition.txt");
    await writeFile(outside, "outside");
    await expect(prepareRelease({
      conditionFile: outside,
      expectedSha256: digest("outside"),
      recipientAddress: RECIPIENT,
      amount: "0.000001",
      chainId: 11_155_111,
      walletType: "eoa",
      planPath: "other-plan.json",
      auditPath: "other-audit.jsonl"
    }, paths.runtime)).rejects.toBeInstanceOf(UsageError);
  });

  it("rejects non-TTY execution before creating state or broadcasting", async () => {
    const submit = vi.fn(async () => ({ executionId: "never", status: "queued" }));
    const paths = await prepared(fakeClient({ executeTransfer: submit }));
    paths.runtime.confirmIO = {
      isInputTTY: false,
      isOutputTTY: true,
      question: async () => ""
    };
    await expect(executeRelease(executeInput(paths), paths.runtime)).rejects.toBeInstanceOf(UsageError);
    expect(submit).not.toHaveBeenCalled();
    await expect(readFile(join(paths.workspace, paths.statePath))).rejects.toThrow();
  });

  it("cancels on a wrong phrase with zero chain-side effects", async () => {
    const submit = vi.fn(async () => ({ executionId: "never", status: "queued" }));
    const paths = await prepared(fakeClient({ executeTransfer: submit }));
    paths.runtime.confirmIO = {
      isInputTTY: true,
      isOutputTTY: true,
      question: async () => "no"
    };
    const result = await executeRelease(executeInput(paths), paths.runtime);
    expect(result.outcome).toBe("cancelled");
    expect(submit).not.toHaveBeenCalled();
    await expect(readFile(join(paths.workspace, paths.statePath))).rejects.toThrow();
  });

  it("rechecks expiry and the file condition after TTY confirmation", async () => {
    const conditionSubmit = vi.fn(async () => ({ executionId: "never", status: "queued" }));
    const conditionPaths = await prepared(fakeClient({ executeTransfer: conditionSubmit }));
    const conditionPlan = await readPlanFile(conditionPaths.workspace, conditionPaths.planPath);
    conditionPaths.runtime.confirmIO = {
      isInputTTY: true,
      isOutputTTY: true,
      question: async () => {
        await writeFile(join(conditionPaths.workspace, "deliverables/result.txt"), "changed after prompt\n");
        return confirmationPhrase(conditionPlan.intentDigest);
      }
    };
    await expect(executeRelease(executeInput(conditionPaths), conditionPaths.runtime)).rejects.toThrow(/condition/i);
    expect(conditionSubmit).not.toHaveBeenCalled();

    const expirySubmit = vi.fn(async () => ({ executionId: "never", status: "queued" }));
    const expiryPaths = await prepared(fakeClient({ executeTransfer: expirySubmit }));
    const expiryPlan = await readPlanFile(expiryPaths.workspace, expiryPaths.planPath);
    let currentTime = AFTER_OPEN;
    expiryPaths.runtime.now = () => currentTime;
    expiryPaths.runtime.confirmIO = {
      isInputTTY: true,
      isOutputTTY: true,
      question: async () => {
        currentTime = new Date(AFTER_OPEN.getTime() + 11 * 60 * 1_000);
        return confirmationPhrase(expiryPlan.intentDigest);
      }
    };
    await expect(executeRelease(executeInput(expiryPaths), expiryPaths.runtime)).rejects.toThrow(/expired/i);
    expect(expirySubmit).not.toHaveBeenCalled();
  });

  it("stops when the live KeeperHub sender changes after confirmation", async () => {
    const submit = vi.fn(async () => ({ executionId: "never", status: "queued" }));
    let walletReads = 0;
    const client = fakeClient({
      async getWallet() {
        walletReads += 1;
        return { walletAddress: walletReads === 1 ? WALLET : "0x3333333333333333333333333333333333333333" };
      },
      executeTransfer: submit
    });
    const paths = await prepared(client);
    const plan = await readPlanFile(paths.workspace, paths.planPath);
    paths.runtime.confirmIO = {
      isInputTTY: true,
      isOutputTTY: true,
      question: async () => confirmationPhrase(plan.intentDigest)
    };
    await expect(executeRelease(executeInput(paths), paths.runtime)).rejects.toThrow(/wallet changed/i);
    expect(submit).not.toHaveBeenCalled();
  });

  it("rejects plan tampering before confirmation or broadcast", async () => {
    const submit = vi.fn(async () => ({ executionId: "never", status: "queued" }));
    const paths = await prepared(fakeClient({ executeTransfer: submit }));
    const path = join(paths.workspace, paths.planPath);
    const plan = JSON.parse(await readFile(path, "utf8")) as { intent: { recipientAddress: string } };
    plan.intent.recipientAddress = WALLET;
    await writeFile(path, JSON.stringify(plan));
    paths.runtime.confirmIO = {
      isInputTTY: true,
      isOutputTTY: true,
      question: async () => "should-not-be-read"
    };
    await expect(executeRelease(executeInput(paths), paths.runtime)).rejects.toBeInstanceOf(UsageError);
    expect(submit).not.toHaveBeenCalled();
  });

  it("persists a 0600 UUID state first and reuses one key for three safe retries", async () => {
    const keys: string[] = [];
    let attempt = 0;
    const submit = vi.fn(async (_request: TransferRequest, options: { idempotencyKey: string }) => {
      keys.push(options.idempotencyKey);
      attempt += 1;
      if (attempt <= 3) {
        const error = new Error("temporary upstream failure") as Error & { status: number };
        error.status = 503;
        throw error;
      }
      return { executionId: "exec-safe", status: "queued" };
    });
    let statusCalls = 0;
    const status = vi.fn(async (executionId: string): Promise<ExecutionStatusResult> => {
      statusCalls += 1;
      return statusCalls === 1
        ? { executionId, status: "pending", pollIntervalHintMs: 125 }
        : {
          executionId,
          status: "completed",
          transactionHash: `0x${"4".repeat(64)}`,
          explorerUrl: `https://sepolia.etherscan.io/tx/0x${"4".repeat(64)}`,
          result: { success: true }
        };
    });
    const sleep = vi.fn(async (_milliseconds: number) => undefined);
    const paths = await prepared(fakeClient({ executeTransfer: submit, getExecutionStatus: status }));
    paths.runtime.sleep = sleep;
    const plan = JSON.parse(await readFile(join(paths.workspace, paths.planPath), "utf8")) as { intentDigest: string };
    paths.runtime.confirmIO = {
      isInputTTY: true,
      isOutputTTY: true,
      question: async () => confirmationPhrase(plan.intentDigest)
    };

    const result = await executeRelease(executeInput(paths), paths.runtime);
    expect(result.outcome).toBe("completed");
    expect(keys).toEqual([UUID, UUID, UUID, UUID]);
    expect(sleep.mock.calls.map(([milliseconds]) => milliseconds)).toEqual([250, 500, 1_000, 125]);
    expect((await stat(join(paths.workspace, paths.statePath))).mode & 0o777).toBe(0o600);

    const audit = await readFile(join(paths.workspace, paths.auditPath), "utf8");
    expect(audit).not.toContain(UUID);
    expect(audit).toContain(digest(UUID));
    expect(audit).toContain("\"retry\"");
    expect(audit).toContain("\"receipt\"");
  });

  it("caps KeeperHub Retry-After delays at thirty seconds", async () => {
    let attempt = 0;
    const submit = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) {
        const error = new Error("rate limited") as Error & { status: number; retryAfterMs: number };
        error.status = 429;
        error.retryAfterMs = 999_999;
        throw error;
      }
      return { executionId: "exec-capped", status: "queued" };
    });
    const sleep = vi.fn(async (_milliseconds: number) => undefined);
    const paths = await prepared(fakeClient({ executeTransfer: submit }));
    const plan = await readPlanFile(paths.workspace, paths.planPath);
    paths.runtime.sleep = sleep;
    paths.runtime.confirmIO = {
      isInputTTY: true,
      isOutputTTY: true,
      question: async () => confirmationPhrase(plan.intentDigest)
    };
    await executeRelease(executeInput(paths), paths.runtime);
    expect(sleep.mock.calls[0]?.[0]).toBe(30_000);
  });

  it("retries idempotency_in_progress with the same persisted key", async () => {
    const keys: string[] = [];
    let attempt = 0;
    const submit = vi.fn(async (_request: TransferRequest, options: { idempotencyKey: string }) => {
      keys.push(options.idempotencyKey);
      attempt += 1;
      if (attempt === 1) {
        const error = new Error("idempotency_in_progress") as Error & {
          status: number;
          code: string;
          retryAfterMs: number;
        };
        error.status = 409;
        error.code = "idempotency_in_progress";
        error.retryAfterMs = 0;
        throw error;
      }
      return { executionId: "exec-in-progress", status: "queued" };
    });
    const paths = await prepared(fakeClient({ executeTransfer: submit }));
    const plan = await readPlanFile(paths.workspace, paths.planPath);
    paths.runtime.confirmIO = {
      isInputTTY: true,
      isOutputTTY: true,
      question: async () => confirmationPhrase(plan.intentDigest)
    };

    await expect(executeRelease(executeInput(paths), paths.runtime)).resolves.toMatchObject({ outcome: "completed" });
    expect(submit).toHaveBeenCalledTimes(2);
    expect(keys).toEqual([UUID, UUID]);
  });

  it("does not retry an idempotency conflict", async () => {
    const submit = vi.fn(async () => {
      const error = new Error("idempotency conflict") as Error & { status: number };
      error.status = 409;
      throw error;
    });
    const paths = await prepared(fakeClient({ executeTransfer: submit }));
    const plan = JSON.parse(await readFile(join(paths.workspace, paths.planPath), "utf8")) as { intentDigest: string };
    paths.runtime.confirmIO = {
      isInputTTY: true,
      isOutputTTY: true,
      question: async () => confirmationPhrase(plan.intentDigest)
    };
    await expect(executeRelease(executeInput(paths), paths.runtime)).rejects.toThrow(/conflict/i);
    expect(submit).toHaveBeenCalledTimes(1);
    const state = JSON.parse(await readFile(join(paths.workspace, paths.statePath), "utf8")) as { phase: string };
    expect(state.phase).toBe("blocked");
  });

  it("hard-blocks any pre-event broadcast even with an affirmative TTY", async () => {
    const submit = vi.fn(async () => ({ executionId: "never", status: "queued" }));
    const paths = await prepared(fakeClient({ executeTransfer: submit }));
    paths.runtime.now = () => new Date("2026-07-20T00:00:00.000Z");
    paths.runtime.confirmIO = {
      isInputTTY: true,
      isOutputTTY: true,
      question: async () => "CONFIRM anything"
    };
    await expect(executeRelease(executeInput(paths), paths.runtime)).rejects.toThrow(/pre-event/i);
    expect(submit).not.toHaveBeenCalled();
  });

  it("requires an exact real-TTY retry confirmation and allows an expired plan", async () => {
    const submit = vi.fn(async (_request: TransferRequest, _options: { idempotencyKey: string }) => ({
      executionId: "exec-retry",
      status: "queued"
    }));
    const paths = await prepared(fakeClient({ executeTransfer: submit }));
    await writeRetryState(paths);
    paths.runtime.now = () => new Date(AFTER_OPEN.getTime() + 60 * 60 * 1_000);
    const plan = await readPlanFile(paths.workspace, paths.planPath);
    paths.runtime.confirmIO = {
      isInputTTY: true,
      isOutputTTY: true,
      question: async (prompt) => {
        expect(prompt).toContain("Existing idempotency digest");
        expect(prompt).not.toContain(UUID);
        return retryConfirmationPhrase(plan.intentDigest);
      }
    };

    const result = await retryRelease({
      planPath: paths.planPath,
      statePath: paths.statePath,
      auditPath: paths.auditPath
    }, paths.runtime);
    expect(result.outcome).toBe("completed");
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0]?.[1]).toEqual({ idempotencyKey: UUID });
  });

  it("rechecks the file condition after cross-process retry confirmation", async () => {
    const submit = vi.fn(async () => ({ executionId: "never", status: "queued" }));
    const paths = await prepared(fakeClient({ executeTransfer: submit }));
    await writeRetryState(paths);
    const plan = await readPlanFile(paths.workspace, paths.planPath);
    paths.runtime.confirmIO = {
      isInputTTY: true,
      isOutputTTY: true,
      question: async () => {
        await writeFile(join(paths.workspace, "deliverables/result.txt"), "changed before retry POST\n");
        return retryConfirmationPhrase(plan.intentDigest);
      }
    };
    await expect(retryRelease({
      planPath: paths.planPath,
      statePath: paths.statePath,
      auditPath: paths.auditPath
    }, paths.runtime)).rejects.toThrow(/condition/i);
    expect(submit).not.toHaveBeenCalled();
  });

  it("rejects tampered retry limits, idempotency digests, and state intents", async () => {
    const maxPaths = await prepared();
    await writeRetryState(maxPaths);
    const maxStatePath = join(maxPaths.workspace, maxPaths.statePath);
    const maxState = JSON.parse(await readFile(maxStatePath, "utf8")) as Record<string, unknown>;
    maxState.maxAttempts = 99;
    const { stateDigest: _maxDigest, ...maxUnsigned } = maxState;
    maxState.stateDigest = sha256(canonicalJson(maxUnsigned));
    await writeFile(maxStatePath, JSON.stringify(maxState));
    await expect(readStateFile(maxPaths.workspace, maxPaths.statePath)).rejects.toThrow(/schema/i);

    const keyPaths = await prepared();
    await writeRetryState(keyPaths);
    const keyStatePath = join(keyPaths.workspace, keyPaths.statePath);
    const keyState = JSON.parse(await readFile(keyStatePath, "utf8")) as Record<string, unknown>;
    keyState.idempotencyDigest = "0".repeat(64);
    const { stateDigest: _keyDigest, ...keyUnsigned } = keyState;
    keyState.stateDigest = sha256(canonicalJson(keyUnsigned));
    await writeFile(keyStatePath, JSON.stringify(keyState));
    await expect(readStateFile(keyPaths.workspace, keyPaths.statePath)).rejects.toThrow(/idempotency digest/i);

    const intentPaths = await prepared();
    await writeRetryState(intentPaths);
    const intentStatePath = join(intentPaths.workspace, intentPaths.statePath);
    const intentState = JSON.parse(await readFile(intentStatePath, "utf8")) as Record<string, unknown>;
    const alteredIntent = { ...(intentState.intent as Record<string, unknown>), recipientAddress: WALLET };
    intentState.intent = alteredIntent;
    intentState.intentDigest = sha256(canonicalJson(alteredIntent));
    const { stateDigest: _intentDigest, ...intentUnsigned } = intentState;
    intentState.stateDigest = sha256(canonicalJson(intentUnsigned));
    await writeFile(intentStatePath, JSON.stringify(intentState));
    await expect(retryRelease({
      planPath: intentPaths.planPath,
      statePath: intentPaths.statePath,
      auditPath: intentPaths.auditPath
    }, intentPaths.runtime)).rejects.toThrow(/does not belong/i);
  });

  it("rejects symlinked output components and terminal-control paths", async () => {
    const paths = await prepared();
    await writeRetryState(paths);
    const plan = await readPlanFile(paths.workspace, paths.planPath);
    const state = await readStateFile(paths.workspace, paths.statePath);
    const outside = await mkdtemp(join(tmpdir(), "keeperhub-outside-"));
    await symlink(outside, join(paths.workspace, "linked-output"), "dir");

    await expect(writePlanFile(paths.workspace, "linked-output/plan.json", plan)).rejects.toThrow(/symbolic link/i);
    await expect(writeStateFile(paths.workspace, "linked-output/state.json", state)).rejects.toThrow(/symbolic link/i);
    await expect(appendAuditEvent(
      paths.workspace,
      "linked-output/audit.jsonl",
      "test",
      { ok: true },
      AFTER_OPEN
    )).rejects.toThrow(/symbolic link/i);
    expect(await readdir(outside)).toEqual([]);
    await expect(resolveWorkspacePath(paths.workspace, "audit/bad\u001b[2J.jsonl")).rejects.toThrow(/control/i);
  });

  it("performs zero POSTs when retry confirmation is cancelled or non-TTY", async () => {
    const submit = vi.fn(async () => ({ executionId: "never", status: "queued" }));
    const cancelled = await prepared(fakeClient({ executeTransfer: submit }));
    await writeRetryState(cancelled);
    cancelled.runtime.confirmIO = {
      isInputTTY: true,
      isOutputTTY: true,
      question: async () => "wrong phrase"
    };
    await expect(retryRelease({
      planPath: cancelled.planPath,
      statePath: cancelled.statePath,
      auditPath: cancelled.auditPath
    }, cancelled.runtime)).resolves.toMatchObject({ outcome: "cancelled" });
    expect(submit).not.toHaveBeenCalled();

    const nonTty = await prepared(fakeClient({ executeTransfer: submit }));
    await writeRetryState(nonTty);
    nonTty.runtime.confirmIO = {
      isInputTTY: false,
      isOutputTTY: true,
      question: async () => ""
    };
    await expect(retryRelease({
      planPath: nonTty.planPath,
      statePath: nonTty.statePath,
      auditPath: nonTty.auditPath
    }, nonTty.runtime)).rejects.toBeInstanceOf(UsageError);
    expect(submit).not.toHaveBeenCalled();
  });

  it("hard-blocks a pre-event cross-process retry before confirmation or POST", async () => {
    const submit = vi.fn(async () => ({ executionId: "never", status: "queued" }));
    const paths = await prepared(fakeClient({ executeTransfer: submit }));
    await writeRetryState(paths);
    const question = vi.fn(async () => "CONFIRM RETRY anything");
    paths.runtime.now = () => new Date("2026-07-20T00:00:00.000Z");
    paths.runtime.confirmIO = { isInputTTY: true, isOutputTTY: true, question };
    await expect(retryRelease({
      planPath: paths.planPath,
      statePath: paths.statePath,
      auditPath: paths.auditPath
    }, paths.runtime)).rejects.toThrow(/pre-event/i);
    expect(question).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it("marks incomplete completed evidence ambiguous and never rebroadcasts it", async () => {
    const submit = vi.fn(async () => ({ executionId: "exec-ambiguous", status: "queued" }));
    const status = vi.fn(async (executionId: string): Promise<ExecutionStatusResult> => ({
      executionId,
      status: "completed",
      transactionHash: `0x${"5".repeat(64)}`,
      explorerUrl: `https://etherscan.io/tx/0x${"5".repeat(64)}`,
      result: { success: true }
    }));
    const paths = await prepared(fakeClient({ executeTransfer: submit, getExecutionStatus: status }));
    const plan = await readPlanFile(paths.workspace, paths.planPath);
    paths.runtime.confirmIO = {
      isInputTTY: true,
      isOutputTTY: true,
      question: async () => confirmationPhrase(plan.intentDigest)
    };
    const result = await executeRelease(executeInput(paths), paths.runtime);
    expect(result.outcome).toBe("ambiguous");
    expect(result.state?.phase).toBe("ambiguous");
    expect(submit).toHaveBeenCalledTimes(1);

    const retried = await retryRelease({
      planPath: paths.planPath,
      statePath: paths.statePath,
      auditPath: paths.auditPath
    }, paths.runtime);
    expect(retried.outcome).toBe("ambiguous");
    expect(submit).toHaveBeenCalledTimes(1);
    const audit = await readFile(join(paths.workspace, paths.auditPath), "utf8");
    expect(audit).toContain("receipt_ambiguous");
  });

  it("sets exit code 1 when the release CLI observes an ambiguous receipt", async () => {
    const status = vi.fn(async (executionId: string): Promise<ExecutionStatusResult> => ({
      executionId,
      status: "completed",
      transactionHash: `0x${"6".repeat(64)}`,
      explorerUrl: `https://example.com/tx/0x${"6".repeat(64)}`,
      result: { success: true }
    }));
    const paths = await prepared(fakeClient({ getExecutionStatus: status }));
    const plan = await readPlanFile(paths.workspace, paths.planPath);
    paths.runtime.confirmIO = {
      isInputTTY: true,
      isOutputTTY: true,
      question: async () => confirmationPhrase(plan.intentDigest)
    };
    await executeRelease(executeInput(paths), paths.runtime);

    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      const output = vi.fn();
      const command = createReleaseCommand({ client: paths.runtime.client, workspace: paths.workspace, output });
      await command.parseAsync([
        "node",
        "release",
        "status",
        "--state",
        paths.statePath,
        "--audit",
        paths.auditPath
      ]);
      expect(process.exitCode).toBe(1);
      expect(output).toHaveBeenCalled();
    } finally {
      process.exitCode = previousExitCode;
    }
  });
});
