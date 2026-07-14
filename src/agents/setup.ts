import { runProcess } from "../core/process.js";
import type { ProcessResult } from "../core/process.js";
import { UsageError } from "../core/errors.js";
import { redactString } from "../core/redact.js";
import { getAgentDefinition } from "./catalog.js";
import { AGENT_NAMES } from "./types.js";
import type {
  AgentDetection,
  AgentName,
  AgentSelection,
  AgentSetupResult,
  ProcessRunner,
  SetupCommandSpec,
  SetupFailure,
  SetupReport,
  SetupStepResult
} from "./types.js";

const DEFAULT_DETECTION_TIMEOUT_MS = 10_000;
const DEFAULT_APPLY_TIMEOUT_MS = 315_000;

export interface SetupOptions {
  agent: AgentSelection;
  apply?: boolean;
}

export interface SetupDependencies {
  runner?: ProcessRunner;
  platform?: NodeJS.Platform;
  detectionTimeoutMs?: number;
  applyTimeoutMs?: number;
}

interface ResolvedDependencies {
  runner: ProcessRunner;
  platform: NodeJS.Platform;
  detectionTimeoutMs: number;
  applyTimeoutMs: number;
}

export async function runSetup(
  options: SetupOptions,
  dependencies: SetupDependencies = {}
): Promise<SetupReport> {
  assertAgentSelection(options.agent);
  const deps = resolveDependencies(dependencies);
  const agents = options.agent === "all" ? [...AGENT_NAMES] : [options.agent];
  const results: AgentSetupResult[] = [];

  for (const agent of agents) {
    results.push(await setupAgent(agent, options.apply === true, deps));
  }

  return {
    schemaVersion: 1,
    ok: results.every((result) => result.status === "preview" || result.status === "applied"),
    mode: options.apply === true ? "apply" : "preview",
    agents: results
  };
}

export async function detectAgent(
  agent: AgentName,
  dependencies: SetupDependencies = {}
): Promise<AgentDetection> {
  const deps = resolveDependencies(dependencies);
  const definition = getAgentDefinition(agent);
  const candidates = [
    definition.defaultExecutable,
    ...definition.fallbackExecutables(deps.platform)
  ];
  const attempts: AgentDetection["attempts"] = [];

  for (const [index, executable] of candidates.entries()) {
    const result = await safelyRun(
      deps.runner,
      executable,
      definition.versionArgs,
      deps.detectionTimeoutMs
    );
    attempts.push({
      executable,
      exitCode: result.exitCode,
      timedOut: result.timedOut
    });
    if (!result.timedOut && result.exitCode === 0) {
      return {
        available: true,
        executable,
        version: extractVersion(result),
        fallbackUsed: index > 0,
        attempts
      };
    }
  }

  return {
    available: false,
    executable: null,
    version: null,
    fallbackUsed: false,
    attempts
  };
}

async function setupAgent(
  agent: AgentName,
  apply: boolean,
  deps: ResolvedDependencies
): Promise<AgentSetupResult> {
  const definition = getAgentDefinition(agent);
  const detection = await detectAgent(agent, deps);
  const executable = detection.executable ?? definition.defaultExecutable;
  const commands = definition.setupCommands(executable);
  const initialSteps = commands.map(notRunStep);

  if (!detection.available) {
    return {
      agent,
      status: "unavailable",
      detection,
      commands: commands.map((item) => item.display),
      steps: initialSteps,
      guidance: definition.guidance,
      failure: {
        step: `Detect ${agent} CLI`,
        causes: [detectionCause(detection)],
        fixCommands: agentInstallCommands(agent, deps.platform)
      }
    };
  }

  if (!apply) {
    return {
      agent,
      status: "preview",
      detection,
      commands: commands.map((item) => item.display),
      steps: initialSteps,
      guidance: definition.guidance,
      failure: null
    };
  }

  const steps: SetupStepResult[] = [];
  let failure: SetupFailure | null = null;

  for (const [index, command] of commands.entries()) {
    const result = await safelyRun(
      deps.runner,
      command.command,
      command.args,
      deps.applyTimeoutMs
    );
    const step = resultToStep(command, result);
    steps.push(step);
    if (step.status !== "passed") {
      failure = commandFailure(command, result);
      for (const pending of commands.slice(index + 1)) steps.push(notRunStep(pending));
      break;
    }
  }

  return {
    agent,
    status: failure === null ? "applied" : "failed",
    detection,
    commands: commands.map((item) => item.display),
    steps,
    guidance: definition.guidance,
    failure
  };
}

function resolveDependencies(dependencies: SetupDependencies): ResolvedDependencies {
  return {
    runner: dependencies.runner ?? runProcess,
    platform: dependencies.platform ?? process.platform,
    detectionTimeoutMs: positiveTimeout(
      dependencies.detectionTimeoutMs,
      DEFAULT_DETECTION_TIMEOUT_MS,
      "detectionTimeoutMs"
    ),
    applyTimeoutMs: positiveTimeout(
      dependencies.applyTimeoutMs,
      DEFAULT_APPLY_TIMEOUT_MS,
      "applyTimeoutMs"
    )
  };
}

function positiveTimeout(value: number | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new UsageError(`${name} must be a positive integer`, {
      step: "Validate setup timeout",
      causes: [`Received invalid ${name}`],
      fixCommands: []
    });
  }
  return value;
}

function assertAgentSelection(value: string): asserts value is AgentSelection {
  if (value === "all" || AGENT_NAMES.some((agent) => agent === value)) return;
  throw new UsageError(`Unsupported agent: ${value}`, {
    step: "Validate --agent",
    causes: ["Agent must be claude, codex, hermes, or all"],
    fixCommands: ["node dist/cli.js setup --agent all"]
  });
}

async function safelyRun(
  runner: ProcessRunner,
  command: string,
  args: string[],
  timeoutMs: number
): Promise<ProcessResult> {
  try {
    return await runner(command, args, { timeoutMs });
  } catch {
    return {
      command,
      exitCode: null,
      stdout: "",
      stderr: "Process runner failed",
      timedOut: false
    };
  }
}

function extractVersion(result: ProcessResult): string | null {
  const firstLine = `${result.stdout}\n${result.stderr}`
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  return firstLine === undefined ? null : redactString(firstLine).slice(0, 200);
}

function notRunStep(command: SetupCommandSpec): SetupStepResult {
  return {
    command: command.display,
    purpose: command.purpose,
    status: "not-run",
    exitCode: null
  };
}

function resultToStep(command: SetupCommandSpec, result: ProcessResult): SetupStepResult {
  return {
    command: command.display,
    purpose: command.purpose,
    status: result.timedOut ? "timed-out" : result.exitCode === 0 ? "passed" : "failed",
    exitCode: result.exitCode
  };
}

function commandFailure(command: SetupCommandSpec, result: ProcessResult): SetupFailure {
  const cause = result.timedOut
    ? "The official CLI did not finish before the setup timeout"
    : result.exitCode === null
      ? "The official CLI could not be started"
      : `The official CLI exited with code ${result.exitCode}`;
  return {
    step: command.purpose,
    causes: [cause],
    fixCommands: [command.display]
  };
}

function detectionCause(detection: AgentDetection): string {
  if (detection.attempts.some((attempt) => attempt.timedOut)) {
    return "The version check timed out";
  }
  return "No working supported CLI executable was found";
}

export function agentInstallCommands(agent: AgentName, platform: NodeJS.Platform): string[] {
  switch (agent) {
    case "claude":
      return platform === "win32"
        ? ["powershell -NoProfile -Command \"irm https://claude.ai/install.ps1 | iex\""]
        : ["curl -fsSL https://claude.ai/install.sh | bash"];
    case "codex":
      return ["npm install -g @openai/codex"];
    case "hermes":
      return platform === "win32"
        ? ["powershell -NoProfile -Command \"iex (irm https://hermes-agent.nousresearch.com/install.ps1)\""]
        : ["curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash"];
  }
}
