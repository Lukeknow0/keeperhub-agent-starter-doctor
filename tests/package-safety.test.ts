import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertCliVersion,
  createCommandInvocation
} from "../scripts/package-smoke.js";

describe("package safety", () => {
  it("publishes the built JavaScript and type entrypoints", () => {
    const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      main?: string;
      types?: string;
      exports?: Record<string, unknown>;
    };

    expect(packageJson.main).toBe("./dist/index.js");
    expect(packageJson.types).toBe("./dist/index.d.ts");
    expect(packageJson.exports).toEqual({
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js"
      }
    });
  });

  it("executes ordinary POSIX commands directly", () => {
    expect(
      createCommandInvocation("npm", ["run", "build"], {
        platform: "linux",
        env: {}
      })
    ).toEqual({
      file: "npm",
      args: ["run", "build"]
    });
  });

  it("dispatches npm.cmd through an explicitly selected cmd.exe on Windows", () => {
    expect(
      createCommandInvocation("npm.cmd", ["run", "build"], {
        platform: "win32",
        env: { ComSpec: "C:\\Windows\\System32\\cmd.exe" }
      })
    ).toEqual({
      file: "C:\\Windows\\System32\\cmd.exe",
      args: ["/d", "/s", "/c", '"npm.cmd ^"run^" ^"build^""'],
      windowsVerbatimArguments: true
    });
  });

  it("double-escapes arguments passed through an installed Windows .cmd shim", () => {
    const invocation = createCommandInvocation(
      "C:\\work folder\\node_modules\\.bin\\keeperhub-starter.cmd",
      ["setup & calc", "100%"],
      {
        platform: "win32",
        env: {
          ComSpec: "powershell.exe",
          SystemRoot: "C:\\Windows"
        }
      }
    );

    expect(invocation.file).toBe("C:\\Windows\\System32\\cmd.exe");
    expect(invocation.windowsVerbatimArguments).toBe(true);
    expect(invocation.args).toEqual([
      "/d",
      "/s",
      "/c",
      '"C:\\work^ folder\\node_modules\\.bin\\keeperhub-starter.cmd '
        + '^^^"setup^^^ ^^^&^^^ calc^^^" ^^^"100^^^%^^^""'
    ]);
  });

  it("keeps Windows executables out of cmd.exe", () => {
    expect(
      createCommandInvocation("C:\\Program Files\\nodejs\\node.exe", ["--version"], {
        platform: "win32",
        env: { ComSpec: "C:\\Windows\\System32\\cmd.exe" }
      })
    ).toEqual({
      file: "C:\\Program Files\\nodejs\\node.exe",
      args: ["--version"]
    });
  });

  it("compares the packaged CLI against the packed manifest version", () => {
    expect(() => assertCliVersion("7.6.5", "7.6.5")).not.toThrow();
    expect(() => assertCliVersion("7.6.4", "7.6.5")).toThrow(
      "Unexpected packaged CLI version: 7.6.4 (expected 7.6.5)"
    );

    const source = readFileSync(new URL("../scripts/package-smoke.ts", import.meta.url), "utf8");
    expect(source).not.toContain('version !== "0.1.0"');
    expect(source).toContain("assertCliVersion(version, entry.version)");
  });

  it("builds, installs offline, runs the installed bin shim, and always cleans up", () => {
    const source = readFileSync(new URL("../scripts/package-smoke.ts", import.meta.url), "utf8");

    expect(source).toContain('run(npm, ["run", "build"])');
    expect(source).toContain('"--offline"');
    expect(source).toMatch(/"node_modules",\s*"\.bin"/u);
    expect(source).not.toContain('"dist", "bin.js"');
    expect(source).toContain("finally");
    expect(source).toContain("rmSync(scratch");
  });
});
