import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, win32 } from "node:path";
import { pathToFileURL } from "node:url";

interface PackedFile {
  path: string;
}

interface PackResult {
  filename: string;
  files: PackedFile[];
  version: string;
}

export interface CommandInvocation {
  file: string;
  args: string[];
  windowsVerbatimArguments?: true;
}

export interface CommandInvocationOptions {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
}

const CMD_META_CHARACTERS = /([()\][%!^"`<>&|;, *?])/gu;
const WINDOWS_CMD_FILE = /\.(?:cmd|bat)$/iu;
const WINDOWS_INSTALLED_CMD_SHIM = /node_modules[\\/]\.bin[\\/][^\\/]+\.cmd$/iu;

function environmentValue(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const normalizedName = name.toLowerCase();
  for (const [key, value] of Object.entries(env)) {
    if (key.toLowerCase() === normalizedName && value !== undefined) return value;
  }
  return undefined;
}

function windowsCommandProcessor(env: NodeJS.ProcessEnv): string {
  const configured = environmentValue(env, "ComSpec");
  if (
    configured !== undefined
    && win32.isAbsolute(configured)
    && win32.basename(configured).toLowerCase() === "cmd.exe"
  ) {
    return win32.normalize(configured);
  }

  const systemRoot = environmentValue(env, "SystemRoot");
  if (systemRoot !== undefined && win32.isAbsolute(systemRoot)) {
    return win32.join(systemRoot, "System32", "cmd.exe");
  }

  return "cmd.exe";
}

function escapeWindowsCommand(command: string): string {
  return command.replace(CMD_META_CHARACTERS, "^$1");
}

function escapeWindowsArgument(argument: string, doubleEscapeMetaCharacters: boolean): string {
  let escaped = argument;
  escaped = escaped.replace(/(?=(\\+?)?)\1"/gu, "$1$1\\\"");
  escaped = escaped.replace(/(?=(\\+?)?)\1$/gu, "$1$1");
  escaped = `"${escaped}"`;
  escaped = escaped.replace(CMD_META_CHARACTERS, "^$1");
  if (doubleEscapeMetaCharacters) {
    escaped = escaped.replace(CMD_META_CHARACTERS, "^$1");
  }
  return escaped;
}

export function createCommandInvocation(
  command: string,
  args: string[],
  options: CommandInvocationOptions
): CommandInvocation {
  if (options.platform !== "win32" || !WINDOWS_CMD_FILE.test(command)) {
    return { file: command, args: [...args] };
  }

  const normalizedCommand = win32.normalize(command);
  const doubleEscapeMetaCharacters = WINDOWS_INSTALLED_CMD_SHIM.test(normalizedCommand);
  const shellCommand = [
    escapeWindowsCommand(normalizedCommand),
    ...args.map((argument) => escapeWindowsArgument(argument, doubleEscapeMetaCharacters))
  ].join(" ");

  return {
    file: windowsCommandProcessor(options.env),
    args: ["/d", "/s", "/c", `"${shellCommand}"`],
    windowsVerbatimArguments: true
  };
}

export function assertCliVersion(actualVersion: string, expectedVersion: string): void {
  if (actualVersion !== expectedVersion) {
    throw new Error(
      `Unexpected packaged CLI version: ${actualVersion} (expected ${expectedVersion})`
    );
  }
}

export function runPackageSmoke(root = process.cwd()): void {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const scratch = mkdtempSync(join(tmpdir(), "keeperhub-package-smoke-"));

  function run(command: string, args: string[], cwd = root): string {
    const invocation = createCommandInvocation(command, args, {
      platform: process.platform,
      env: process.env
    });
    const result = spawnSync(invocation.file, invocation.args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
      windowsVerbatimArguments: invocation.windowsVerbatimArguments
    });
    if (result.error !== undefined) throw result.error;
    if (result.status !== 0) {
      throw new Error(
        `Command failed (${result.status ?? result.signal ?? "unknown"}): ${command} ${args.join(" ")}`
      );
    }
    return result.stdout.trim();
  }

  try {
    run(npm, ["run", "build"]);

    const packed = JSON.parse(run(npm, ["pack", "--json", "--pack-destination", scratch])) as PackResult[];
    const entry = packed[0];
    if (
      packed.length !== 1
      || entry === undefined
      || typeof entry.filename !== "string"
      || !Array.isArray(entry.files)
      || typeof entry.version !== "string"
      || entry.version.length === 0
    ) {
      throw new Error("npm pack returned an unsafe or unexpected manifest.");
    }

    const paths = new Set(entry.files.map((file) => file.path));
    for (const required of [
      "dist/bin.js",
      "dist/cli.js",
      "dist/index.js",
      "dist/index.d.ts",
      "README.md",
      "LICENSE",
      ".env.example"
    ]) {
      if (!paths.has(required)) throw new Error(`Package is missing ${required}.`);
    }
    for (const path of paths) {
      if (
        path === ".env"
        || path.startsWith(".keeperhub/")
        || path.startsWith("audit/")
        || path.startsWith("artifacts/")
        || path.startsWith("tests/")
      ) {
        throw new Error(`Package contains forbidden runtime or evidence path: ${path}`);
      }
    }

    const tarball = join(scratch, entry.filename);
    const prefix = join(scratch, "install");
    run(npm, [
      "install",
      "--prefix",
      prefix,
      "--ignore-scripts",
      "--offline",
      "--no-audit",
      "--no-fund",
      tarball
    ]);

    const cli = join(
      prefix,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "keeperhub-starter.cmd" : "keeperhub-starter"
    );
    const version = run(cli, ["--version"], prefix);
    assertCliVersion(version, entry.version);

    const help = run(cli, ["setup", "--help"], prefix);
    for (const expected of ["--agent <agent>", "--apply", "--json"]) {
      if (!help.includes(expected)) throw new Error(`Packaged setup help is missing ${expected}.`);
    }

    run(process.execPath, [
      "--input-type=module",
      "--eval",
      "const entry = await import('keeperhub-agent-starter'); if (typeof entry.createProgram !== 'function') process.exit(1);"
    ], prefix);

    process.stdout.write(`Package smoke passed: ${entry.filename} (${paths.size} files).\n`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(resolve(invokedPath)).href) {
  runPackageSmoke();
}
