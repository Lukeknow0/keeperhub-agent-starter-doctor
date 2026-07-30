import { EventEmitter } from "node:events";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

interface FakeChild extends EventEmitter {
  pid?: number;
  stdout: PassThrough;
  stderr: PassThrough;
  kill: ReturnType<typeof vi.fn>;
  unref: ReturnType<typeof vi.fn>;
}

function fakeChild(pid?: number): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.pid = pid;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = vi.fn(() => true);
  child.unref = vi.fn();
  return child;
}

async function waitForProcessExit(pid: number, timeoutMs = 500): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  do {
    try {
      process.kill(pid, 0);
    } catch {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  } while (Date.now() < deadline);
  return false;
}

afterEach(() => {
  vi.doUnmock("node:child_process");
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("runProcess", () => {
  it("uses a detached POSIX process group and escalates the whole group", async () => {
    vi.useFakeTimers();
    vi.spyOn(process, "platform", "get").mockReturnValue("linux");
    const child = fakeChild(43_210);
    const spawn = vi.fn(() => child);
    vi.doMock("node:child_process", () => ({ spawn }));
    const kill = vi.spyOn(process, "kill").mockImplementation((pid, signal) => {
      if (pid === -43_210 && signal === "SIGKILL") {
        queueMicrotask(() => child.emit("close", null));
      }
      return true;
    });
    const { runProcess } = await import("../src/core/process.js");

    const resultPromise = runProcess("fixture-command", [], { timeoutMs: 10 });
    expect(spawn).toHaveBeenCalledWith(
      "fixture-command",
      [],
      expect.objectContaining({ detached: true })
    );

    await vi.advanceTimersByTimeAsync(10);
    expect(kill).toHaveBeenCalledWith(-43_210, "SIGTERM");
    expect(child.kill).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1_000);
    expect(kill).toHaveBeenCalledWith(-43_210, "SIGKILL");
    await expect(resultPromise).resolves.toMatchObject({ timedOut: true, exitCode: null });
  });

  it("returns promptly when the detached POSIX group closes after SIGTERM", async () => {
    vi.useFakeTimers();
    vi.spyOn(process, "platform", "get").mockReturnValue("linux");
    const child = fakeChild(43_211);
    const spawn = vi.fn(() => child);
    vi.doMock("node:child_process", () => ({ spawn }));
    const kill = vi.spyOn(process, "kill").mockImplementation((pid, signal) => {
      if (pid === -43_211 && signal === 0) {
        throw Object.assign(new Error("process group is gone"), { code: "ESRCH" });
      }
      if (pid === -43_211 && signal === "SIGTERM") {
        queueMicrotask(() => child.emit("close", null));
      }
      return true;
    });
    const { runProcess } = await import("../src/core/process.js");

    const resultPromise = runProcess("fixture-command", [], { timeoutMs: 10 });
    await vi.advanceTimersByTimeAsync(10);

    await expect(resultPromise).resolves.toMatchObject({ timedOut: true, exitCode: null });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(kill).not.toHaveBeenCalledWith(-43_211, "SIGKILL");
  });

  it("uses taskkill with an exact numeric PID for a Windows process tree", async () => {
    vi.useFakeTimers();
    vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    const child = fakeChild(54_321);
    const taskkill = fakeChild();
    const spawn = vi.fn()
      .mockReturnValueOnce(child)
      .mockImplementationOnce(() => {
        queueMicrotask(() => child.emit("close", null));
        return taskkill;
      });
    vi.doMock("node:child_process", () => ({ spawn }));
    const { runProcess } = await import("../src/core/process.js");

    const resultPromise = runProcess("fixture-command", [], { timeoutMs: 10 });
    let resolved = false;
    void resultPromise.then(() => {
      resolved = true;
    });
    expect(spawn).toHaveBeenNthCalledWith(
      1,
      "fixture-command",
      [],
      expect.objectContaining({ detached: false })
    );

    await vi.advanceTimersByTimeAsync(10);
    expect(spawn).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/taskkill\.exe$/iu),
      ["/PID", "54321", "/T", "/F"],
      expect.objectContaining({
        stdio: "ignore",
        windowsHide: true
      })
    );
    expect(taskkill.unref).toHaveBeenCalledOnce();
    await Promise.resolve();
    expect(resolved).toBe(false);

    taskkill.emit("exit", 0);
    await expect(resultPromise).resolves.toMatchObject({ timedOut: true, exitCode: null });
  });

  it("force-kills and unreferences a hung Windows taskkill fallback", async () => {
    vi.useFakeTimers();
    vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    const child = fakeChild(54_322);
    const taskkill = fakeChild();
    const spawn = vi.fn()
      .mockReturnValueOnce(child)
      .mockReturnValueOnce(taskkill);
    vi.doMock("node:child_process", () => ({ spawn }));
    const { runProcess } = await import("../src/core/process.js");

    const resultPromise = runProcess("fixture-command", [], { timeoutMs: 10 });
    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(1_250);

    expect(taskkill.kill).toHaveBeenCalledWith("SIGKILL");
    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
    expect(taskkill.unref).toHaveBeenCalled();
    expect(child.unref).toHaveBeenCalledOnce();
    await expect(resultPromise).resolves.toMatchObject({ timedOut: true, exitCode: null });
  });

  it.runIf(process.platform !== "win32")(
    "does not hang when a signal-resistant descendant inherits its stdio",
    async () => {
      const scratch = mkdtempSync(join(tmpdir(), "keeperhub-process-tree-"));
      const pidFile = join(scratch, "descendant.pid");
      const descendantSource = [
        "process.on('SIGTERM', () => {});",
        "setInterval(() => {}, 1000);"
      ].join("");
      const parentSource = [
        "const { spawn } = require('node:child_process');",
        "const { writeFileSync } = require('node:fs');",
        `const descendant = spawn(process.execPath, ["-e", ${JSON.stringify(descendantSource)}], `,
        "{ stdio: ['ignore', 'inherit', 'inherit'] });",
        "writeFileSync(process.argv[1], JSON.stringify({ parent: process.pid, descendant: descendant.pid }));",
        "setInterval(() => {}, 1000);"
      ].join("");
      const { runProcess } = await import("../src/core/process.js");
      let fixturePids: { parent: number; descendant: number } | undefined;
      let boundTimer: NodeJS.Timeout | undefined;
      let descendantPid: number | undefined;

      try {
        const result = await Promise.race([
          runProcess(process.execPath, ["-e", parentSource, pidFile], { timeoutMs: 250 }),
          new Promise<never>((_resolve, reject) => {
            boundTimer = setTimeout(
              () => reject(new Error("runProcess remained open after its kill grace")),
              3_000
            );
          })
        ]);

        expect(result.timedOut).toBe(true);
        expect(existsSync(pidFile)).toBe(true);
        fixturePids = JSON.parse(readFileSync(pidFile, "utf8")) as {
          parent: number;
          descendant: number;
        };
        descendantPid = fixturePids.descendant;
        expect(await waitForProcessExit(descendantPid)).toBe(true);
      } finally {
        if (boundTimer !== undefined) clearTimeout(boundTimer);
        if (fixturePids === undefined && existsSync(pidFile)) {
          fixturePids = JSON.parse(readFileSync(pidFile, "utf8")) as {
            parent: number;
            descendant: number;
          };
        }
        for (const pid of fixturePids === undefined
          ? []
          : [fixturePids.parent, fixturePids.descendant]) {
          if (!Number.isSafeInteger(pid) || pid <= 0 || pid === process.pid) continue;
          try {
            process.kill(pid, "SIGKILL");
          } catch {
            // The process-tree timeout already reaped the fixture process.
          }
        }
        rmSync(scratch, { recursive: true, force: true });
      }
    },
    7_000
  );

  it.runIf(process.platform !== "win32")(
    "kills a signal-resistant descendant after the direct child closes its stdio",
    async () => {
      const scratch = mkdtempSync(join(tmpdir(), "keeperhub-process-group-"));
      const pidFile = join(scratch, "processes.json");
      const descendantSource = [
        "process.on('SIGTERM', () => {});",
        "setInterval(() => {}, 1000);"
      ].join("");
      const parentSource = [
        "const { spawn } = require('node:child_process');",
        "const { writeFileSync } = require('node:fs');",
        `const descendant = spawn(process.execPath, ["-e", ${JSON.stringify(descendantSource)}], `,
        "{ stdio: 'ignore' });",
        "writeFileSync(process.argv[1], JSON.stringify({ parent: process.pid, descendant: descendant.pid }));",
        "setInterval(() => {}, 1000);"
      ].join("");
      const { runProcess } = await import("../src/core/process.js");
      let fixturePids: { parent: number; descendant: number } | undefined;
      let boundTimer: NodeJS.Timeout | undefined;

      try {
        const result = await Promise.race([
          runProcess(process.execPath, ["-e", parentSource, pidFile], { timeoutMs: 250 }),
          new Promise<never>((_resolve, reject) => {
            boundTimer = setTimeout(
              () => reject(new Error("runProcess exceeded its process-group kill bound")),
              3_000
            );
          })
        ]);

        expect(result.timedOut).toBe(true);
        fixturePids = JSON.parse(readFileSync(pidFile, "utf8")) as {
          parent: number;
          descendant: number;
        };
        expect(await waitForProcessExit(fixturePids.descendant)).toBe(true);
      } finally {
        if (boundTimer !== undefined) clearTimeout(boundTimer);
        if (fixturePids === undefined && existsSync(pidFile)) {
          fixturePids = JSON.parse(readFileSync(pidFile, "utf8")) as {
            parent: number;
            descendant: number;
          };
        }
        for (const pid of fixturePids === undefined
          ? []
          : [fixturePids.parent, fixturePids.descendant]) {
          if (!Number.isSafeInteger(pid) || pid <= 0 || pid === process.pid) continue;
          try {
            process.kill(pid, "SIGKILL");
          } catch {
            // The process-tree timeout already reaped the fixture process.
          }
        }
        rmSync(scratch, { recursive: true, force: true });
      }
    },
    7_000
  );
});
