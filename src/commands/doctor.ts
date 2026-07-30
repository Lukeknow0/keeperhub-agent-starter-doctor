import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Command, Option } from "commander";
import { z } from "zod";
import { agentInstallCommands } from "../agents/setup.js";
import {
  DOCTOR_SIMULATION_AMOUNT,
  EXIT_CODES,
  KEEPERHUB_BASE_URL,
  QUICKSTART_URL,
  SEPOLIA_CHAIN_ID
} from "../core/constants.js";
import { getApiKey, hasValidApiKeyShape } from "../core/config.js";
import { UsageError, errorMessage } from "../core/errors.js";
import { printDoctorReport } from "../core/output.js";
import { runProcess, type ProcessResult } from "../core/process.js";
import { redactString } from "../core/redact.js";
import type { DoctorCheck, DoctorEnvironment, DoctorReport, JsonValue } from "../core/types.js";
import { KeeperHubClient, KeeperHubHttpError } from "../keeperhub/client.js";
import { numericChainId, type BillingSubscription, type KeeperHubChain, type TransferSimulation, type WalletBalances } from "../keeperhub/schemas.js";
import { McpProbeError, probeKeeperHubMcp, type McpProbeResult } from "../mcp/probe.js";

export type DoctorAgent = "claude" | "codex" | "hermes" | "all";

export interface DoctorOptions {
  agent: DoctorAgent;
  chainId: number;
  json: boolean;
  strict: boolean;
  skipSimulation: boolean;
}

interface DoctorClient {
  getChains(): Promise<KeeperHubChain[]>;
  validateApiKey(): Promise<{ status: number }>;
  getWalletBalances(): Promise<WalletBalances>;
  getBillingSubscription(): Promise<BillingSubscription>;
  simulateTransfer(intent: { chainId: number; recipientAddress: string; amount: string }): Promise<TransferSimulation>;
}

export interface DoctorDependencies {
  cwd?: string;
  apiKey?: string | null;
  client?: DoctorClient;
  run?: typeof runProcess;
  mcpProbe?: (apiKey: string) => Promise<McpProbeResult>;
  platform?: NodeJS.Platform;
}

interface DoctorContext {
  apiKey: string | null;
  apiAuthenticated: boolean;
  chain: KeeperHubChain | null;
  wallet: WalletBalances | null;
}

const agentNames = ["claude", "codex", "hermes"] as const;

const expectedDependencyVersions: Record<string, string> = {
  "@modelcontextprotocol/sdk": "1.29.0",
  "@types/node": "22.15.34",
  commander: "15.0.0",
  tsx: "4.23.1",
  typescript: "7.0.2",
  vitest: "4.1.10",
  zod: "4.4.3"
};

function check(
  id: string,
  status: DoctorCheck["status"],
  step: string,
  summary: string,
  causes: string[] = [],
  fixCommands: string[] = [],
  evidence: Record<string, JsonValue> = {}
): DoctorCheck {
  return { id, status, step, summary, causes, fixCommands, evidence };
}

function parseNodeVersion(value: string): [number, number, number] {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(value);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : [0, 0, 0];
}

function isSupportedNode(value: string): boolean {
  const [major, minor] = parseNodeVersion(value);
  return major > 22 || (major === 22 && minor >= 12);
}

function installedDependencyVersions(stdout: string): Record<string, string> | null {
  try {
    const parsed: unknown = JSON.parse(stdout);
    if (typeof parsed !== "object" || parsed === null || !("dependencies" in parsed)) return null;
    const dependencies = (parsed as { dependencies?: unknown }).dependencies;
    if (typeof dependencies !== "object" || dependencies === null) return null;
    return Object.fromEntries(Object.entries(dependencies).flatMap(([name, value]) => {
      if (typeof value !== "object" || value === null || !("version" in value)) return [];
      const version = (value as { version?: unknown }).version;
      return typeof version === "string" ? [[name, version]] : [];
    }));
  } catch {
    return null;
  }
}

function openCommand(url: string, platform: NodeJS.Platform): string {
  if (platform === "darwin") return `open ${url}`;
  if (platform === "win32") {
    return `powershell -NoProfile -Command \"Start-Process '${url}'\"`;
  }
  return `xdg-open ${url}`;
}

function hermesPluginEnabled(stdout: string): boolean {
  try {
    const parsed: unknown = JSON.parse(stdout);
    if (!Array.isArray(parsed)) return false;
    return parsed.some((entry) => {
      if (typeof entry !== "object" || entry === null) return false;
      const candidate = entry as { name?: unknown; status?: unknown };
      return candidate.name === "keeperhub" && candidate.status === "enabled";
    });
  } catch {
    return false;
  }
}

async function detectAgent(
  agent: Exclude<DoctorAgent, "all">,
  run: typeof runProcess,
  platform: NodeJS.Platform
): Promise<{ check: DoctorCheck; version: string | null }> {
  let command: string = agent;
  let versionResult = await run(command, ["--version"], { timeoutMs: 5_000 });
  if (agent === "codex" && versionResult.exitCode !== 0 && platform === "darwin" && existsSync("/Applications/ChatGPT.app/Contents/Resources/codex")) {
    command = "/Applications/ChatGPT.app/Contents/Resources/codex";
    versionResult = await run(command, ["--version"], { timeoutMs: 5_000 });
  }
  if (versionResult.exitCode !== 0) {
    return {
      check: check(
        `agent.${agent}`,
        "warn",
        `${agent} integration`,
        `${agent} CLI was not found.`,
        [redactString(versionResult.stderr || "Executable is unavailable.")],
        agentInstallCommands(agent, platform),
        { configured: false, authenticatedToolVerified: false }
      ),
      version: null
    };
  }

  const version = (versionResult.stdout || versionResult.stderr).trim().split("\n")[0] ?? "unknown";
  let configured: ProcessResult;
  if (agent === "claude") {
    configured = await run(command, ["mcp", "get", "keeperhub"], { timeoutMs: 10_000 });
  } else if (agent === "codex") {
    configured = await run(command, ["mcp", "get", "keeperhub"], { timeoutMs: 10_000 });
  } else {
    configured = await run(command, ["plugins", "list", "--json"], { timeoutMs: 10_000 });
  }

  const pluginText = `${configured.stdout}\n${configured.stderr}`;
  const isConfigured = agent === "hermes"
    ? configured.exitCode === 0 && hermesPluginEnabled(configured.stdout)
    : configured.exitCode === 0 && /keeperhub/i.test(pluginText);

  return {
    check: check(
      `agent.${agent}`,
      isConfigured ? "pass" : "warn",
      `${agent} integration`,
      isConfigured
        ? "KeeperHub is configured; authenticated MCP verification is reported separately."
        : "CLI is installed but KeeperHub is not configured in this Agent.",
      isConfigured ? [] : ["No KeeperHub MCP/plugin entry was reported by the Agent CLI."],
      isConfigured ? [] : [`node dist/cli.js setup --agent ${agent} --apply`],
      { command, version, configured: isConfigured, authenticatedToolVerified: false }
    ),
    version
  };
}

function httpEvidence(error: unknown): Record<string, JsonValue> {
  if (error instanceof KeeperHubHttpError) {
    return { httpStatus: error.status, response: error.body as JsonValue };
  }
  return { error: redactString(errorMessage(error)) };
}

function extractSpendCap(billing: BillingSubscription): string | number | null {
  if (billing.spendCap !== undefined && billing.spendCap !== null) return billing.spendCap;
  const limits = billing.limits;
  if (limits && "spendCap" in limits) {
    const value = limits.spendCap;
    if (typeof value === "string" || typeof value === "number") return value;
  }
  return null;
}

function ethAmountToWei(amount: string): bigint {
  const [whole = "0", fraction = ""] = amount.split(".");
  return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0"));
}

function validateDoctorSimulation(
  simulation: TransferSimulation,
  walletAddress: string,
  amount: string
): string[] {
  if (simulation.success !== true) {
    return [simulation.revertReason ?? simulation.error ?? "KeeperHub reported success=false."];
  }
  if (simulation.wouldRevert !== false) {
    return [simulation.revertReason ?? simulation.error ?? "KeeperHub reported wouldRevert=true."];
  }

  const causes: string[] = [];
  if (simulation.status !== "simulated") causes.push("Simulation response status is not simulated.");
  const expectedAddress = walletAddress.toLowerCase();
  if (simulation.from === undefined) causes.push("Simulation response omitted from.");
  else if (simulation.from.toLowerCase() !== expectedAddress) causes.push("Simulation from does not match the organization wallet.");
  if (simulation.to === undefined) causes.push("Simulation response omitted to.");
  else if (simulation.to.toLowerCase() !== expectedAddress) causes.push("Simulation to does not match the self-transfer recipient.");

  const expectedValue = ethAmountToWei(amount);
  if (simulation.value === undefined) causes.push("Simulation response omitted value.");
  else if (!/^\d+$/u.test(simulation.value)) causes.push("Simulation value is not a decimal wei string.");
  else if (BigInt(simulation.value) !== expectedValue) causes.push("Simulation value does not match the requested amount in wei.");

  if (simulation.gasEstimate === undefined) causes.push("Simulation response omitted gasEstimate.");
  else if (!/^\d+$/u.test(simulation.gasEstimate) || BigInt(simulation.gasEstimate) <= 0n) {
    causes.push("Simulation gasEstimate is not a positive decimal string.");
  }
  return causes;
}

export async function runDoctor(options: DoctorOptions, deps: DoctorDependencies = {}): Promise<DoctorReport> {
  const cwd = deps.cwd ?? process.cwd();
  const platform = deps.platform ?? process.platform;
  const run = deps.run ?? runProcess;
  const apiKey = deps.apiKey === undefined ? getApiKey() : deps.apiKey;
  const client = deps.client ?? new KeeperHubClient({ apiKey, baseUrl: KEEPERHUB_BASE_URL });
  const mcpProbe = deps.mcpProbe ?? probeKeeperHubMcp;
  const checks: DoctorCheck[] = [];
  const context: DoctorContext = { apiKey, apiAuthenticated: false, chain: null, wallet: null };
  const agents: Record<string, string | null> = {};

  checks.push(check(
    "runtime.node",
    isSupportedNode(process.version) ? "pass" : "fail",
    "Node.js version",
    isSupportedNode(process.version) ? `${process.version} satisfies >=22.12.0.` : `${process.version} is unsupported.`,
    isSupportedNode(process.version) ? [] : ["This starter requires Node.js 22.12.0 or newer."],
    isSupportedNode(process.version) ? [] : [openCommand("https://nodejs.org/en/download", platform)],
    { version: process.version, required: ">=22.12.0" }
  ));

  const npmResult = await run("npm", ["--version"], { timeoutMs: 5_000, cwd });
  const npmVersion = npmResult.exitCode === 0 ? npmResult.stdout.trim() : null;
  checks.push(check(
    "runtime.npm",
    npmVersion ? "pass" : "fail",
    "npm version",
    npmVersion ? `npm ${npmVersion} is available.` : "npm is unavailable.",
    npmVersion ? [] : [redactString(npmResult.stderr || "npm could not be executed.")],
    npmVersion ? [] : [openCommand("https://nodejs.org/en/download", platform)],
    { version: npmVersion }
  ));

  const lockfile = existsSync(resolve(cwd, "package-lock.json"));
  const dependencyResult = lockfile
    ? await run("npm", ["ls", "--depth=0", "--json"], { timeoutMs: 20_000, cwd })
    : null;
  const installedVersions = dependencyResult?.exitCode === 0
    ? installedDependencyVersions(dependencyResult.stdout)
    : null;
  const versionMismatches = Object.entries(expectedDependencyVersions).filter(
    ([name, expected]) => installedVersions?.[name] !== expected
  );
  const dependenciesOk = lockfile && dependencyResult?.exitCode === 0
    && installedVersions !== null && versionMismatches.length === 0;
  checks.push(check(
    "runtime.dependencies",
    dependenciesOk ? "pass" : "fail",
    "Project dependencies",
    dependenciesOk ? "Lockfile and installed dependency tree are healthy." : "Dependencies are missing or inconsistent.",
    dependenciesOk ? [] : [
      !lockfile
        ? "package-lock.json was not found."
        : dependencyResult?.exitCode !== 0
          ? "npm reported an invalid dependency tree."
          : installedVersions === null
            ? "npm returned an unreadable dependency report."
            : `Pinned dependency mismatch: ${versionMismatches.map(([name, version]) => `${name} expected ${version}`).join(", ")}`
    ],
    dependenciesOk ? [] : ["npm ci"],
    { lockfile, installed: dependencyResult?.exitCode === 0, versions: installedVersions }
  ));

  const keyShapeOk = hasValidApiKeyShape(apiKey);
  checks.push(check(
    "env.kh_api_key",
    keyShapeOk ? "pass" : "fail",
    "KH_API_KEY",
    keyShapeOk ? "Organization API key is present." : "Organization API key is missing or has the wrong prefix.",
    keyShapeOk ? [] : ["Direct execution and authenticated MCP require an organization key with the kh_ prefix."],
    keyShapeOk ? [] : ["cp .env.example .env && chmod 600 .env", openCommand("https://app.keeperhub.com", platform)],
    { present: apiKey !== null, expectedPrefix: "kh_", valuePrinted: false }
  ));

  const selectedAgents = options.agent === "all" ? agentNames : [options.agent];
  for (const agent of selectedAgents) {
    const result = await detectAgent(agent, run, platform);
    checks.push(result.check);
    agents[agent] = result.version;
  }

  const khResult = await run("kh", ["version"], { timeoutMs: 10_000 });
  checks.push(check(
    "keeperhub.cli",
    khResult.exitCode === 0 ? "pass" : "warn",
    "KeeperHub CLI",
    khResult.exitCode === 0 ? "kh CLI is reachable." : "kh CLI is optional and was not reachable.",
    khResult.exitCode === 0 ? [] : [redactString(khResult.stderr || "kh executable was not found.")],
    khResult.exitCode === 0 ? [] : [openCommand("https://docs.keeperhub.com", platform)],
    { version: khResult.exitCode === 0 ? khResult.stdout.trim().split("\n")[0] ?? "unknown" : null }
  ));

  if (!keyShapeOk) {
    checks.push(check("keeperhub.auth", "skip", "KeeperHub REST authentication", "Skipped because KH_API_KEY is unavailable."));
  } else {
    try {
      const result = await client.validateApiKey();
      context.apiAuthenticated = result.status === 200;
      checks.push(check(
        "keeperhub.auth",
        context.apiAuthenticated ? "pass" : "fail",
        "KeeperHub REST authentication",
        context.apiAuthenticated ? "Protected /api/keys request succeeded." : "API key could not be verified.",
        context.apiAuthenticated ? [] : ["The key may be invalid, revoked, or scoped to another host."],
        context.apiAuthenticated ? [] : [openCommand("https://app.keeperhub.com", platform)],
        { endpoint: "/api/keys", httpStatus: result.status }
      ));
    } catch (error) {
      checks.push(check(
        "keeperhub.auth", "fail", "KeeperHub REST authentication", "Protected API request failed.",
        [redactString(errorMessage(error))], [openCommand("https://app.keeperhub.com", platform)], httpEvidence(error)
      ));
    }
  }

  if (!context.apiAuthenticated || !apiKey) {
    checks.push(check("keeperhub.mcp", "skip", "KeeperHub MCP", "Skipped until REST authentication succeeds."));
  } else {
    try {
      const result = await mcpProbe(apiKey);
      const verified = result.reachable && result.authenticated && result.toolVerified === "tools_documentation";
      checks.push(check(
        "keeperhub.mcp", verified ? "pass" : "fail", "KeeperHub MCP",
        verified ? "Authenticated tools_documentation call succeeded." : "MCP probe did not prove authenticated tool execution.",
        verified ? [] : ["The direct probe returned without complete authentication evidence."],
        verified ? [] : [openCommand("https://docs.keeperhub.com/ai-tools/mcp-server", platform)],
        { directProbe: true, stage: "complete", reachable: result.reachable, authenticated: result.authenticated, toolCount: result.toolCount, verifiedTool: result.toolVerified }
      ));
    } catch (error) {
      const evidence = error instanceof McpProbeError
        ? { directProbe: true, stage: error.stage, reachable: error.reachable, authenticated: error.authenticated }
        : { directProbe: true, stage: "unknown", reachable: null, authenticated: null };
      checks.push(check(
        "keeperhub.mcp", "fail", "KeeperHub MCP", "Authenticated MCP tool call failed.",
        [redactString(errorMessage(error))], [openCommand("https://docs.keeperhub.com/ai-tools/mcp-server", platform)], evidence
      ));
    }
  }

  try {
    const chains = await client.getChains();
    const target = chains.find((entry) => numericChainId(entry.chainId) === options.chainId) ?? null;
    const valid = target !== null && target.isEnabled === true && target.isTestnet === true;
    context.chain = valid ? target : null;
    checks.push(check(
      "keeperhub.chain", valid ? "pass" : "fail", "Wallet network configuration",
      valid ? `${target.name} is enabled as testnet chain ${options.chainId}.` : `Chain ${options.chainId} is missing, disabled, or not a testnet.`,
      valid ? [] : ["The live /api/chains response did not meet the safe rehearsal requirements."],
      valid ? [] : [openCommand(QUICKSTART_URL, platform)],
      target ? { chainId: numericChainId(target.chainId), name: target.name, isEnabled: target.isEnabled ?? null, isTestnet: target.isTestnet ?? null, explorerUrl: target.explorerUrl ?? null, status: target.status ?? null } : { chainId: options.chainId, found: false }
    ));
  } catch (error) {
    checks.push(check("keeperhub.chain", "fail", "Wallet network configuration", "Live chain list could not be read.", [redactString(errorMessage(error))], [openCommand(QUICKSTART_URL, platform)], httpEvidence(error)));
  }

  if (!context.apiAuthenticated) {
    checks.push(check("keeperhub.wallet", "skip", "Wallet configuration", "Skipped until authentication succeeds."));
    checks.push(check("keeperhub.gas", "skip", "Native balance", "Skipped until wallet data is available."));
  } else {
    try {
      const wallet = await client.getWalletBalances();
      context.wallet = wallet;
      checks.push(check("keeperhub.wallet", "pass", "Wallet configuration", "Organization wallet address was resolved.", [], [], { walletAddress: wallet.walletAddress }));
      checks.push(check(
        "keeperhub.wallet_type", "warn", "Wallet execution semantics", "Wallet type is not exposed by the verified balances response.",
        ["Safe simulations use EOA sender semantics and cannot be treated as execution proof."],
        [openCommand("https://app.keeperhub.com", platform)], { walletType: "unknown", executionAllowed: false }
      ));
      const balance = wallet.balances.find((entry) => numericChainId(entry.chainId) === options.chainId);
      const nativeBalance = balance?.nativeBalance ?? "0";
      const hasNativeBalance = Number.parseFloat(nativeBalance) > 0;
      checks.push(check(
        "keeperhub.gas", hasNativeBalance ? "pass" : "warn", "Native balance",
        hasNativeBalance
          ? `Native balance is present: ${nativeBalance} ${balance?.symbol ?? "native token"}. Simulation determines transaction viability.`
          : "Native balance is zero; simulation is the authoritative preflight.",
        hasNativeBalance ? [] : ["The official hackathon quickstart recommends funding native gas first."],
        hasNativeBalance ? [] : [openCommand(QUICKSTART_URL, platform)],
        { chainId: options.chainId, nativeBalance, nativeBalanceRaw: balance?.nativeBalanceRaw ?? null, symbol: balance?.symbol ?? null }
      ));
    } catch (error) {
      checks.push(check("keeperhub.wallet", "fail", "Wallet configuration", "Wallet balances could not be read.", [redactString(errorMessage(error))], [openCommand("https://app.keeperhub.com", platform)], httpEvidence(error)));
      checks.push(check("keeperhub.gas", "skip", "Native balance", "Skipped because wallet lookup failed."));
    }
  }

  if (!context.apiAuthenticated) {
    checks.push(check("keeperhub.spend_cap", "skip", "Spend Cap", "Skipped until authentication succeeds."));
  } else {
    try {
      const billing = await client.getBillingSubscription();
      const spendCap = extractSpendCap(billing);
      checks.push(check(
        "keeperhub.spend_cap", spendCap === null ? "warn" : "pass", "Spend Cap",
        spendCap === null ? "The live billing response does not expose a daily spend cap." : `Spend cap is ${String(spendCap)}.`,
        spendCap === null ? ["A missing API field is not proof that execution is uncapped."] : [],
        spendCap === null ? [openCommand("https://app.keeperhub.com", platform)] : [],
        { plan: billing.subscription?.plan ?? null, subscriptionStatus: billing.subscription?.status ?? null, spendCap }
      ));
    } catch (error) {
      checks.push(check("keeperhub.spend_cap", "warn", "Spend Cap", "Billing settings could not be verified.", [redactString(errorMessage(error))], [openCommand("https://app.keeperhub.com", platform)], httpEvidence(error)));
    }
  }

  if (options.skipSimulation) {
    checks.push(check("keeperhub.simulation", "skip", "Transaction simulation", "Skipped by --skip-simulation; no transaction was broadcast."));
  } else if (!context.apiAuthenticated || !context.wallet || !context.chain) {
    checks.push(check("keeperhub.simulation", "skip", "Transaction simulation", "Skipped because authentication, wallet, or chain checks failed."));
  } else {
    try {
      const simulation = await client.simulateTransfer({
        chainId: options.chainId,
        recipientAddress: context.wallet.walletAddress,
        amount: DOCTOR_SIMULATION_AMOUNT
      });
      const simulationCauses = validateDoctorSimulation(
        simulation,
        context.wallet.walletAddress,
        DOCTOR_SIMULATION_AMOUNT
      );
      const safe = simulationCauses.length === 0;
      const expectedValueWei = ethAmountToWei(DOCTOR_SIMULATION_AMOUNT).toString();
      checks.push(check(
        "keeperhub.simulation", safe ? "pass" : "fail", "Transaction simulation",
        safe
          ? "Dry-run succeeded; no signature, broadcast, audit row, or transaction hash was created."
          : "Dry-run evidence is incomplete, mismatched, or indicates failure.",
        simulationCauses,
        safe ? [] : [openCommand(QUICKSTART_URL, platform)],
        {
          simulate: true,
          from: simulation.from ?? null,
          to: simulation.to ?? null,
          amount: DOCTOR_SIMULATION_AMOUNT,
          valueWei: simulation.value ?? null,
          expectedValueWei,
          gasEstimate: simulation.gasEstimate ?? null,
          wouldRevert: simulation.wouldRevert
        }
      ));
    } catch (error) {
      checks.push(check("keeperhub.simulation", "fail", "Transaction simulation", "Dry-run request failed; no broadcast was attempted.", [redactString(errorMessage(error))], [openCommand(QUICKSTART_URL, platform)], { simulate: true, ...httpEvidence(error) }));
    }
  }

  const environment: DoctorEnvironment = {
    node: process.version,
    npm: npmVersion,
    platform,
    architecture: process.arch,
    agents
  };
  const blocking = checks.some((entry) => entry.status === "fail" || (options.strict && entry.status === "warn"));
  return { schemaVersion: 1, ok: !blocking, checks, environment };
}

function parseChainId(value: string): number {
  const result = z.coerce.number().int().positive().safeParse(value);
  if (!result.success) {
    throw new UsageError("--chain-id must be a positive integer.", {
      step: "Validate doctor network",
      causes: ["The supplied chain ID is not a positive integer."],
      fixCommands: [`node dist/cli.js doctor --chain-id ${SEPOLIA_CHAIN_ID}`]
    });
  }
  return result.data;
}

export function createDoctorCommand(deps: DoctorDependencies = {}): Command {
  return new Command("doctor")
    .description("Diagnose KeeperHub, Agent, wallet, network, Gas, and simulation prerequisites")
    .addOption(new Option("--agent <agent>", "Agent integration to inspect").choices(["claude", "codex", "hermes", "all"]).default("all"))
    .option("--chain-id <id>", "Testnet chain ID", String(SEPOLIA_CHAIN_ID))
    .option("--json", "Print the stable JSON report", false)
    .option("--strict", "Treat warnings as failures", false)
    .option("--skip-simulation", "Skip the side-effect-free transfer simulation", false)
    .action(async (raw: { agent: DoctorAgent; chainId: string; json: boolean; strict: boolean; skipSimulation: boolean }) => {
      const options: DoctorOptions = { ...raw, chainId: parseChainId(raw.chainId) };
      const report = await runDoctor(options, deps);
      printDoctorReport(report, options.json);
      if (!report.ok) process.exitCode = EXIT_CODES.diagnosticFailure;
    });
}
