import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { UsageError } from "../core/errors.js";
import type { ConfirmIO, ReleasePlan } from "./types.js";

export function confirmationPhrase(planDigest: string): string {
  return `CONFIRM ${planDigest.slice(0, 8)}`;
}

export function retryConfirmationPhrase(planDigest: string): string {
  return `CONFIRM RETRY ${planDigest.slice(0, 8)}`;
}

export interface FormalReleaseSummaryOptions {
  retry?: {
    idempotencyDigest: string;
    attemptCount: number;
    maxAttempts: number;
  };
}

export function formalReleaseSummary(
  plan: ReleasePlan,
  options: FormalReleaseSummaryOptions = {}
): string {
  const retry = options.retry;
  return [
    retry === undefined ? "KeeperHub formal release confirmation" : "KeeperHub formal safe-retry confirmation",
    `  Network: Ethereum Sepolia (chain ${plan.intent.chainId})`,
    `  Wallet type: ${plan.intent.walletType}`,
    `  Full sender: ${plan.intent.walletAddress}`,
    `  Full recipient: ${plan.intent.recipientAddress}`,
    `  Amount: ${plan.intent.amount} ETH (${plan.simulation.value} wei)`,
    `  Condition path: ${plan.intent.condition.path}`,
    `  Condition SHA-256: ${plan.intent.condition.sha256}`,
    `  Simulation status: ${plan.simulation.status}`,
    `  Simulation value: ${plan.simulation.value} wei`,
    `  Simulation Gas estimate: ${plan.simulation.gasEstimate}`,
    `  Simulation would revert: ${plan.simulation.wouldRevert}`,
    `  Intent digest: ${plan.intentDigest}`,
    `  Plan digest: ${plan.planDigest}`,
    `  Expires: ${plan.expiresAt}`,
    "  Preparation had zero on-chain side effects; it performed simulation only.",
    retry === undefined
      ? "  Any automatic retry uses the same persisted idempotency key."
      : [
        "  This retry reuses the same persisted idempotency key.",
        `  Existing idempotency digest: ${retry.idempotencyDigest}; attempts ${retry.attemptCount}/${retry.maxAttempts}.`
      ].join("\n")
  ].join("\n");
}

export function nodeConfirmIO(): ConfirmIO {
  return {
    isInputTTY: Boolean(stdin.isTTY),
    isOutputTTY: Boolean(stdout.isTTY),
    async question(prompt: string): Promise<string> {
      const terminal = createInterface({ input: stdin, output: stdout });
      try {
        return await terminal.question(prompt);
      } finally {
        terminal.close();
      }
    }
  };
}

export async function requestConfirmation(io: ConfirmIO, planDigest: string, summary = ""): Promise<boolean> {
  if (!io.isInputTTY || !io.isOutputTTY) {
    throw new UsageError("Real transaction confirmation requires an interactive terminal.", {
      step: "Confirm release execution",
      causes: ["stdin and stdout must both be TTYs."],
      fixCommands: ["node dist/cli.js release execute --help"]
    });
  }
  const phrase = confirmationPhrase(planDigest);
  const prefix = summary.length > 0 ? `${summary}\n\n` : "";
  const answer = await io.question(`${prefix}Type ${phrase} to authorize this exact request: `);
  return answer.trim() === phrase;
}

export async function requestRetryConfirmation(io: ConfirmIO, planDigest: string, summary = ""): Promise<boolean> {
  if (!io.isInputTTY || !io.isOutputTTY) {
    throw new UsageError("A cross-process transaction retry requires an interactive terminal.", {
      step: "Confirm safe release retry",
      causes: ["stdin and stdout must both be TTYs."],
      fixCommands: ["node dist/cli.js release retry --help"]
    });
  }
  const phrase = retryConfirmationPhrase(planDigest);
  const prefix = summary.length > 0 ? `${summary}\n\n` : "";
  const answer = await io.question(`${prefix}Type ${phrase} to reuse the existing idempotency key: `);
  return answer.trim() === phrase;
}
