import { link, mkdir, readFile, readdir, rename, stat, symlink, unlink, writeFile } from "node:fs/promises";
import { renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createReleaseClientAdapter, createReleaseCommand } from "../src/commands/release.js";
import { UsageError } from "../src/core/errors.js";
import { canonicalJson, sha256 } from "../src/core/json.js";
import { confirmationPhrase, retryConfirmationPhrase } from "../src/release/confirm.js";
import { appendAuditEvent, reserveAuditDestination, verifyAuditFile } from "../src/release/audit.js";
import { readPlanFile, readStateFile, signState, writePlanFile, writeStateFile } from "../src/release/files.js";
import { executeRelease, prepareRelease, retryRelease } from "../src/release/service.js";
import { resolveWorkspacePath } from "../src/release/validation.js";
import type { KeeperHubClient } from "../src/keeperhub/client.js";
import { simulationSchema } from "../src/keeperhub/schemas.js";
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

function deferred(): { promise: Promise<void>; resolve(): void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
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
        status: "simulated",
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
  it("rejects a non-EOA wallet at the preparation boundary before KeeperHub side effects", async () => {
    const getChain = vi.fn(async (chainId: number) => ({
      chainId,
      enabled: true,
      isTestnet: true,
      name: "Ethereum Sepolia"
    }));
    const getWallet = vi.fn(async () => ({ walletAddress: WALLET }));
    const simulateTransfer = vi.fn(async (request: TransferSimulationRequest) => ({
      success: true,
      status: "simulated" as const,
      from: WALLET,
      to: request.recipientAddress,
      value: "1000000000000",
      gasEstimate: "21000",
      wouldRevert: false
    }));
    const runtime: ReleaseRuntime = {
      client: fakeClient({ getChain, getWallet, simulateTransfer }),
      workspace: tmpdir(),
      now: () => AFTER_OPEN,
      randomUUID: () => UUID,
      sleep: async () => undefined
    };

    const result = prepareRelease({
      conditionFile: "unread.txt",
      expectedSha256: digest("unread"),
      recipientAddress: RECIPIENT,
      amount: "0.000001",
      chainId: 11_155_111,
      walletType: "safe",
      planPath: ".keeperhub/plan.json",
      auditPath: "audit/release.jsonl"
    }, runtime);

    await expect(result).rejects.toBeInstanceOf(UsageError);
    await expect(result).rejects.toMatchObject({
      message: "Release execution requires an explicitly asserted EOA wallet."
    });
    expect(getChain).not.toHaveBeenCalled();
    expect(getWallet).not.toHaveBeenCalled();
    expect(simulateTransfer).not.toHaveBeenCalled();
  });

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

  it("does not consume the simulation when the plan or audit destination cannot be persisted", async () => {
    const existingWorkspace = await mkdtemp(join(tmpdir(), "keeperhub-release-destination-"));
    await mkdir(join(existingWorkspace, "deliverables"));
    const contents = "approved\n";
    await writeFile(join(existingWorkspace, "deliverables/result.txt"), contents);
    await mkdir(join(existingWorkspace, ".keeperhub"));
    await writeFile(join(existingWorkspace, ".keeperhub/plan.json"), "do not replace\n");
    const existingSimulation = vi.fn(fakeClient().simulateTransfer);
    const existingRuntime: ReleaseRuntime = {
      client: fakeClient({ simulateTransfer: existingSimulation }),
      workspace: existingWorkspace,
      now: () => AFTER_OPEN
    };
    await expect(prepareRelease({
      conditionFile: "deliverables/result.txt",
      expectedSha256: digest(contents),
      recipientAddress: RECIPIENT,
      amount: "0.000001",
      chainId: 11_155_111,
      walletType: "eoa",
      planPath: ".keeperhub/plan.json",
      auditPath: "audit/release.jsonl"
    }, existingRuntime)).rejects.toThrow(/plan.*exists|exclusively|replace/i);
    expect(existingSimulation).not.toHaveBeenCalled();
    expect(await readFile(join(existingWorkspace, ".keeperhub/plan.json"), "utf8")).toBe("do not replace\n");

    const invalidWorkspace = await mkdtemp(join(tmpdir(), "keeperhub-release-destination-"));
    await mkdir(join(invalidWorkspace, "deliverables"));
    await writeFile(join(invalidWorkspace, "deliverables/result.txt"), contents);
    await mkdir(join(invalidWorkspace, "audit/release.jsonl"), { recursive: true });
    const invalidSimulation = vi.fn(fakeClient().simulateTransfer);
    const invalidRuntime: ReleaseRuntime = {
      client: fakeClient({ simulateTransfer: invalidSimulation }),
      workspace: invalidWorkspace,
      now: () => AFTER_OPEN
    };
    await expect(prepareRelease({
      conditionFile: "deliverables/result.txt",
      expectedSha256: digest(contents),
      recipientAddress: RECIPIENT,
      amount: "0.000001",
      chainId: 11_155_111,
      walletType: "eoa",
      planPath: ".keeperhub/plan.json",
      auditPath: "audit/release.jsonl"
    }, invalidRuntime)).rejects.toThrow();
    expect(invalidSimulation).not.toHaveBeenCalled();
    await expect(readFile(join(invalidWorkspace, ".keeperhub/plan.json"))).rejects.toThrow();
    await expect(readFile(join(invalidWorkspace, "audit/release.jsonl.lock"))).rejects.toThrow();
  });

  it("rejects completed or non-null artifact-bearing simulation responses and removes empty reservations", async () => {
    for (const simulation of [
      {
        success: true,
        status: "completed",
        from: WALLET,
        to: RECIPIENT,
        value: "1000000000000",
        gasEstimate: "21000",
        wouldRevert: false,
        executionId: "exec-forbidden",
        transactionHash: `0x${"8".repeat(64)}`,
        explorerUrl: `https://sepolia.etherscan.io/tx/0x${"8".repeat(64)}`
      },
      {
        success: true,
        status: "simulated",
        from: WALLET,
        to: RECIPIENT,
        value: "1000000000000",
        gasEstimate: "21000",
        wouldRevert: false,
        transactionHash: `0x${"9".repeat(64)}`
      },
      {
        success: true,
        status: "simulated",
        from: WALLET,
        to: RECIPIENT,
        value: "1000000000000",
        gasEstimate: "21000",
        wouldRevert: false,
        executionId: "exec-forbidden"
      },
      {
        success: true,
        status: "simulated",
        from: WALLET,
        to: RECIPIENT,
        value: "1000000000000",
        gasEstimate: "21000",
        wouldRevert: false,
        explorerUrl: `https://sepolia.etherscan.io/tx/0x${"7".repeat(64)}`
      }
    ]) {
      const workspace = await mkdtemp(join(tmpdir(), "keeperhub-release-simulation-"));
      await mkdir(join(workspace, "deliverables"));
      const contents = "approved\n";
      await writeFile(join(workspace, "deliverables/result.txt"), contents);
      const simulateTransfer = vi.fn(async () => simulation);
      await expect(prepareRelease({
        conditionFile: "deliverables/result.txt",
        expectedSha256: digest(contents),
        recipientAddress: RECIPIENT,
        amount: "0.000001",
        chainId: 11_155_111,
        walletType: "eoa",
        planPath: ".keeperhub/plan.json",
        auditPath: "audit/release.jsonl"
      }, {
        client: fakeClient({ simulateTransfer }),
        workspace,
        now: () => AFTER_OPEN
      })).rejects.toThrow(/simulation/i);
      expect(simulateTransfer).toHaveBeenCalledTimes(1);
      await expect(readFile(join(workspace, ".keeperhub/plan.json"))).rejects.toThrow();
      await expect(readFile(join(workspace, "audit/release.jsonl"))).rejects.toThrow();
      await expect(readFile(join(workspace, "audit/release.jsonl.lock"))).rejects.toThrow();
    }
  });

  it("accepts explicitly null simulation artifact fields as absence and preserves exact evidence", async () => {
    const simulateTransfer = vi.fn(async (request: TransferSimulationRequest) => ({
      success: true,
      status: "simulated" as const,
      from: WALLET,
      to: request.recipientAddress,
      value: "1000000000000",
      gasEstimate: "21000",
      wouldRevert: false as const,
      executionId: null,
      transactionHash: null,
      explorerUrl: null
    }));
    const paths = await prepared(fakeClient({ simulateTransfer }));

    const plan = await readPlanFile(paths.workspace, paths.planPath);
    expect(plan.simulation).toEqual({
      status: "simulated",
      from: WALLET,
      to: RECIPIENT,
      value: "1000000000000",
      gasEstimate: "21000",
      wouldRevert: false
    });
    expect(simulateTransfer).toHaveBeenCalledTimes(1);
    expect(await readFile(join(paths.workspace, paths.auditPath), "utf8")).toContain("\"status\":\"simulated\"");
  });

  it("holds the audit reservation across simulation so concurrent audit writers fail safely", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "keeperhub-release-audit-lock-"));
    await mkdir(join(workspace, "deliverables"));
    const contents = "approved\n";
    await writeFile(join(workspace, "deliverables/result.txt"), contents);
    const enteredSimulation = deferred();
    const finishSimulation = deferred();
    const client = fakeClient({
      async simulateTransfer(request) {
        enteredSimulation.resolve();
        await finishSimulation.promise;
        return await fakeClient().simulateTransfer(request);
      }
    });
    const preparation = prepareRelease({
      conditionFile: "deliverables/result.txt",
      expectedSha256: digest(contents),
      recipientAddress: RECIPIENT,
      amount: "0.000001",
      chainId: 11_155_111,
      walletType: "eoa",
      planPath: ".keeperhub/plan.json",
      auditPath: "audit/release.jsonl"
    }, { client, workspace, now: () => AFTER_OPEN });

    await enteredSimulation.promise;
    const concurrentOutcome = await appendAuditEvent(
      workspace,
      "audit/release.jsonl",
      "concurrent",
      { accepted: false },
      AFTER_OPEN
    ).then(
      () => "appended" as const,
      (error: unknown) => error
    );
    finishSimulation.resolve();
    await preparation;

    expect(concurrentOutcome).toBeInstanceOf(UsageError);
    expect(String((concurrentOutcome as Error).message)).toMatch(/audit.*lock|reserve.*audit|exclusiv/i);
    const records = (await readFile(join(workspace, "audit/release.jsonl"), "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { event: string });
    expect(records.map(({ event }) => event)).toEqual(["condition", "simulation"]);
  });

  it("rejects a valid same-file audit mutation while simulation is in flight", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "keeperhub-release-audit-mutation-"));
    await mkdir(join(workspace, "deliverables"));
    const contents = "approved\n";
    await writeFile(join(workspace, "deliverables/result.txt"), contents);
    const enteredSimulation = deferred();
    const finishSimulation = deferred();
    const client = fakeClient({
      async simulateTransfer(request) {
        enteredSimulation.resolve();
        await finishSimulation.promise;
        return await fakeClient().simulateTransfer(request);
      }
    });
    const preparation = prepareRelease({
      conditionFile: "deliverables/result.txt",
      expectedSha256: digest(contents),
      recipientAddress: RECIPIENT,
      amount: "0.000001",
      chainId: 11_155_111,
      walletType: "eoa",
      planPath: ".keeperhub/plan.json",
      auditPath: "audit/release.jsonl"
    }, { client, workspace, now: () => AFTER_OPEN });

    await enteredSimulation.promise;
    const unsigned = {
      schemaVersion: 1 as const,
      index: 0,
      timestamp: AFTER_OPEN.toISOString(),
      event: "uncooperative-mutation",
      data: { valid: true },
      previousHash: null
    };
    await writeFile(join(workspace, "audit/release.jsonl"), `${JSON.stringify({
      ...unsigned,
      hash: sha256(canonicalJson(unsigned))
    })}\n`);
    finishSimulation.resolve();

    await expect(preparation).rejects.toThrow(/audit.*(?:changed|mutat)|retained.*audit/i);
    await expect(readFile(join(workspace, ".keeperhub/plan.json"))).rejects.toThrow();
  });

  it("rejects audit path replacement while simulation is in flight", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "keeperhub-release-audit-replacement-"));
    await mkdir(join(workspace, "deliverables"));
    const contents = "approved\n";
    await writeFile(join(workspace, "deliverables/result.txt"), contents);
    const enteredSimulation = deferred();
    const finishSimulation = deferred();
    const client = fakeClient({
      async simulateTransfer(request) {
        enteredSimulation.resolve();
        await finishSimulation.promise;
        return await fakeClient().simulateTransfer(request);
      }
    });
    const preparation = prepareRelease({
      conditionFile: "deliverables/result.txt",
      expectedSha256: digest(contents),
      recipientAddress: RECIPIENT,
      amount: "0.000001",
      chainId: 11_155_111,
      walletType: "eoa",
      planPath: ".keeperhub/plan.json",
      auditPath: "audit/release.jsonl"
    }, { client, workspace, now: () => AFTER_OPEN });

    await enteredSimulation.promise;
    const auditPath = join(workspace, "audit/release.jsonl");
    const displacedPath = join(workspace, "audit/displaced.jsonl");
    await rename(auditPath, displacedPath);
    await writeFile(auditPath, "");
    finishSimulation.resolve();

    await expect(preparation).rejects.toThrow(/audit.*(?:identity|replac|changed)|retained.*audit/i);
    await expect(readFile(join(workspace, ".keeperhub/plan.json"))).rejects.toThrow();
    expect(await readFile(auditPath, "utf8")).toBe("");
    expect(await readFile(displacedPath, "utf8")).toBe("");
    await expect(readFile(`${auditPath}.lock`)).rejects.toThrow();
  });

  it("detects audit replacement between the final retained precheck and write", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "keeperhub-release-audit-final-replacement-"));
    await mkdir(join(workspace, "deliverables"));
    const contents = "approved\n";
    await writeFile(join(workspace, "deliverables/result.txt"), contents);
    const auditPath = join(workspace, "audit/release.jsonl");
    const displacedPath = join(workspace, "audit/displaced.jsonl");
    const controlledNow = new Date(AFTER_OPEN);
    let timestampReads = 0;
    controlledNow.toISOString = () => {
      timestampReads += 1;
      if (timestampReads === 3) {
        renameSync(auditPath, displacedPath);
        writeFileSync(auditPath, "replacement audit\n");
      }
      return AFTER_OPEN.toISOString();
    };

    await expect(prepareRelease({
      conditionFile: "deliverables/result.txt",
      expectedSha256: digest(contents),
      recipientAddress: RECIPIENT,
      amount: "0.000001",
      chainId: 11_155_111,
      walletType: "eoa",
      planPath: ".keeperhub/plan.json",
      auditPath: "audit/release.jsonl"
    }, {
      client: fakeClient(),
      workspace,
      now: () => controlledNow
    })).rejects.toThrow(/audit.*(?:identity|replac|changed)|retained.*audit/i);

    expect(timestampReads).toBe(3);
    expect(await readFile(auditPath, "utf8")).toBe("replacement audit\n");
    await expect(verifyAuditFile(workspace, "audit/displaced.jsonl")).resolves.toMatchObject({
      ok: true,
      records: 2
    });
    await expect(readFile(join(workspace, ".keeperhub/plan.json"))).rejects.toThrow();
    await expect(readFile(`${auditPath}.lock`)).rejects.toThrow();
  });

  it("preserves a replacement lock and audit file when lock ownership is lost", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "keeperhub-release-audit-lock-replacement-"));
    await mkdir(join(workspace, "deliverables"));
    const contents = "approved\n";
    await writeFile(join(workspace, "deliverables/result.txt"), contents);
    const enteredSimulation = deferred();
    const finishSimulation = deferred();
    const client = fakeClient({
      async simulateTransfer(request) {
        enteredSimulation.resolve();
        await finishSimulation.promise;
        return await fakeClient().simulateTransfer(request);
      }
    });
    const preparation = prepareRelease({
      conditionFile: "deliverables/result.txt",
      expectedSha256: digest(contents),
      recipientAddress: RECIPIENT,
      amount: "0.000001",
      chainId: 11_155_111,
      walletType: "eoa",
      planPath: ".keeperhub/plan.json",
      auditPath: "audit/release.jsonl"
    }, { client, workspace, now: () => AFTER_OPEN });

    await enteredSimulation.promise;
    const auditPath = join(workspace, "audit/release.jsonl");
    const lockPath = `${auditPath}.lock`;
    const replacementLock = "replacement lock\n";
    await unlink(lockPath);
    await writeFile(lockPath, replacementLock);
    finishSimulation.resolve();

    await expect(preparation).rejects.toThrow(/audit lock.*identity|lock.*changed/i);
    expect(await readFile(lockPath, "utf8")).toBe(replacementLock);
    expect(await readFile(auditPath, "utf8")).toBe("");
    await expect(readFile(join(workspace, ".keeperhub/plan.json"))).rejects.toThrow();
  });

  it("rejects a multiply-linked audit reservation before writing", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "keeperhub-release-audit-link-"));
    await mkdir(join(workspace, "deliverables"));
    const contents = "approved\n";
    await writeFile(join(workspace, "deliverables/result.txt"), contents);
    const enteredSimulation = deferred();
    const finishSimulation = deferred();
    const client = fakeClient({
      async simulateTransfer(request) {
        enteredSimulation.resolve();
        await finishSimulation.promise;
        return await fakeClient().simulateTransfer(request);
      }
    });
    const preparation = prepareRelease({
      conditionFile: "deliverables/result.txt",
      expectedSha256: digest(contents),
      recipientAddress: RECIPIENT,
      amount: "0.000001",
      chainId: 11_155_111,
      walletType: "eoa",
      planPath: ".keeperhub/plan.json",
      auditPath: "audit/release.jsonl"
    }, { client, workspace, now: () => AFTER_OPEN });

    await enteredSimulation.promise;
    const auditPath = join(workspace, "audit/release.jsonl");
    const aliasPath = join(workspace, "audit/release-alias.jsonl");
    await link(auditPath, aliasPath);
    finishSimulation.resolve();

    await expect(preparation).rejects.toThrow(/audit.*(?:link|identity|changed)|retained.*audit/i);
    expect(await readFile(auditPath, "utf8")).toBe("");
    expect(await readFile(aliasPath, "utf8")).toBe("");
    await expect(readFile(`${auditPath}.lock`)).rejects.toThrow();
    await expect(readFile(join(workspace, ".keeperhub/plan.json"))).rejects.toThrow();
  });

  it("rejects plan path replacement before writing and preserves both files", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "keeperhub-release-plan-replacement-"));
    await mkdir(join(workspace, "deliverables"));
    const contents = "approved\n";
    await writeFile(join(workspace, "deliverables/result.txt"), contents);
    const enteredSimulation = deferred();
    const finishSimulation = deferred();
    const client = fakeClient({
      async simulateTransfer(request) {
        enteredSimulation.resolve();
        await finishSimulation.promise;
        return await fakeClient().simulateTransfer(request);
      }
    });
    const preparation = prepareRelease({
      conditionFile: "deliverables/result.txt",
      expectedSha256: digest(contents),
      recipientAddress: RECIPIENT,
      amount: "0.000001",
      chainId: 11_155_111,
      walletType: "eoa",
      planPath: ".keeperhub/plan.json",
      auditPath: "audit/release.jsonl"
    }, { client, workspace, now: () => AFTER_OPEN });

    await enteredSimulation.promise;
    const planPath = join(workspace, ".keeperhub/plan.json");
    const displacedPath = join(workspace, ".keeperhub/displaced-plan.json");
    await rename(planPath, displacedPath);
    await writeFile(planPath, "replacement plan\n");
    finishSimulation.resolve();

    await expect(preparation).rejects.toThrow(/plan.*(?:identity|replac|changed)|retained.*plan/i);
    expect(await readFile(planPath, "utf8")).toBe("replacement plan\n");
    expect(await readFile(displacedPath, "utf8")).toBe("");
    await expect(verifyAuditFile(workspace, "audit/release.jsonl")).resolves.toMatchObject({
      ok: true,
      records: 2
    });
    await expect(readFile(join(workspace, "audit/release.jsonl.lock"))).rejects.toThrow();
  });

  it("never removes a replacement while rolling back an unused plan reservation", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "keeperhub-release-plan-rollback-"));
    await mkdir(join(workspace, "deliverables"));
    const contents = "approved\n";
    await writeFile(join(workspace, "deliverables/result.txt"), contents);
    const enteredSimulation = deferred();
    const finishSimulation = deferred();
    const client = fakeClient({
      async simulateTransfer(request) {
        enteredSimulation.resolve();
        await finishSimulation.promise;
        return {
          ...await fakeClient().simulateTransfer(request),
          status: "completed",
          executionId: "unexpected"
        };
      }
    });
    const preparation = prepareRelease({
      conditionFile: "deliverables/result.txt",
      expectedSha256: digest(contents),
      recipientAddress: RECIPIENT,
      amount: "0.000001",
      chainId: 11_155_111,
      walletType: "eoa",
      planPath: ".keeperhub/plan.json",
      auditPath: "audit/release.jsonl"
    }, { client, workspace, now: () => AFTER_OPEN });

    await enteredSimulation.promise;
    const planPath = join(workspace, ".keeperhub/plan.json");
    const displacedPath = join(workspace, ".keeperhub/displaced-plan.json");
    await rename(planPath, displacedPath);
    await writeFile(planPath, "replacement plan\n");
    finishSimulation.resolve();

    await expect(preparation).rejects.toThrow();
    expect(await readFile(planPath, "utf8")).toBe("replacement plan\n");
    expect(await readFile(displacedPath, "utf8")).toBe("");
    await expect(readFile(join(workspace, "audit/release.jsonl.lock"))).rejects.toThrow();
  });

  it("rejects a multiply-linked plan reservation before writing", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "keeperhub-release-plan-link-"));
    await mkdir(join(workspace, "deliverables"));
    const contents = "approved\n";
    await writeFile(join(workspace, "deliverables/result.txt"), contents);
    const enteredSimulation = deferred();
    const finishSimulation = deferred();
    const client = fakeClient({
      async simulateTransfer(request) {
        enteredSimulation.resolve();
        await finishSimulation.promise;
        return await fakeClient().simulateTransfer(request);
      }
    });
    const preparation = prepareRelease({
      conditionFile: "deliverables/result.txt",
      expectedSha256: digest(contents),
      recipientAddress: RECIPIENT,
      amount: "0.000001",
      chainId: 11_155_111,
      walletType: "eoa",
      planPath: ".keeperhub/plan.json",
      auditPath: "audit/release.jsonl"
    }, { client, workspace, now: () => AFTER_OPEN });

    await enteredSimulation.promise;
    const planPath = join(workspace, ".keeperhub/plan.json");
    const aliasPath = join(workspace, ".keeperhub/plan-alias.json");
    await link(planPath, aliasPath);
    finishSimulation.resolve();

    await expect(preparation).rejects.toThrow(/plan.*(?:link|identity|changed)|retained.*plan/i);
    expect(await readFile(planPath, "utf8")).toBe("");
    expect(await readFile(aliasPath, "utf8")).toBe("");
    await expect(readFile(join(workspace, "audit/release.jsonl.lock"))).rejects.toThrow();
  });

  it("fails closed on an ambiguous pre-existing audit lock before simulation", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "keeperhub-release-audit-static-lock-"));
    await mkdir(join(workspace, "deliverables"));
    await mkdir(join(workspace, "audit"));
    const contents = "approved\n";
    const lockContents = "possibly active or stale\n";
    await writeFile(join(workspace, "deliverables/result.txt"), contents);
    await writeFile(join(workspace, "audit/release.jsonl.lock"), lockContents);
    const simulateTransfer = vi.fn(fakeClient().simulateTransfer);

    await expect(prepareRelease({
      conditionFile: "deliverables/result.txt",
      expectedSha256: digest(contents),
      recipientAddress: RECIPIENT,
      amount: "0.000001",
      chainId: 11_155_111,
      walletType: "eoa",
      planPath: ".keeperhub/plan.json",
      auditPath: "audit/release.jsonl"
    }, {
      client: fakeClient({ simulateTransfer }),
      workspace,
      now: () => AFTER_OPEN
    })).rejects.toThrow(/audit.*lock|reserve.*audit|exclusiv/i);

    expect(simulateTransfer).not.toHaveBeenCalled();
    expect(await readFile(join(workspace, "audit/release.jsonl.lock"), "utf8")).toBe(lockContents);
    await expect(readFile(join(workspace, ".keeperhub/plan.json"))).rejects.toThrow();
    await expect(readFile(join(workspace, "audit/release.jsonl"))).rejects.toThrow();
  });

  it("retains and extends a pre-existing static audit destination", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "keeperhub-release-audit-static-"));
    await mkdir(join(workspace, "deliverables"));
    const contents = "approved\n";
    await writeFile(join(workspace, "deliverables/result.txt"), contents);
    await appendAuditEvent(
      workspace,
      "audit/release.jsonl",
      "pre-existing",
      { retained: true },
      new Date(AFTER_OPEN.getTime() - 1_000)
    );
    const auditPath = join(workspace, "audit/release.jsonl");
    const before = await stat(auditPath);

    await prepareRelease({
      conditionFile: "deliverables/result.txt",
      expectedSha256: digest(contents),
      recipientAddress: RECIPIENT,
      amount: "0.000001",
      chainId: 11_155_111,
      walletType: "eoa",
      planPath: ".keeperhub/plan.json",
      auditPath: "audit/release.jsonl"
    }, {
      client: fakeClient(),
      workspace,
      now: () => AFTER_OPEN
    });

    const after = await stat(auditPath);
    expect({ dev: after.dev, ino: after.ino }).toEqual({ dev: before.dev, ino: before.ino });
    await expect(verifyAuditFile(workspace, "audit/release.jsonl")).resolves.toMatchObject({
      ok: true,
      records: 3
    });
    const events = (await readFile(auditPath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => (JSON.parse(line) as { event: string }).event);
    expect(events).toEqual(["pre-existing", "condition", "simulation"]);
    await expect(readFile(`${auditPath}.lock`)).rejects.toThrow();
  });

  it("serializes concurrent appends made through one audit reservation", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "keeperhub-release-audit-serialized-"));
    const reservation = await reserveAuditDestination(workspace, "audit/release.jsonl");
    try {
      await Promise.all([
        reservation.append("one", { order: 1 }, AFTER_OPEN),
        reservation.append("two", { order: 2 }, AFTER_OPEN)
      ]);
    } finally {
      await reservation.release();
    }

    await expect(verifyAuditFile(workspace, "audit/release.jsonl")).resolves.toMatchObject({
      ok: true,
      records: 2
    });
    const records = (await readFile(join(workspace, "audit/release.jsonl"), "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { index: number; event: string });
    expect(records).toMatchObject([
      { index: 0, event: "one" },
      { index: 1, event: "two" }
    ]);
  });

  it("rejects one path used for both plan and audit before simulation", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "keeperhub-release-overlap-"));
    await mkdir(join(workspace, "deliverables"));
    const contents = "approved\n";
    await writeFile(join(workspace, "deliverables/result.txt"), contents);
    const simulateTransfer = vi.fn(fakeClient().simulateTransfer);
    await expect(prepareRelease({
      conditionFile: "deliverables/result.txt",
      expectedSha256: digest(contents),
      recipientAddress: RECIPIENT,
      amount: "0.000001",
      chainId: 11_155_111,
      walletType: "eoa",
      planPath: ".keeperhub/final-release.json",
      auditPath: ".keeperhub/final-release.json"
    }, {
      client: fakeClient({ simulateTransfer }),
      workspace,
      now: () => AFTER_OPEN
    })).rejects.toThrow(/distinct|same path/i);
    expect(simulateTransfer).not.toHaveBeenCalled();
    await expect(readFile(join(workspace, ".keeperhub/final-release.json"))).rejects.toThrow();
  });

  it("strictly validates loaded plan schema, exact TTL, and simulation semantics", async () => {
    const paths = await prepared();
    const planPath = join(paths.workspace, paths.planPath);
    const original = JSON.parse(await readFile(planPath, "utf8")) as Record<string, unknown>;

    await writeFile(planPath, JSON.stringify({ ...original, unexpected: true }));
    await expect(readPlanFile(paths.workspace, paths.planPath)).rejects.toThrow(/schema/i);

    const shortTtl: Record<string, unknown> = {
      ...original,
      expiresAt: new Date(Date.parse(String(original.createdAt)) + 5 * 60_000).toISOString()
    };
    const { planDigest: _shortDigest, ...shortUnsigned } = shortTtl;
    shortTtl.planDigest = sha256(canonicalJson(shortUnsigned));
    await writeFile(planPath, JSON.stringify(shortTtl));
    await expect(executeRelease(executeInput(paths), paths.runtime)).rejects.toThrow(/ten minutes|ten-minute|ttl/i);

    const mismatchedSimulation: Record<string, unknown> = {
      ...original,
      simulation: {
        ...(original.simulation as Record<string, unknown>),
        from: "0x3333333333333333333333333333333333333333"
      }
    };
    const { planDigest: _simulationDigest, ...simulationUnsigned } = mismatchedSimulation;
    mismatchedSimulation.planDigest = sha256(canonicalJson(simulationUnsigned));
    await writeFile(planPath, JSON.stringify(mismatchedSimulation));
    await expect(executeRelease(executeInput(paths), paths.runtime)).rejects.toThrow(/simulation.*intent|sender/i);
  });

  it("requires the plan digest and prints the complete centralized formal summary", async () => {
    const wrongPaths = await prepared();
    const wrongPlan = await readPlanFile(wrongPaths.workspace, wrongPaths.planPath);
    wrongPaths.runtime.confirmIO = {
      isInputTTY: true,
      isOutputTTY: true,
      question: async (prompt) => {
        expect(prompt).toContain("Ethereum Sepolia");
        expect(prompt).toContain(String(wrongPlan.intent.chainId));
        expect(prompt).toContain("Wallet type: eoa");
        expect(prompt).toContain(wrongPlan.intent.walletAddress);
        expect(prompt).toContain(wrongPlan.intent.recipientAddress);
        expect(prompt).toContain(`${wrongPlan.intent.amount} ETH`);
        expect(prompt).toContain("1000000000000 wei");
        expect(prompt).toContain(wrongPlan.intent.condition.path);
        expect(prompt).toContain(wrongPlan.intent.condition.sha256);
        expect(prompt).toContain("Simulation status: simulated");
        expect(prompt).toContain(`Simulation value: ${wrongPlan.simulation.value} wei`);
        expect(prompt).toContain(`Simulation Gas estimate: ${wrongPlan.simulation.gasEstimate}`);
        expect(prompt).toContain("Simulation would revert: false");
        expect(prompt).toContain(wrongPlan.intentDigest);
        expect(prompt).toContain(wrongPlan.planDigest);
        expect(prompt).toContain(wrongPlan.expiresAt);
        expect(prompt).toMatch(/zero on-chain side effects/i);
        expect(prompt).toMatch(/same (persisted )?idempotency key/i);
        expect(prompt).toContain(confirmationPhrase(wrongPlan.planDigest));
        return confirmationPhrase(wrongPlan.intentDigest);
      }
    };
    await expect(executeRelease(executeInput(wrongPaths), wrongPaths.runtime)).resolves.toMatchObject({
      outcome: "cancelled"
    });
  });

  it("rechecks enabled testnet Sepolia immediately before execute and cross-process retry POSTs", async () => {
    for (const retry of [false, true]) {
      let chainReads = 0;
      const submit = vi.fn(async () => ({ executionId: "never", status: "queued" }));
      const client = fakeClient({
        async getChain(chainId) {
          chainReads += 1;
          return {
            chainId,
            enabled: chainReads === 1,
            isTestnet: true,
            name: "Ethereum Sepolia"
          };
        },
        executeTransfer: submit
      });
      const paths = await prepared(client);
      const plan = await readPlanFile(paths.workspace, paths.planPath);
      paths.runtime.confirmIO = {
        isInputTTY: true,
        isOutputTTY: true,
        question: async () => retry
          ? retryConfirmationPhrase(plan.planDigest)
          : confirmationPhrase(plan.planDigest)
      };
      if (retry) {
        await writeRetryState(paths);
        await expect(retryRelease({
          planPath: paths.planPath,
          statePath: paths.statePath,
          auditPath: paths.auditPath
        }, paths.runtime)).rejects.toThrow(/Sepolia|network|disabled/i);
      } else {
        await expect(executeRelease(executeInput(paths), paths.runtime)).rejects.toThrow(/Sepolia|network|disabled/i);
      }
      expect(submit).not.toHaveBeenCalled();
      expect(chainReads).toBeGreaterThanOrEqual(2);
    }
  });

  it("caps polling sleeps and treats zero or invalid hints as absent", async () => {
    expect(simulationSchema.safeParse({
      success: true,
      status: "completed",
      wouldRevert: false
    }).success).toBe(false);

    const responses = new Map<string, string>([
      ["invalid", "not-a-number"],
      ["huge", "999999"],
      ["zero", "0"]
    ]);
    const adapter = createReleaseClientAdapter({
      async getExecutionStatus(executionId: string) {
        return {
          data: { executionId, status: "pending" },
          headers: new Headers({ "X-Poll-Interval-Hint": responses.get(executionId) ?? "" })
        };
      }
    } as unknown as KeeperHubClient);
    await expect(adapter.getExecutionStatus("invalid")).resolves.not.toHaveProperty("pollIntervalHintMs");
    await expect(adapter.getExecutionStatus("huge")).resolves.toMatchObject({ pollIntervalHintMs: 30_000 });
    await expect(adapter.getExecutionStatus("zero")).resolves.not.toHaveProperty("pollIntervalHintMs");

    let statusCalls = 0;
    const sleep = vi.fn(async (_milliseconds: number) => undefined);
    const paths = await prepared(fakeClient({
      async getExecutionStatus(executionId) {
        statusCalls += 1;
        return statusCalls === 1
          ? { executionId, status: "pending", pollIntervalHintMs: 999_999 }
          : {
            executionId,
            status: "completed",
            transactionHash: `0x${"a".repeat(64)}`,
            explorerUrl: `https://sepolia.etherscan.io/tx/0x${"a".repeat(64)}`,
            result: { success: true }
          };
      }
    }));
    const plan = await readPlanFile(paths.workspace, paths.planPath);
    paths.runtime.sleep = sleep;
    paths.runtime.confirmIO = {
      isInputTTY: true,
      isOutputTTY: true,
      question: async () => confirmationPhrase(plan.planDigest)
    };
    await executeRelease(executeInput(paths), paths.runtime);
    expect(sleep).toHaveBeenCalledWith(30_000);
  });

  it("preserves simulation status and execution artifacts through the production adapter", async () => {
    const transactionHash = `0x${"b".repeat(64)}`;
    const explorerUrl = `https://sepolia.etherscan.io/tx/${transactionHash}`;
    const adapter = createReleaseClientAdapter({
      async simulateTransfer() {
        return {
          success: true,
          status: "simulated",
          from: WALLET,
          to: RECIPIENT,
          value: "1000000000000",
          gasEstimate: "21000",
          wouldRevert: false,
          executionId: "unexpected-execution",
          transactionHash,
          transactionLink: explorerUrl
        };
      }
    } as unknown as KeeperHubClient);

    await expect(adapter.simulateTransfer({
      chainId: 11_155_111,
      recipientAddress: RECIPIENT,
      amount: "0.000001",
      simulate: true
    })).resolves.toMatchObject({
      status: "simulated",
      executionId: "unexpected-execution",
      transactionHash,
      explorerUrl
    });
  });

  it("keeps either non-null explorer alias visible to simulation validation", async () => {
    const explorerUrl = `https://sepolia.etherscan.io/tx/0x${"c".repeat(64)}`;
    for (const aliases of [
      { transactionLink: explorerUrl, explorerUrl: null },
      { transactionLink: null, explorerUrl }
    ]) {
      const adapter = createReleaseClientAdapter({
        async simulateTransfer() {
          return {
            success: true,
            status: "simulated",
            from: WALLET,
            to: RECIPIENT,
            value: "1000000000000",
            gasEstimate: "21000",
            wouldRevert: false,
            executionId: null,
            transactionHash: null,
            ...aliases
          };
        }
      } as unknown as KeeperHubClient);
      const workspace = await mkdtemp(join(tmpdir(), "keeperhub-release-adapter-artifact-"));
      await mkdir(join(workspace, "deliverables"));
      const contents = "approved\n";
      await writeFile(join(workspace, "deliverables/result.txt"), contents);

      await expect(prepareRelease({
        conditionFile: "deliverables/result.txt",
        expectedSha256: digest(contents),
        recipientAddress: RECIPIENT,
        amount: "0.000001",
        chainId: 11_155_111,
        walletType: "eoa",
        planPath: ".keeperhub/plan.json",
        auditPath: "audit/release.jsonl"
      }, {
        client: fakeClient({ simulateTransfer: adapter.simulateTransfer }),
        workspace,
        now: () => AFTER_OPEN
      })).rejects.toThrow(/simulation.*artifact|execution or transaction/i);
    }
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
        return confirmationPhrase(conditionPlan.planDigest);
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
        return confirmationPhrase(expiryPlan.planDigest);
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
      question: async () => confirmationPhrase(plan.planDigest)
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
    const plan = JSON.parse(await readFile(join(paths.workspace, paths.planPath), "utf8")) as { planDigest: string };
    paths.runtime.confirmIO = {
      isInputTTY: true,
      isOutputTTY: true,
      question: async () => confirmationPhrase(plan.planDigest)
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
      question: async () => confirmationPhrase(plan.planDigest)
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
      question: async () => confirmationPhrase(plan.planDigest)
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
    const plan = JSON.parse(await readFile(join(paths.workspace, paths.planPath), "utf8")) as { planDigest: string };
    paths.runtime.confirmIO = {
      isInputTTY: true,
      isOutputTTY: true,
      question: async () => confirmationPhrase(plan.planDigest)
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
        return retryConfirmationPhrase(plan.planDigest);
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
        return retryConfirmationPhrase(plan.planDigest);
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
      question: async () => confirmationPhrase(plan.planDigest)
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
      question: async () => confirmationPhrase(plan.planDigest)
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
