import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { UsageError } from "../core/errors.js";
import type { ConfirmIO } from "./types.js";

export function confirmationPhrase(intentDigest: string): string {
  return `CONFIRM ${intentDigest.slice(0, 8)}`;
}

export function retryConfirmationPhrase(intentDigest: string): string {
  return `CONFIRM RETRY ${intentDigest.slice(0, 8)}`;
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

export async function requestConfirmation(io: ConfirmIO, intentDigest: string, summary = ""): Promise<boolean> {
  if (!io.isInputTTY || !io.isOutputTTY) {
    throw new UsageError("Real transaction confirmation requires an interactive terminal.", {
      step: "Confirm release execution",
      causes: ["stdin and stdout must both be TTYs."],
      fixCommands: ["node dist/cli.js release execute --help"]
    });
  }
  const phrase = confirmationPhrase(intentDigest);
  const prefix = summary.length > 0 ? `${summary}\n\n` : "";
  const answer = await io.question(`${prefix}Type ${phrase} to authorize this exact request: `);
  return answer.trim() === phrase;
}

export async function requestRetryConfirmation(io: ConfirmIO, intentDigest: string, summary = ""): Promise<boolean> {
  if (!io.isInputTTY || !io.isOutputTTY) {
    throw new UsageError("A cross-process transaction retry requires an interactive terminal.", {
      step: "Confirm safe release retry",
      causes: ["stdin and stdout must both be TTYs."],
      fixCommands: ["node dist/cli.js release retry --help"]
    });
  }
  const phrase = retryConfirmationPhrase(intentDigest);
  const prefix = summary.length > 0 ? `${summary}\n\n` : "";
  const answer = await io.question(`${prefix}Type ${phrase} to reuse the existing idempotency key: `);
  return answer.trim() === phrase;
}
