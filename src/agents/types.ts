import type { ProcessResult } from "../core/process.js";

export const AGENT_NAMES = ["claude", "codex", "hermes"] as const;

export type AgentName = (typeof AGENT_NAMES)[number];
export type AgentSelection = AgentName | "all";

export interface ProcessRunOptions {
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

export type ProcessRunner = (
  command: string,
  args: string[],
  options?: ProcessRunOptions
) => Promise<ProcessResult>;

export interface AgentDetection {
  available: boolean;
  executable: string | null;
  version: string | null;
  fallbackUsed: boolean;
  attempts: Array<{
    executable: string;
    exitCode: number | null;
    timedOut: boolean;
  }>;
}

export interface SetupCommandSpec {
  command: string;
  args: string[];
  display: string;
  purpose: string;
}

export type SetupStepStatus = "not-run" | "passed" | "failed" | "timed-out";

export interface SetupStepResult {
  command: string;
  purpose: string;
  status: SetupStepStatus;
  exitCode: number | null;
}

export interface SetupFailure {
  step: string;
  causes: string[];
  fixCommands: string[];
}

export type AgentSetupStatus = "preview" | "applied" | "unavailable" | "failed";

export interface AgentSetupResult {
  agent: AgentName;
  status: AgentSetupStatus;
  detection: AgentDetection;
  commands: string[];
  steps: SetupStepResult[];
  guidance: string[];
  failure: SetupFailure | null;
}

export interface SetupReport {
  schemaVersion: 1;
  ok: boolean;
  mode: "preview" | "apply";
  agents: AgentSetupResult[];
}
