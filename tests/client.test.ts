import { describe, expect, it, vi } from "vitest";
import { KeeperHubClient, KeeperHubHttpError } from "../src/keeperhub/client.js";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init.headers as Record<string, string> | undefined) }
  });
}

describe("KeeperHubClient", () => {
  it("accepts the verified protected /api/keys response shape", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer kh_fixture");
      return jsonResponse({ items: [], meta: {}, _links: {} });
    });
    const client = new KeeperHubClient({ apiKey: "kh_fixture", fetch: fetchMock });

    await expect(client.validateApiKey()).resolves.toMatchObject({ status: 200 });
  });

  it.each([null, {}, [], "", false])("rejects HTTP 200 auth payload %j", async (payload) => {
    const fetchMock = vi.fn(async () => jsonResponse(payload));
    const client = new KeeperHubClient({ apiKey: "kh_fixture", fetch: fetchMock });

    await expect(client.validateApiKey()).rejects.toThrow("documented shape");
  });

  it("parses the verified live chain shape without requiring a status field", async () => {
    const fetchMock = vi.fn(async () => jsonResponse([{
      id: "chain",
      chainId: 11_155_111,
      name: "Ethereum Sepolia",
      symbol: "ETH",
      isTestnet: true,
      isEnabled: true,
      explorerUrl: "https://sepolia.etherscan.io"
    }]));
    const client = new KeeperHubClient({ fetch: fetchMock });

    const chains = await client.getChains();
    expect(chains[0]?.chainId).toBe(11_155_111);
  });

  it("accepts the documented null explorerUrl chain field", async () => {
    const fetchMock = vi.fn(async () => jsonResponse([{
      chainId: 103,
      name: "Solana Devnet",
      explorerUrl: null,
      isTestnet: true,
      isEnabled: true
    }]));
    const client = new KeeperHubClient({ fetch: fetchMock });

    const chains = await client.getChains();
    expect(chains[0]?.explorerUrl).toBeUndefined();
  });

  it("always serializes simulate as the strict boolean true", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body.simulate).toBe(true);
      expect(typeof body.simulate).toBe("boolean");
      return jsonResponse({ success: true, status: "simulated", wouldRevert: false, gasEstimate: "21000" });
    });
    const client = new KeeperHubClient({ apiKey: "kh_fixture", fetch: fetchMock });

    await client.simulateTransfer({ chainId: 11_155_111, recipientAddress: "0xabc", amount: "0.000001" });
  });

  it("sends an idempotency key only on broadcast and never adds simulate", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      const headers = new Headers(init?.headers);
      expect(body).not.toHaveProperty("simulate");
      expect(headers.get("Idempotency-Key")).toBe("fixture-idempotency-key");
      return jsonResponse({ executionId: "execution-1", status: "completed" }, { status: 202 });
    });
    const client = new KeeperHubClient({ apiKey: "kh_fixture", fetch: fetchMock });

    const result = await client.executeTransfer(
      { chainId: 11_155_111, recipientAddress: "0xabc", amount: "0.000001" },
      "fixture-idempotency-key"
    );
    expect(result.data.executionId).toBe("execution-1");
  });

  it("retries transient simulation failures but never retries a broadcast", async () => {
    let simulationAttempts = 0;
    const simulationFetch = vi.fn(async () => {
      simulationAttempts += 1;
      return simulationAttempts < 3
        ? jsonResponse({ error: "temporary" }, { status: 503, headers: { "Retry-After": "0" } })
        : jsonResponse({ success: true, status: "simulated", wouldRevert: false });
    });
    const simulationClient = new KeeperHubClient({ apiKey: "kh_fixture", fetch: simulationFetch });
    await expect(simulationClient.simulateTransfer({
      chainId: 11_155_111,
      recipientAddress: "0xabc",
      amount: "0.000001"
    })).resolves.toMatchObject({ success: true });
    expect(simulationFetch).toHaveBeenCalledTimes(3);

    const broadcastFetch = vi.fn(async () => jsonResponse(
      { error: "temporary" },
      { status: 503, headers: { "Retry-After": "0" } }
    ));
    const broadcastClient = new KeeperHubClient({ apiKey: "kh_fixture", fetch: broadcastFetch });
    await expect(broadcastClient.executeTransfer({
      chainId: 11_155_111,
      recipientAddress: "0xabc",
      amount: "0.000001"
    }, "same-key")).rejects.toMatchObject({ status: 503 });
    expect(broadcastFetch).toHaveBeenCalledTimes(1);
  });

  it("fails locally before a protected request when KH_API_KEY is absent", async () => {
    const fetchMock = vi.fn();
    const client = new KeeperHubClient({ fetch: fetchMock });

    await expect(client.validateApiKey()).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redacts API keys and bearer values from HTTP error bodies", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      error: "bad Bearer kh_super_secret",
      apiKey: "kh_super_secret"
    }, { status: 401 }));
    const client = new KeeperHubClient({ apiKey: "kh_super_secret", fetch: fetchMock });

    const error = await client.validateApiKey().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(KeeperHubHttpError);
    expect(JSON.stringify((error as KeeperHubHttpError).body)).not.toContain("kh_super_secret");
    expect(JSON.stringify((error as KeeperHubHttpError).body)).not.toContain("Bearer");
  });

  it("rejects undocumented response shapes instead of guessing", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ address: "0xlegacy", balances: [] }));
    const client = new KeeperHubClient({ apiKey: "kh_fixture", fetch: fetchMock });

    await expect(client.getWalletBalances()).rejects.toThrow("documented shape");
  });
});
