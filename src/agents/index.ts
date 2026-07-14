export { CODEX_APP_EXECUTABLE, formatShellCommand, getAgentDefinition } from "./catalog.js";
export { agentInstallCommands, detectAgent, runSetup } from "./setup.js";
export type { SetupDependencies, SetupOptions } from "./setup.js";
export { AGENT_NAMES } from "./types.js";
export type {
  AgentDetection,
  AgentName,
  AgentSelection,
  AgentSetupResult,
  ProcessRunner,
  SetupReport,
  SetupStepResult
} from "./types.js";
