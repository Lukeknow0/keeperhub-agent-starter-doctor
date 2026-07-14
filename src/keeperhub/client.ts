import { z } from "zod";
import { KEEPERHUB_BASE_URL } from "../core/constants.js";
import { redact } from "../core/redact.js";
import {
  apiKeysSchema,
  billingSchema,
  chainsSchema,
  executionStatusSchema,
  simulationSchema,
  transferAcceptedSchema,
  walletBalancesSchema,
  type ApiKeysResponse,
  type BillingSubscription,
  type ExecutionStatus,
  type KeeperHubChain,
  type TransferAccepted,
  type TransferSimulation,
  type WalletBalances
} from "./schemas.js";

export interface TransferIntentRequest {
  chainId: number;
  recipientAddress: string;
  amount: string;
  tokenAddress?: string;
}

export interface HttpResult<T> {
  data: T;
  status: number;
  headers: Headers;
}

export class KeeperHubHttpError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly headers: Headers;
  readonly code: string | undefined;
  readonly retryAfterMs: number | undefined;

  constructor(status: number, message: string, body: unknown, headers: Headers) {
    super(message);
    this.name = "KeeperHubHttpError";
    this.status = status;
    this.body = redact(body);
    this.headers = headers;
    this.code = typeof body === "object" && body !== null && "code" in body && typeof (body as { code: unknown }).code === "string"
      ? (body as { code: string }).code
      : undefined;
    const retryAfter = headers.get("Retry-After");
    const retrySeconds = retryAfter === null ? Number.NaN : Number(retryAfter);
    this.retryAfterMs = Number.isFinite(retrySeconds) && retrySeconds >= 0 ? retrySeconds * 1_000 : undefined;
  }
}

export interface KeeperHubClientOptions {
  apiKey?: string | null;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

export class KeeperHubClient {
  readonly baseUrl: string;
  private readonly apiKey: string | null;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly timeoutMs: number;

  constructor(options: KeeperHubClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? KEEPERHUB_BASE_URL).replace(/\/$/, "");
    this.apiKey = options.apiKey ?? null;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async getChains(): Promise<KeeperHubChain[]> {
    return (await this.request("/api/chains", { schema: chainsSchema, authenticated: false, safeToRetry: true })).data;
  }

  async validateApiKey(): Promise<HttpResult<ApiKeysResponse>> {
    return await this.request("/api/keys", { schema: apiKeysSchema, authenticated: true, safeToRetry: true });
  }

  async getWalletBalances(): Promise<WalletBalances> {
    return (await this.request("/api/user/wallet/balances", {
      schema: walletBalancesSchema,
      authenticated: true,
      safeToRetry: true
    })).data;
  }

  async getBillingSubscription(): Promise<BillingSubscription> {
    return (await this.request("/api/billing/subscription", {
      schema: billingSchema,
      authenticated: true,
      safeToRetry: true
    })).data;
  }

  async simulateTransfer(intent: TransferIntentRequest): Promise<TransferSimulation> {
    const body = { ...intent, simulate: true as const };
    return (await this.request("/api/execute/transfer", {
      method: "POST",
      body,
      schema: simulationSchema,
      authenticated: true,
      safeToRetry: true
    })).data;
  }

  async executeTransfer(intent: TransferIntentRequest, idempotencyKey: string): Promise<HttpResult<TransferAccepted>> {
    return await this.request("/api/execute/transfer", {
      method: "POST",
      body: intent,
      schema: transferAcceptedSchema,
      authenticated: true,
      headers: { "Idempotency-Key": idempotencyKey }
    });
  }

  async getExecutionStatus(executionId: string): Promise<HttpResult<ExecutionStatus>> {
    return await this.request(`/api/execute/${encodeURIComponent(executionId)}/status`, {
      schema: executionStatusSchema,
      authenticated: true,
      safeToRetry: true
    });
  }

  private async request<T>(
    path: string,
    options: {
      method?: "GET" | "POST";
      body?: unknown;
      schema: z.ZodType<T>;
      authenticated: boolean;
      headers?: Record<string, string>;
      safeToRetry?: boolean;
    }
  ): Promise<HttpResult<T>> {
    if (options.authenticated && !this.apiKey) {
      throw new KeeperHubHttpError(401, "KH_API_KEY is required for this request.", null, new Headers());
    }

    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    if (options.body !== undefined) headers.set("Content-Type", "application/json");
    if (options.authenticated && this.apiKey) headers.set("Authorization", `Bearer ${this.apiKey}`);

    const maxAttempts = options.safeToRetry === true ? 3 : 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetchImpl(`${this.baseUrl}${path}`, {
          method: options.method ?? "GET",
          headers,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: AbortSignal.timeout(this.timeoutMs)
        });
      } catch (error) {
        if (attempt < maxAttempts) {
          await delay(250 * 2 ** (attempt - 1));
          continue;
        }
        const message = error instanceof Error ? error.message : String(error);
        throw new KeeperHubHttpError(0, `KeeperHub request failed: ${message}`, null, new Headers());
      }

      const text = await response.text();
      let payload: unknown = null;
      if (text.length > 0) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = { error: "KeeperHub returned a non-JSON response." };
        }
      }

      if (!response.ok) {
        const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        if (retryable && attempt < maxAttempts) {
          const retryAfter = Number(response.headers.get("Retry-After"));
          const waitMs = Number.isFinite(retryAfter) && retryAfter >= 0
            ? Math.min(retryAfter * 1_000, 30_000)
            : 250 * 2 ** (attempt - 1);
          await delay(waitMs);
          continue;
        }
        const message = typeof payload === "object" && payload !== null && "error" in payload
          ? String((payload as { error: unknown }).error)
          : `KeeperHub returned HTTP ${response.status}.`;
        throw new KeeperHubHttpError(response.status, message, payload, response.headers);
      }

      const parsed = options.schema.safeParse(payload);
      if (!parsed.success) {
        throw new KeeperHubHttpError(
          response.status,
          "KeeperHub response did not match the documented shape.",
          { issues: parsed.error.issues },
          response.headers
        );
      }
      return { data: parsed.data, status: response.status, headers: response.headers };
    }
    throw new KeeperHubHttpError(0, "KeeperHub request exhausted its safe retry budget.", null, new Headers());
  }
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}
