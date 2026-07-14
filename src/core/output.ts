import type { DoctorCheck, DoctorReport, JsonValue } from "./types.js";
import { redact, redactString } from "./redact.js";

function evidenceLines(evidence: Record<string, JsonValue>): string[] {
  return Object.entries(evidence).map(([key, value]) => `    ${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
}

export function formatCheck(check: DoctorCheck): string {
  const lines = [`[${check.status.toUpperCase()}] ${check.step}: ${check.summary}`];
  if (check.causes.length > 0) lines.push(`  Cause: ${check.causes.join("; ")}`);
  if (check.fixCommands.length > 0) {
    lines.push("  Fix:", ...check.fixCommands.map((command) => `    ${command}`));
  }
  if (Object.keys(check.evidence).length > 0) lines.push("  Evidence:", ...evidenceLines(check.evidence));
  return redactString(lines.join("\n"));
}

export function printDoctorReport(report: DoctorReport, json: boolean): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(redact(report), null, 2)}\n`);
    return;
  }
  process.stdout.write(`${report.checks.map(formatCheck).join("\n\n")}\n`);
}

export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(redact(value), null, 2)}\n`);
}
