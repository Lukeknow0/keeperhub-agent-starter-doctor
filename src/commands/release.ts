import { Command, Option } from "commander";
import { EXIT_CODES, SEPOLIA_CHAIN_ID } from "../core/constants.js";
import { UsageError } from "../core/errors.js";
import { printJson } from "../core/output.js";
import { redact } from "../core/redact.js";
import type { JsonValue } from "../core/types.js";
import type { KeeperHubClient } from "../keeperhub/client.js";
import { numericChainId } from "../keeperhub/schemas.js";
import { verifyAuditFile } from "../release/audit.js";
import {
  executeRelease,
  MAX_POLL_INTERVAL_MS,
  prepareRelease,
  retryRelease,
  statusRelease
} from "../release/service.js";
import type {
  ChainContext,
  ExecutionStatusResult,
  ReleaseKeeperHubClient,
  ReleaseRuntime,
  TransferSimulationResult
} from "../release/types.js";

const DEFAULT_PLAN = ".keeperhub/release-plan.json";
const DEFAULT_STATE = ".keeperhub/release-state.json";
const DEFAULT_AUDIT = "audit/release.jsonl";

export interface ReleaseCommandDependencies extends Omit<ReleaseRuntime, "client" | "workspace"> {
  client: ReleaseKeeperHubClient;
  workspace?: string;
  output?: (value: unknown) => void;
}

export interface AuditCommandDependencies {
  workspace?: string;
  output?: (value: unknown) => void;
}

export function createReleaseClientAdapter(client: KeeperHubClient): ReleaseKeeperHubClient {
  return {
    async getChain(chainId): Promise<ChainContext | null> {
      const chain = (await client.getChains()).find((candidate) => numericChainId(candidate.chainId) === chainId);
      if (chain === undefined) return null;
      const context: ChainContext = {
        chainId: numericChainId(chain.chainId),
        enabled: chain.isEnabled === true,
        isTestnet: chain.isTestnet === true,
        name: chain.name
      };
      if (chain.explorerUrl !== undefined) context.explorerUrl = chain.explorerUrl;
      return context;
    },
    async getWallet(_chainId) {
      const wallet = await client.getWalletBalances();
      return { walletAddress: wallet.walletAddress };
    },
    async simulateTransfer(request): Promise<TransferSimulationResult> {
      const simulation = await client.simulateTransfer({
        chainId: request.chainId,
        recipientAddress: request.recipientAddress,
        amount: request.amount
      });
      const result: TransferSimulationResult = {
        success: simulation.success,
        status: simulation.status,
        from: simulation.from ?? "",
        to: simulation.to ?? "",
        wouldRevert: simulation.wouldRevert
      };
      if (simulation.value !== undefined) result.value = simulation.value;
      if (simulation.gasEstimate !== undefined) result.gasEstimate = simulation.gasEstimate;
      if (simulation.revertReason !== undefined) result.revertReason = simulation.revertReason;
      if (simulation.executionId !== undefined) result.executionId = simulation.executionId;
      if (simulation.transactionHash !== undefined) result.transactionHash = simulation.transactionHash;
      if (simulation.explorerUrl !== undefined && simulation.explorerUrl !== null) {
        result.explorerUrl = simulation.explorerUrl;
      } else if (simulation.transactionLink !== undefined && simulation.transactionLink !== null) {
        result.explorerUrl = simulation.transactionLink;
      } else if (simulation.explorerUrl === null || simulation.transactionLink === null) {
        result.explorerUrl = null;
      }
      return result;
    },
    async executeTransfer(request, options) {
      return (await client.executeTransfer(request, options.idempotencyKey)).data;
    },
    async getExecutionStatus(executionId): Promise<ExecutionStatusResult> {
      const response = await client.getExecutionStatus(executionId);
      const hintHeader = response.headers.get("X-Poll-Interval-Hint");
      const hintSeconds = hintHeader === null ? null : Number(hintHeader);
      const status: ExecutionStatusResult = {
        executionId: response.data.executionId,
        status: response.data.status
      };
      if (response.data.transactionHash !== undefined) status.transactionHash = response.data.transactionHash;
      if (response.data.transactionLink !== undefined) status.explorerUrl = response.data.transactionLink;
      if (Number.isFinite(hintSeconds) && hintSeconds !== null && hintSeconds > 0) {
        status.pollIntervalHintMs = Math.min(hintSeconds * 1_000, MAX_POLL_INTERVAL_MS);
      }
      if (typeof response.data.result === "object" && response.data.result !== null && !Array.isArray(response.data.result)) {
        status.result = response.data.result as Record<string, JsonValue>;
      }
      return status;
    }
  };
}

function runtime(dependencies: ReleaseCommandDependencies): ReleaseRuntime {
  const value: ReleaseRuntime = {
    client: dependencies.client,
    workspace: dependencies.workspace ?? process.cwd()
  };
  if (dependencies.now !== undefined) value.now = dependencies.now;
  if (dependencies.randomUUID !== undefined) value.randomUUID = dependencies.randomUUID;
  if (dependencies.sleep !== undefined) value.sleep = dependencies.sleep;
  if (dependencies.confirmIO !== undefined) value.confirmIO = dependencies.confirmIO;
  return value;
}

function output(dependencies: { output?: (value: unknown) => void }, value: unknown): void {
  (dependencies.output ?? printJson)(redact(value));
}

function outputReleaseResult(
  dependencies: { output?: (value: unknown) => void },
  result: Awaited<ReturnType<typeof executeRelease>>
): void {
  output(dependencies, result);
  if (result.outcome === "failed" || result.outcome === "ambiguous") {
    process.exitCode = EXIT_CODES.diagnosticFailure;
  }
}

function chainId(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new UsageError("--chain-id must be a positive integer.", {
      step: "Validate release network",
      causes: ["The supplied chain ID is not a positive integer."],
      fixCommands: [`node dist/cli.js release prepare --chain-id ${SEPOLIA_CHAIN_ID} --help`]
    });
  }
  return parsed;
}

export function createReleaseCommand(dependencies: ReleaseCommandDependencies): Command {
  const command = new Command("release").description("Prepare and safely execute a conditional KeeperHub release");

  command.command("prepare")
    .description("verify a file condition and simulate the exact transfer")
    .requiredOption("--condition-file <path>", "workspace-local deliverable file")
    .requiredOption("--expected-sha256 <digest>", "approved SHA-256 digest")
    .requiredOption("--recipient <address>", "recipient address")
    .requiredOption("--wallet-type <type>", "verified organization wallet type")
    .addOption(new Option("--chain-id <id>", "chain ID").default(String(SEPOLIA_CHAIN_ID)).argParser(chainId))
    .option("--amount <eth>", "native ETH amount", "0.000001")
    .option("--plan <path>", "output intent plan", DEFAULT_PLAN)
    .option("--audit <path>", "public tamper-evident audit JSONL", DEFAULT_AUDIT)
    .action(async (options: {
      conditionFile: string;
      expectedSha256: string;
      recipient: string;
      walletType: string;
      chainId: number;
      amount: string;
      plan: string;
      audit: string;
    }) => {
      const result = await prepareRelease({
        conditionFile: options.conditionFile,
        expectedSha256: options.expectedSha256,
        recipientAddress: options.recipient,
        walletType: options.walletType,
        chainId: options.chainId,
        amount: options.amount,
        planPath: options.plan,
        auditPath: options.audit
      }, runtime(dependencies));
      output(dependencies, result);
    });

  command.command("execute")
    .description("confirm in a real TTY, persist an idempotency key, and submit")
    .requiredOption("--wallet-type <type>", "verified organization wallet type; must be eoa")
    .option("--plan <path>", "prepared intent plan", DEFAULT_PLAN)
    .option("--state <path>", "private mode-0600 execution state", DEFAULT_STATE)
    .option("--audit <path>", "public tamper-evident audit JSONL", DEFAULT_AUDIT)
    .action(async (options: { walletType: string; plan: string; state: string; audit: string }) => {
      outputReleaseResult(dependencies, await executeRelease({
        walletType: options.walletType,
        planPath: options.plan,
        statePath: options.state,
        auditPath: options.audit
      }, runtime(dependencies)));
    });

  command.command("retry")
    .description("retry safely with the already-persisted idempotency key")
    .option("--plan <path>", "prepared intent plan", DEFAULT_PLAN)
    .option("--state <path>", "private mode-0600 execution state", DEFAULT_STATE)
    .option("--audit <path>", "public tamper-evident audit JSONL", DEFAULT_AUDIT)
    .action(async (options: { plan: string; state: string; audit: string }) => {
      outputReleaseResult(dependencies, await retryRelease({
        planPath: options.plan,
        statePath: options.state,
        auditPath: options.audit
      }, runtime(dependencies)));
    });

  command.command("status")
    .description("read or poll an existing KeeperHub execution")
    .option("--state <path>", "private mode-0600 execution state", DEFAULT_STATE)
    .option("--audit <path>", "public tamper-evident audit JSONL", DEFAULT_AUDIT)
    .option("--poll", "poll until KeeperHub returns a terminal status")
    .action(async (options: { state: string; audit: string; poll?: boolean }) => {
      outputReleaseResult(dependencies, await statusRelease({
        statePath: options.state,
        auditPath: options.audit,
        poll: options.poll === true
      }, runtime(dependencies)));
    });

  return command;
}

export function createAuditCommand(dependencies: AuditCommandDependencies = {}): Command {
  const command = new Command("audit").description("Verify the release audit hash chain");
  command.command("verify")
    .description("verify every JSONL record and previousHash link")
    .argument("<audit-file>", "workspace-local audit JSONL file")
    .action(async (auditFile: string) => {
      const result = await verifyAuditFile(dependencies.workspace ?? process.cwd(), auditFile);
      output(dependencies, result);
      if (!result.ok) process.exitCode = EXIT_CODES.diagnosticFailure;
    });
  return command;
}
