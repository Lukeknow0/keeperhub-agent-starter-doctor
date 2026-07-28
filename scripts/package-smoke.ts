import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface PackedFile {
  path: string;
}

interface PackResult {
  filename: string;
  files: PackedFile[];
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const root = process.cwd();
const scratch = mkdtempSync(join(tmpdir(), "keeperhub-package-smoke-"));

function run(command: string, args: string[], cwd = root): string {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"]
  }).trim();
}

const packed = JSON.parse(run(npm, ["pack", "--json", "--pack-destination", scratch])) as PackResult[];
const entry = packed[0];
if (packed.length !== 1 || entry === undefined || typeof entry.filename !== "string" || !Array.isArray(entry.files)) {
  throw new Error("npm pack returned an unsafe or unexpected manifest.");
}

const paths = new Set(entry.files.map((file) => file.path));
for (const required of ["dist/bin.js", "dist/cli.js", "README.md", "LICENSE", ".env.example"]) {
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
run(npm, ["install", "--prefix", prefix, "--ignore-scripts", tarball]);

const cli = join(prefix, "node_modules", "keeperhub-agent-starter", "dist", "bin.js");
const version = run(process.execPath, [cli, "--version"]);
if (version !== "0.1.0") throw new Error(`Unexpected packaged CLI version: ${version}`);

const help = run(process.execPath, [cli, "setup", "--help"]);
for (const expected of ["--agent <agent>", "--apply", "--json"]) {
  if (!help.includes(expected)) throw new Error(`Packaged setup help is missing ${expected}.`);
}

process.stdout.write(`Package smoke passed: ${entry.filename} (${paths.size} files).\n`);
