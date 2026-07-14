import { Command, Option } from "commander";
import { EXIT_CODES } from "../core/constants.js";
import { printJson } from "../core/output.js";
import { redactString } from "../core/redact.js";
import { runSetup } from "../agents/setup.js";
import type { AgentSelection, SetupReport } from "../agents/types.js";
import type { SetupDependencies } from "../agents/setup.js";

export function createSetupCommand(dependencies: SetupDependencies = {}): Command {
  return new Command("setup")
    .description("Preview or apply official KeeperHub agent onboarding commands")
    .addOption(
      new Option("--agent <agent>", "agent to configure")
        .choices(["claude", "codex", "hermes", "all"])
        .makeOptionMandatory()
    )
    .option("--apply", "invoke the official agent CLIs (preview only by default)")
    .option("--json", "print a machine-readable report")
    .action(async (options: { agent: AgentSelection; apply?: boolean; json?: boolean }) => {
      const report = await runSetup(
        { agent: options.agent, apply: options.apply === true },
        dependencies
      );
      if (options.json === true) printJson(report);
      else process.stdout.write(`${formatSetupReport(report)}\n`);
      if (!report.ok) process.exitCode = EXIT_CODES.diagnosticFailure;
    });
}

export function formatSetupReport(report: SetupReport): string {
  const lines = [
    `KeeperHub agent setup (${report.mode === "apply" ? "APPLY" : "PREVIEW"})`
  ];

  for (const result of report.agents) {
    lines.push("", `[${result.status.toUpperCase()}] ${result.agent}`);
    lines.push(
      `  CLI: ${result.detection.executable ?? "not found"}`,
      `  Version: ${result.detection.version ?? "unknown"}`
    );
    if (result.detection.fallbackUsed) lines.push("  Detection: using macOS Codex app fallback");
    lines.push("  Commands:");
    for (const step of result.steps) {
      const marker = step.status === "not-run" ? "preview" : step.status;
      lines.push(`    [${marker}] ${step.command}`);
    }
    if (result.failure !== null) {
      lines.push(`  Failed step: ${result.failure.step}`);
      lines.push(`  Cause: ${result.failure.causes.join("; ")}`);
      lines.push("  Fix:", ...result.failure.fixCommands.map((command) => `    ${command}`));
    }
    lines.push("  Next:", ...result.guidance.map((item) => `    ${item}`));
  }

  return redactString(lines.join("\n"));
}
