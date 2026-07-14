import { describe, expect, it } from "vitest";
import { KeeperHubClient } from "../../src/keeperhub/client.js";
import { numericChainId } from "../../src/keeperhub/schemas.js";
import { probeKeeperHubMcp } from "../../src/mcp/probe.js";

const apiKey = process.env.KH_API_KEY?.trim() ?? "";
const hasLiveCredential = apiKey.startsWith("kh_");

async function guardedFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = input instanceof Request ? input.url : String(input);
  const method = init?.method ?? (input instanceof Request ? input.method : "GET");
  if (url.endsWith("/api/execute/transfer") && method.toUpperCase() === "POST") {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    if (body.simulate !== true || typeof body.simulate !== "boolean") {
      throw new Error("Integration safety guard blocked a non-simulation transfer request.");
    }
  }
  return await globalThis.fetch(input, init);
}

describe("KeeperHub read-only and simulation integration", () => {
  const client = new KeeperHubClient({ apiKey, fetch: guardedFetch, timeoutMs: 20_000 });

  it("requires an explicit organization API key instead of silently skipping", () => {
    expect(hasLiveCredential, "Set KH_API_KEY to run the live simulate-only integration suite.").toBe(true);
  });

  (hasLiveCredential ? it : it.skip)("verifies REST auth, live Sepolia, wallet, billing, MCP and a strict dry-run", async () => {
    await expect(client.validateApiKey()).resolves.toMatchObject({ status: 200 });

    const chains = await client.getChains();
    const sepolia = chains.find((chain) => numericChainId(chain.chainId) === 11_155_111);
    expect(sepolia).toMatchObject({ isEnabled: true, isTestnet: true });

    const wallet = await client.getWalletBalances();
    expect(wallet.walletAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(wallet.balances.some((balance) => numericChainId(balance.chainId) === 11_155_111)).toBe(true);

    await expect(client.getBillingSubscription()).resolves.toHaveProperty("subscription");

    const mcp = await probeKeeperHubMcp(apiKey, { timeoutMs: 30_000 });
    expect(mcp).toMatchObject({ authenticated: true, toolVerified: "tools_documentation" });

    const simulation = await client.simulateTransfer({
      chainId: 11_155_111,
      recipientAddress: wallet.walletAddress,
      amount: "0.000001"
    });
    expect(simulation).toMatchObject({ success: true, status: "simulated", wouldRevert: false });
    expect(simulation.from?.toLowerCase()).toBe(wallet.walletAddress.toLowerCase());
    expect(simulation.to?.toLowerCase()).toBe(wallet.walletAddress.toLowerCase());
    expect(simulation.value).toBe("1000000000000");
    expect(simulation.gasEstimate).toMatch(/^\d+$/);
    expect(simulation).not.toHaveProperty("executionId");
    expect(simulation).not.toHaveProperty("transactionHash");
  }, 90_000);
});
