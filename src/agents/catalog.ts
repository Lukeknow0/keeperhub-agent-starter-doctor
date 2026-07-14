import { KEEPERHUB_MCP_URL } from "../core/constants.js";
import type { AgentName, SetupCommandSpec } from "./types.js";

export const CODEX_APP_EXECUTABLE = "/Applications/ChatGPT.app/Contents/Resources/codex";

export interface AgentDefinition {
  name: AgentName;
  defaultExecutable: string;
  versionArgs: string[];
  fallbackExecutables(platform: NodeJS.Platform): string[];
  setupCommands(executable: string): SetupCommandSpec[];
  guidance: string[];
}

const definitions: Record<AgentName, AgentDefinition> = {
  claude: {
    name: "claude",
    defaultExecutable: "claude",
    versionArgs: ["--version"],
    fallbackExecutables: () => [],
    setupCommands: (executable) => [
      command(
        executable,
        ["mcp", "add", "--transport", "http", "keeperhub", KEEPERHUB_MCP_URL],
        "Add the official KeeperHub hosted MCP server"
      )
    ],
    guidance: [
      "Open Claude Code, run /mcp, and complete the KeeperHub browser sign-in.",
      "Verify the connection with an authenticated read-only KeeperHub tool call."
    ]
  },
  codex: {
    name: "codex",
    defaultExecutable: "codex",
    versionArgs: ["--version"],
    fallbackExecutables: (platform) => platform === "darwin" ? [CODEX_APP_EXECUTABLE] : [],
    setupCommands: (executable) => [
      command(
        executable,
        ["mcp", "add", "keeperhub", "--url", KEEPERHUB_MCP_URL],
        "Add the official KeeperHub hosted MCP server"
      ),
      command(
        executable,
        ["mcp", "login", "keeperhub"],
        "Authenticate KeeperHub MCP in the browser"
      )
    ],
    guidance: [
      "Complete the KeeperHub OAuth flow in the browser when Codex opens it.",
      "Verify authentication with an authenticated read-only KeeperHub tool call."
    ]
  },
  hermes: {
    name: "hermes",
    defaultExecutable: "hermes",
    versionArgs: ["--version"],
    fallbackExecutables: () => [],
    setupCommands: (executable) => [
      command(
        executable,
        ["plugins", "install", "KeeperHub/hermes-plugin", "--enable"],
        "Install and enable KeeperHub's official Hermes plugin"
      )
    ],
    guidance: [
      "Provide KH_API_KEY only through the environment when running Hermes; setup never stores it.",
      "KeeperHub write tools remain disabled unless KEEPERHUB_ENABLE_WRITES is explicitly enabled."
    ]
  }
};

export function getAgentDefinition(agent: AgentName): AgentDefinition {
  return definitions[agent];
}

function command(commandName: string, args: string[], purpose: string): SetupCommandSpec {
  return {
    command: commandName,
    args,
    display: formatShellCommand(commandName, args),
    purpose
  };
}

export function formatShellCommand(commandName: string, args: string[]): string {
  return [commandName, ...args].map(shellQuote).join(" ");
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:@=+-]+$/u.test(value)) return value;
  return `'${value.replaceAll("'", `'\"'\"'`)}'`;
}
