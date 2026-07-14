import { EXIT_CODES } from "./constants.js";
import type { FailureDetails } from "./types.js";

export class AppError extends Error {
  readonly exitCode: number;
  readonly details: FailureDetails;

  constructor(message: string, details: FailureDetails, exitCode: number = EXIT_CODES.internal) {
    super(message);
    this.name = "AppError";
    this.details = details;
    this.exitCode = exitCode;
  }
}

export class UsageError extends AppError {
  constructor(message: string, details: FailureDetails) {
    super(message, details, EXIT_CODES.usage);
    this.name = "UsageError";
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
