import { describe, expect, it } from "vitest";
import { CODEX_APP_EXECUTABLE } from "../src/agents/catalog.js";
import { runSetup } from "../src/agents/setup.js";
import type { ProcessRunner } from "../src/agents/types.js";
import { formatSetupReport } from "../src/commands/setup.js";

interface Invocation {
  command: string;
  args: string[];
  timeoutMs: number | undefined;
}

function result(
  command: string,
  overrides: Partial<Awaited<ReturnType<ProcessRunner>>> = {}
): Awaited<ReturnType<ProcessRunner>> {
  return {
    command,
    exitCode: 0,
    stdout: `${command} 1.2.3\n`,
    stderr: "",
    timedOut: false,
    ...overrides
  };
}

function mockRunner(
  handler: (invocation: Invocation) => Awaited<ReturnType<ProcessRunner>>
): { runner: ProcessRunner; invocations: Invocation[] } {
  const invocations: Invocation[] = [];
  const runner: ProcessRunner = async (command, args, options) => {
    const invocation = { command, args: [...args], timeoutMs: options?.timeoutMs };
    invocations.push(invocation);
    return handler(invocation);
  };
  return { runner, invocations };
}

describe("agent setup", () => {
  it("previews every agent without invoking a configuration command", async () => {
    const mock = mockRunner(({ command, args }) => {
      expect(args).toEqual(["--version"]);
      return result(command);
    });

    const report = await runSetup(
      { agent: "all" },
      { runner: mock.runner, platform: "linux" }
    );

    expect(report.ok).toBe(true);
    expect(report.mode).toBe("preview");
    expect(report.agents.map((item) => item.agent)).toEqual(["claude", "codex", "hermes"]);
    expect(mock.invocations).toHaveLength(3);
    expect(report.agents.flatMap((item) => item.steps).every((step) => step.status === "not-run")).toBe(true);
    expect(report.agents[0]?.commands).toEqual([
      "claude mcp add --transport http --scope project keeperhub https://app.keeperhub.com/mcp"
    ]);
    expect(report.agents[1]?.commands).toEqual([
      "codex mcp add keeperhub --url https://app.keeperhub.com/mcp",
      "codex mcp login keeperhub"
    ]);
    expect(report.agents[2]?.commands).toEqual([
      "hermes plugins install KeeperHub/hermes-plugin --enable"
    ]);
  });

  it("uses the bundled Codex executable when the PATH wrapper is broken on macOS", async () => {
    const mock = mockRunner(({ command }) => command === "codex"
      ? result(command, { exitCode: 1, stdout: "", stderr: "wrapper is broken" })
      : result(command, { stdout: "codex-cli 0.144.2\n" }));

    const report = await runSetup(
      { agent: "codex" },
      { runner: mock.runner, platform: "darwin" }
    );

    const codex = report.agents[0];
    expect(codex?.detection).toMatchObject({
      available: true,
      executable: CODEX_APP_EXECUTABLE,
      version: "codex-cli 0.144.2",
      fallbackUsed: true
    });
    expect(codex?.commands[0]).toBe(
      `${CODEX_APP_EXECUTABLE} mcp add keeperhub --url https://app.keeperhub.com/mcp`
    );
    expect(mock.invocations.map((item) => item.command)).toEqual(["codex", CODEX_APP_EXECUTABLE]);
  });

  it("applies Codex add and login sequentially through only the official CLI", async () => {
    const mock = mockRunner(({ command }) => result(command));

    const report = await runSetup(
      { agent: "codex", apply: true },
      { runner: mock.runner, platform: "linux", applyTimeoutMs: 1234 }
    );

    expect(report.ok).toBe(true);
    expect(report.agents[0]?.status).toBe("applied");
    expect(mock.invocations).toEqual([
      { command: "codex", args: ["--version"], timeoutMs: 10_000 },
      {
        command: "codex",
        args: ["mcp", "add", "keeperhub", "--url", "https://app.keeperhub.com/mcp"],
        timeoutMs: 1234
      },
      { command: "codex", args: ["mcp", "login", "keeperhub"], timeoutMs: 1234 }
    ]);
    expect(report.agents[0]?.steps.map((step) => step.status)).toEqual(["passed", "passed"]);
  });

  it("stops after a failed setup step and supplies a copyable repair command", async () => {
    const mock = mockRunner(({ command, args }) => args[0] === "mcp" && args[1] === "add"
      ? result(command, { exitCode: 7, stdout: "", stderr: "failed" })
      : result(command));

    const report = await runSetup(
      { agent: "codex", apply: true },
      { runner: mock.runner, platform: "linux" }
    );

    expect(report.ok).toBe(false);
    expect(report.agents[0]?.status).toBe("failed");
    expect(report.agents[0]?.steps.map((step) => step.status)).toEqual(["failed", "not-run"]);
    expect(report.agents[0]?.failure).toEqual({
      step: "Add the official KeeperHub hosted MCP server",
      causes: ["The official CLI exited with code 7"],
      fixCommands: ["codex mcp add keeperhub --url https://app.keeperhub.com/mcp"]
    });
    expect(mock.invocations).toHaveLength(2);
  });

  it("reports detection and apply timeouts without exposing process output", async () => {
    const detectionMock = mockRunner(({ command }) => result(command, {
      exitCode: null,
      stdout: "kh_fixture_secret_must_not_escape",
      timedOut: true
    }));
    const unavailable = await runSetup(
      { agent: "hermes" },
      { runner: detectionMock.runner, detectionTimeoutMs: 25, platform: "linux" }
    );
    expect(unavailable.agents[0]?.status).toBe("unavailable");
    expect(unavailable.agents[0]?.failure?.causes).toEqual(["The version check timed out"]);
    expect(JSON.stringify(unavailable)).not.toContain("kh_fixture_secret_must_not_escape");

    const applyMock = mockRunner(({ command, args }) => args[0] === "plugins"
      ? result(command, { exitCode: null, stdout: "oauth-token", timedOut: true })
      : result(command));
    const failed = await runSetup(
      { agent: "hermes", apply: true },
      { runner: applyMock.runner, applyTimeoutMs: 50, platform: "linux" }
    );
    expect(failed.agents[0]?.steps[0]?.status).toBe("timed-out");
    expect(JSON.stringify(failed)).not.toContain("oauth-token");
  });

  it("never passes credentials or write-enablement flags to Hermes setup", async () => {
    const mock = mockRunner(({ command }) => result(command));
    const report = await runSetup(
      { agent: "hermes", apply: true },
      { runner: mock.runner, platform: "linux" }
    );

    const install = mock.invocations[1];
    expect(install).toEqual({
      command: "hermes",
      args: ["plugins", "install", "KeeperHub/hermes-plugin", "--enable"],
      timeoutMs: 315_000
    });
    const serialized = JSON.stringify({ report, invocations: mock.invocations });
    expect(serialized).not.toContain("KH_API_KEY=");
    expect(serialized).not.toContain("KEEPERHUB_ENABLE_WRITES=");
  });

  it("formats a clear human preview with follow-up authentication guidance", async () => {
    const mock = mockRunner(({ command }) => result(command));
    const report = await runSetup(
      { agent: "claude" },
      { runner: mock.runner, platform: "linux" }
    );

    const output = formatSetupReport(report);
    expect(output).toContain("KeeperHub agent setup (PREVIEW)");
    expect(output).toContain("claude mcp add --transport http --scope project keeperhub https://app.keeperhub.com/mcp");
    expect(output).toContain("run /mcp");
  });

  it("uses official PowerShell installers instead of POSIX commands on Windows", async () => {
    const mock = mockRunner(({ command }) => result(command, { exitCode: null, stdout: "" }));

    const report = await runSetup(
      { agent: "all" },
      { runner: mock.runner, platform: "win32" }
    );

    expect(report.ok).toBe(false);
    expect(report.agents[0]?.failure?.fixCommands[0]).toContain("https://claude.ai/install.ps1");
    expect(report.agents[1]?.failure?.fixCommands).toEqual(["npm install -g @openai/codex"]);
    expect(report.agents[2]?.failure?.fixCommands[0]).toContain("https://hermes-agent.nousresearch.com/install.ps1");
    expect(JSON.stringify(report.agents.map((agent) => agent.failure?.fixCommands))).not.toContain("curl -fsSL");
  });
});
