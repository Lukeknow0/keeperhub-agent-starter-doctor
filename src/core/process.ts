import { spawn, type ChildProcessByStdio } from "node:child_process";
import { join } from "node:path";
import type { Readable } from "node:stream";

const FORCE_KILL_AFTER_MS = 1_000;
const CLOSE_AFTER_FORCE_KILL_MS = 250;

export interface ProcessResult {
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

type SpawnedProcess = ChildProcessByStdio<null, Readable, Readable>;

function hasSafePid(child: SpawnedProcess): child is SpawnedProcess & { pid: number } {
  return (
    child.pid !== undefined
    && Number.isSafeInteger(child.pid)
    && child.pid > 0
    && child.pid !== process.pid
  );
}

function signalPosixProcessGroup(
  child: SpawnedProcess,
  signal: NodeJS.Signals
): void {
  if (hasSafePid(child)) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {
      // Fall back to the direct child if the detached group no longer exists.
    }
  }

  try {
    child.kill(signal);
  } catch {
    // The child may have exited between the timeout and the signal.
  }
}

function posixProcessGroupExists(child: SpawnedProcess): boolean {
  if (!hasSafePid(child)) return false;
  try {
    process.kill(-child.pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function windowsTaskkillPath(): string {
  const systemRoot = process.env.SystemRoot;
  return systemRoot === undefined || systemRoot.length === 0
    ? "taskkill.exe"
    : join(systemRoot, "System32", "taskkill.exe");
}

function terminateWindowsProcessTree(
  child: SpawnedProcess,
  onComplete: () => void
): () => void {
  const directKill = (): void => {
    try {
      child.kill("SIGKILL");
    } catch {
      // taskkill may already have terminated the direct child.
    }
    child.unref();
  };

  if (!hasSafePid(child)) {
    directKill();
    onComplete();
    return () => {};
  }

  let completed = false;
  const complete = (needsFallback: boolean): void => {
    if (completed) return;
    completed = true;
    if (needsFallback) directKill();
    onComplete();
  };

  try {
    const killer = spawn(
      windowsTaskkillPath(),
      ["/PID", String(child.pid), "/T", "/F"],
      {
        stdio: "ignore",
        windowsHide: true
      }
    );
    killer.once("error", () => {
      complete(true);
    });
    killer.once("exit", (exitCode) => {
      complete(exitCode !== 0);
    });
    killer.unref();
    return () => {
      if (!completed) {
        try {
          killer.kill("SIGKILL");
        } catch {
          // The taskkill helper may have exited without emitting its event yet.
        }
      }
      directKill();
      complete(false);
    };
  } catch {
    complete(true);
    return () => {};
  }
}

export async function runProcess(
  command: string,
  args: string[],
  options: { timeoutMs?: number; env?: NodeJS.ProcessEnv; cwd?: string } = {}
): Promise<ProcessResult> {
  return await new Promise((resolvePromise) => {
    const isWindows = process.platform === "win32";
    const child = spawn(command, args, {
      cwd: options.cwd,
      detached: !isWindows,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let forceKillSent = false;
    let closed = false;
    let exitCode: number | null = null;
    let settled = false;
    let forceKillTimer: NodeJS.Timeout | undefined;
    let boundedCloseTimer: NodeJS.Timeout | undefined;

    const settle = (): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutTimer);
      if (forceKillTimer !== undefined) clearTimeout(forceKillTimer);
      if (boundedCloseTimer !== undefined) clearTimeout(boundedCloseTimer);
      resolvePromise({ command, exitCode, stdout, stderr, timedOut });
    };

    const finishAfterForceKill = (): void => {
      forceKillSent = true;
      if (closed) {
        settle();
        return;
      }
      boundedCloseTimer = setTimeout(() => {
        child.stdout.destroy();
        child.stderr.destroy();
        settle();
      }, CLOSE_AFTER_FORCE_KILL_MS);
    };

    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      if (isWindows) {
        let forceWindowsFallback = (): void => {};
        boundedCloseTimer = setTimeout(() => {
          forceWindowsFallback();
          child.stdout.destroy();
          child.stderr.destroy();
          settle();
        }, FORCE_KILL_AFTER_MS + CLOSE_AFTER_FORCE_KILL_MS);
        forceWindowsFallback = terminateWindowsProcessTree(child, () => {
          forceKillSent = true;
          if (closed) settle();
        });
        return;
      }

      signalPosixProcessGroup(child, "SIGTERM");
      forceKillTimer = setTimeout(() => {
        signalPosixProcessGroup(child, "SIGKILL");
        finishAfterForceKill();
      }, FORCE_KILL_AFTER_MS);
    }, options.timeoutMs ?? 10_000);

    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.once("exit", (code) => {
      exitCode = code;
    });
    child.once("error", (error) => {
      stderr = error.message;
      settle();
    });
    child.once("close", (code) => {
      closed = true;
      exitCode = code;
      if (!timedOut || forceKillSent) {
        settle();
        return;
      }
      if (!isWindows && !posixProcessGroupExists(child)) settle();
    });
  });
}
