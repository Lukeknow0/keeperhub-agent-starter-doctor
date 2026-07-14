import { spawn } from "node:child_process";

export interface ProcessResult {
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export async function runProcess(
  command: string,
  args: string[],
  options: { timeoutMs?: number; env?: NodeJS.ProcessEnv; cwd?: string } = {}
): Promise<ProcessResult> {
  return await new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, options.timeoutMs ?? 10_000);
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolvePromise({ command, exitCode: null, stdout, stderr: error.message, timedOut });
    });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolvePromise({ command, exitCode, stdout, stderr, timedOut });
    });
  });
}
