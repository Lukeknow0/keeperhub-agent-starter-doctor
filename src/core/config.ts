import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { AppError } from "./errors.js";
import { EXIT_CODES } from "./constants.js";

export function loadLocalEnv(cwd = process.cwd()): void {
  const path = resolve(cwd, ".env");
  if (!existsSync(path)) return;

  const mode = statSync(path).mode & 0o777;
  if ((mode & 0o077) !== 0) {
    throw new AppError("Refusing to load an overly permissive .env file.", {
      step: "Load local environment",
      causes: [`${path} has mode ${mode.toString(8)}`],
      fixCommands: ["chmod 600 .env"]
    }, EXIT_CODES.diagnosticFailure);
  }
  process.loadEnvFile(path);
}

export function getApiKey(): string | null {
  const value = process.env.KH_API_KEY?.trim();
  return value && value.length > 0 ? value : null;
}

export function hasValidApiKeyShape(value: string | null): boolean {
  return value !== null && value.startsWith("kh_") && value.length > 3;
}
