import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const scanner = join(root, "scripts", "secret-scan.ts");
const tsxLoader = import.meta.resolve("tsx");

function scanExample(contents: string): ReturnType<typeof spawnSync> {
  const scratch = mkdtempSync(join(tmpdir(), "keeperhub-secret-scan-test-"));
  try {
    execFileSync("git", ["init", "--quiet"], { cwd: scratch });
    writeFileSync(join(scratch, ".env.example"), contents);
    return spawnSync(process.execPath, ["--import", tsxLoader, scanner], {
      cwd: scratch,
      encoding: "utf8"
    });
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

describe("secret scan", () => {
  it("rejects a real-looking API key in .env.example", () => {
    const result = scanExample(`KH_API_KEY=kh_${"abcdefghijklmnopqrstuvwxyz123456"}\n`);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("organization API key in .env.example");
  });

  it.each([
    ["empty", "KH_API_KEY=\n"],
    ["documented placeholder", "KH_API_KEY=kh_your_organization_api_key\n"]
  ])("allows an %s value in .env.example", (_name, contents) => {
    const result = scanExample(contents);

    expect(result.status).toBe(0);
  });
});
