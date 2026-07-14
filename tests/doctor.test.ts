import { describe, expect, it, vi } from "vitest";
import { runDoctor, type DoctorDependencies, type DoctorOptions } from "../src/commands/doctor.js";
import type { ProcessResult } from "../src/core/process.js";
import type { BillingSubscription, KeeperHubChain, TransferSimulation, WalletBalances } from "../src/keeperhub/schemas.js";
import { McpProbeError } from "../src/mcp/probe.js";

const options: DoctorOptions = {
  agent: "all",
  chainId: 11_155_111,
  json: true,
  strict: false,
  skipSimulation: false
};

function processResult(command: string, stdout = "ok", exitCode = 0): ProcessResult {
  return { command, stdout, stderr: "", exitCode, timedOut: false };
}

function runMock(command: string, args: string[]): Promise<ProcessResult> {
  if (command === "npm" && args[0] === "--version") return Promise.resolve(processResult(command, "10.9.8\n"));
  if (command === "npm" && args[0] === "ls") return Promise.resolve(processResult(command, JSON.stringify({
    dependencies: {
      "@modelcontextprotocol/sdk": { version: "1.29.0" },
      "@types/node": { version: "22.15.34" },
      commander: { version: "15.0.0" },
      tsx: { version: "4.23.1" },
      typescript: { version: "7.0.2" },
      vitest: { version: "4.1.10" },
      zod: { version: "4.4.3" }
    }
  })));
  if (args[0] === "--version") return Promise.resolve(processResult(command, `${command} 1.0.0\n`));
  if (command === "kh") return Promise.resolve(processResult(command, "kh version 0.10.0\n"));
  if (command === "hermes" && args[0] === "plugins" && args[1] === "list") {
    return Promise.resolve(processResult(command, JSON.stringify([{ name: "keeperhub", status: "enabled" }])));
  }
  if (args.includes("get") || args.includes("list")) return Promise.resolve(processResult(command, "keeperhub connected\n"));
  return Promise.resolve(processResult(command, "ok\n"));
}

const chain: KeeperHubChain = {
  chainId: 11_155_111,
  name: "Ethereum Sepolia",
  symbol: "ETH",
  isTestnet: true,
  isEnabled: true,
  explorerUrl: "https://sepolia.etherscan.io"
};

const wallet: WalletBalances = {
  walletAddress: "0x9b5f9ac9bd9e178962a50582f2b42b5523fcd042",
  balances: [{
    chainId: 11_155_111,
    chainName: "Ethereum Sepolia",
    symbol: "ETH",
    isTestnet: true,
    nativeBalance: "0.050000",
    nativeBalanceRaw: "50000000000000000"
  }]
};

const billing: BillingSubscription = {
  subscription: { plan: "free", status: "active" },
  limits: { maxExecutionsPerMonth: 5_000 }
};

const simulation: TransferSimulation = {
  success: true,
  status: "simulated",
  from: wallet.walletAddress,
  to: wallet.walletAddress,
  value: "1000000000000",
  gasEstimate: "21000",
  simulatedReturnValue: null,
  wouldRevert: false
};

function dependencies(overrides: Partial<DoctorDependencies> = {}): DoctorDependencies {
  const client = {
    getChains: vi.fn(async () => [chain]),
    validateApiKey: vi.fn(async () => ({ status: 200 })),
    getWalletBalances: vi.fn(async () => wallet),
    getBillingSubscription: vi.fn(async () => billing),
    simulateTransfer: vi.fn(async () => simulation)
  };
  return {
    cwd: process.cwd(),
    platform: "linux",
    apiKey: "kh_fixture_not_a_secret",
    run: runMock,
    client,
    mcpProbe: vi.fn(async () => ({
      reachable: true,
      authenticated: true,
      toolCount: 30,
      toolVerified: "tools_documentation" as const,
      serverName: "keeperhub",
      serverVersion: "1"
    })),
    ...overrides
  };
}

describe("runDoctor", () => {
  it("passes required checks while honestly warning about unknown wallet type and absent spend cap", async () => {
    const report = await runDoctor(options, dependencies());

    expect(report.ok).toBe(true);
    expect(report.checks.find((entry) => entry.id === "keeperhub.auth")?.status).toBe("pass");
    const mcpEvidence = report.checks.find((entry) => entry.id === "keeperhub.mcp")?.evidence;
    expect(mcpEvidence?.authenticated).toBe(true);
    expect(mcpEvidence?.directProbe).toBe(true);
    expect(mcpEvidence).not.toHaveProperty("configured");
    expect(report.checks.find((entry) => entry.id === "keeperhub.wallet_type")?.status).toBe("warn");
    expect(report.checks.find((entry) => entry.id === "keeperhub.spend_cap")?.status).toBe("warn");
    expect(report.checks.find((entry) => entry.id === "keeperhub.simulation")?.evidence.simulate).toBe(true);
  });

  it("does not call protected APIs when KH_API_KEY is absent", async () => {
    const client = {
      getChains: vi.fn(async () => [chain]),
      validateApiKey: vi.fn(),
      getWalletBalances: vi.fn(),
      getBillingSubscription: vi.fn(),
      simulateTransfer: vi.fn()
    };
    const report = await runDoctor(options, dependencies({ apiKey: null, client }));

    expect(report.ok).toBe(false);
    expect(report.checks.find((entry) => entry.id === "env.kh_api_key")?.status).toBe("fail");
    expect(report.checks.find((entry) => entry.id === "keeperhub.auth")?.status).toBe("skip");
    expect(client.validateApiKey).not.toHaveBeenCalled();
    expect(client.simulateTransfer).not.toHaveBeenCalled();
  });

  it("accepts string chain IDs from compatible API fixtures", async () => {
    const stringChain = { ...chain, chainId: "11155111" };
    const stringWallet = { ...wallet, balances: [{ ...wallet.balances[0]!, chainId: "11155111" }] };
    const base = dependencies();
    const client = {
      getChains: vi.fn(async () => [stringChain]),
      validateApiKey: vi.fn(async () => ({ status: 200 })),
      getWalletBalances: vi.fn(async () => stringWallet),
      getBillingSubscription: vi.fn(async () => billing),
      simulateTransfer: vi.fn(async () => simulation)
    };

    const report = await runDoctor(options, { ...base, client });
    expect(report.checks.find((entry) => entry.id === "keeperhub.chain")?.status).toBe("pass");
    expect(report.checks.find((entry) => entry.id === "keeperhub.gas")?.status).toBe("pass");
  });

  it("fails when simulation would revert", async () => {
    const base = dependencies();
    const client = base.client!;
    vi.mocked(client.simulateTransfer).mockResolvedValue({
      success: false,
      status: "simulated",
      wouldRevert: true,
      error: "missing revert data / CALL_EXCEPTION"
    });

    const report = await runDoctor(options, base);
    expect(report.ok).toBe(false);
    expect(report.checks.find((entry) => entry.id === "keeperhub.simulation")?.status).toBe("fail");
    expect(report.checks.find((entry) => entry.id === "keeperhub.simulation")?.causes.join(" ")).toContain("CALL_EXCEPTION");
  });

  it("fails a reproducible insufficient-balance simulation without broadcasting", async () => {
    const base = dependencies();
    const client = base.client!;
    vi.mocked(client.simulateTransfer).mockResolvedValue({
      success: false,
      status: "simulated",
      wouldRevert: true,
      error: "insufficient funds for intrinsic transaction cost"
    });

    const report = await runDoctor(options, base);
    const check = report.checks.find((entry) => entry.id === "keeperhub.simulation");
    expect(report.ok).toBe(false);
    expect(check?.status).toBe("fail");
    expect(check?.causes.join(" ")).toContain("insufficient funds");
    expect(client.simulateTransfer).toHaveBeenCalledTimes(1);
  });

  it("rejects every omitted field required to prove a successful simulation", async () => {
    for (const field of ["from", "to", "value", "gasEstimate"] as const) {
      const incomplete: TransferSimulation = { ...simulation };
      delete incomplete[field];
      const base = dependencies();
      vi.mocked(base.client!.simulateTransfer).mockResolvedValue(incomplete);

      const report = await runDoctor(options, base);
      const simulationCheck = report.checks.find((entry) => entry.id === "keeperhub.simulation");
      expect(simulationCheck?.status, field).toBe("fail");
      expect(simulationCheck?.causes.join(" "), field).toContain(`omitted ${field}`);
      const evidenceField = field === "value" ? "valueWei" : field;
      expect(simulationCheck?.evidence[evidenceField], field).toBeNull();
    }
  });

  it("rejects successful simulation evidence that does not match the exact self-transfer", async () => {
    const mismatches: Array<[Partial<TransferSimulation>, string]> = [
      [{ status: "completed" }, "status is not simulated"],
      [{ from: "0x1111111111111111111111111111111111111111" }, "from does not match"],
      [{ to: "0x2222222222222222222222222222222222222222" }, "to does not match"],
      [{ value: "1" }, "value does not match"],
      [{ gasEstimate: "0" }, "gasEstimate is not a positive"]
    ];
    for (const [override, expectedCause] of mismatches) {
      const base = dependencies();
      vi.mocked(base.client!.simulateTransfer).mockResolvedValue({ ...simulation, ...override });
      const report = await runDoctor(options, base);
      const simulationCheck = report.checks.find((entry) => entry.id === "keeperhub.simulation");
      expect(simulationCheck?.status, expectedCause).toBe("fail");
      expect(simulationCheck?.causes.join(" "), expectedCause).toContain(expectedCause);
    }
  });

  it("only considers an enabled KeeperHub Hermes plugin configured", async () => {
    const disabledRun = async (command: string, args: string[]): Promise<ProcessResult> => {
      if (command === "hermes" && args[0] === "plugins" && args[1] === "list") {
        return processResult(command, JSON.stringify([{ name: "keeperhub", status: "not enabled" }]));
      }
      return await runMock(command, args);
    };
    const report = await runDoctor(
      { ...options, agent: "hermes" },
      dependencies({ run: disabledRun })
    );

    const agentCheck = report.checks.find((entry) => entry.id === "agent.hermes");
    expect(agentCheck?.status).toBe("warn");
    expect(agentCheck?.evidence.configured).toBe(false);
  });

  it("preserves the MCP failure stage without claiming Agent configuration", async () => {
    const report = await runDoctor(options, dependencies({
      mcpProbe: vi.fn(async () => {
        throw new McpProbeError("tool failed", "call-tool", true, true);
      })
    }));

    const mcpCheck = report.checks.find((entry) => entry.id === "keeperhub.mcp");
    expect(mcpCheck?.status).toBe("fail");
    expect(mcpCheck?.evidence).toMatchObject({
      directProbe: true,
      stage: "call-tool",
      reachable: true,
      authenticated: true
    });
    expect(mcpCheck?.evidence).not.toHaveProperty("configured");
  });

  it("emits a Windows-safe browser command instead of xdg-open", async () => {
    const report = await runDoctor(options, dependencies({ apiKey: null, platform: "win32" }));
    const keyCheck = report.checks.find((entry) => entry.id === "env.kh_api_key");
    expect(keyCheck?.fixCommands.join(" ")).toContain("powershell -NoProfile");
    expect(keyCheck?.fixCommands.join(" ")).not.toContain("xdg-open");
  });

  it("makes warnings blocking in strict mode", async () => {
    const report = await runDoctor({ ...options, strict: true }, dependencies());
    expect(report.ok).toBe(false);
  });
});
