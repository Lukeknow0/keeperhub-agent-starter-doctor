#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { Command, CommanderError } from "commander";
import { createSetupCommand } from "./commands/setup.js";
import { createDoctorCommand } from "./commands/doctor.js";
import { createAuditCommand, createReleaseClientAdapter, createReleaseCommand } from "./commands/release.js";
import { loadLocalEnv, getApiKey } from "./core/config.js";
import { EXIT_CODES } from "./core/constants.js";
import { AppError, errorMessage } from "./core/errors.js";
import { redactString } from "./core/redact.js";
import { KeeperHubClient, KeeperHubHttpError } from "./keeperhub/client.js";

export interface ProgramDependencies {
  client?: KeeperHubClient;
  workspace?: string;
}

export function createProgram(dependencies: ProgramDependencies = {}): Command {
  const client = dependencies.client ?? new KeeperHubClient({ apiKey: getApiKey() });
  const program = new Command()
    .name("keeperhub-starter")
    .description("KeeperHub Agent Starter + Doctor")
    .version("0.1.0")
    .showHelpAfterError()
    .exitOverride()
    .configureOutput({
      writeErr: (value) => process.stderr.write(redactString(value)),
      outputError: (value, write) => write(redactString(value))
    });

  program.addCommand(createSetupCommand());
  program.addCommand(createDoctorCommand());
  program.addCommand(createReleaseCommand({
    client: createReleaseClientAdapter(client),
    workspace: dependencies.workspace ?? process.cwd()
  }));
  program.addCommand(createAuditCommand({ workspace: dependencies.workspace ?? process.cwd() }));
  return program;
}

function printStructuredError(error: AppError): void {
  const causes = error.details.causes && error.details.causes.length > 0
    ? error.details.causes
    : ["The requested operation did not satisfy a required validation or safety check."];
  const fixCommands = error.details.fixCommands && error.details.fixCommands.length > 0
    ? error.details.fixCommands
    : ["node dist/cli.js --help"];
  const evidence = error.details.evidence && Object.keys(error.details.evidence).length > 0
    ? error.details.evidence
    : { exitCode: error.exitCode };
  const lines = [
    `Step: ${error.details.step}`,
    `Failed: ${error.message}`,
    `Cause: ${causes.join("; ")}`,
    "Fix:",
    ...fixCommands.map((command) => `  ${command}`),
    `Evidence: ${JSON.stringify(evidence)}`
  ];
  process.stderr.write(`${redactString(lines.join("\n"))}\n`);
}

export async function main(argv = process.argv): Promise<number> {
  try {
    loadLocalEnv();
    await createProgram().parseAsync(argv);
    return typeof process.exitCode === "number" ? process.exitCode : EXIT_CODES.success;
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.code === "commander.helpDisplayed" || error.code === "commander.version") return EXIT_CODES.success;
      return EXIT_CODES.usage;
    }
    if (error instanceof AppError) {
      printStructuredError(error);
      return error.exitCode;
    }
    if (error instanceof KeeperHubHttpError) {
      process.stderr.write(`${redactString([
        "Step: KeeperHub request",
        `Failed: ${error.message}`,
        "Cause: KeeperHub rejected the request, was unreachable, or returned an unsafe response.",
        "Fix:",
        "  node dist/cli.js doctor --json",
        `Evidence: ${JSON.stringify({ httpStatus: error.status, code: error.code ?? null })}`
      ].join("\n"))}\n`);
      return EXIT_CODES.diagnosticFailure;
    }
    process.stderr.write(`${redactString([
      "Step: Internal execution",
      `Failed: ${errorMessage(error)}`,
      "Cause: An unexpected local error prevented safe completion.",
      "Fix:",
      "  npm run verify",
      `Evidence: ${JSON.stringify({ exitCode: EXIT_CODES.internal })}`
    ].join("\n"))}\n`);
    return EXIT_CODES.internal;
  }
}

const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  process.exitCode = await main();
}
