import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const generatorPath = fileURLToPath(new URL("../scripts/create-release-condition.ts", import.meta.url));
const temporaryRepositories: string[] = [];

function git(repository: string, args: string[]): string {
  return execFileSync("git", args, { cwd: repository, encoding: "utf8" }).trim();
}

function gitBlob(repository: string, path: string): Buffer {
  return execFileSync("git", ["show", `HEAD:${path}`], { cwd: repository });
}

function digest(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function createRepository(): Promise<{ repository: string; sourceCommit: string }> {
  const repository = await mkdtemp(join(tmpdir(), "keeperhub-condition-"));
  temporaryRepositories.push(repository);
  await mkdir(join(repository, "artifacts/submission"), { recursive: true });
  await mkdir(join(repository, "docs/submission"), { recursive: true });
  await writeFile(join(repository, "artifacts/submission/verification.md"), "committed verification evidence\n");
  await writeFile(join(repository, "docs/submission/onboarding-evidence.md"), "committed onboarding evidence\n");
  git(repository, ["init"]);
  git(repository, ["config", "user.email", "test@example.invalid"]);
  git(repository, ["config", "user.name", "Condition test"]);
  git(repository, ["add", "."]);
  git(repository, ["commit", "-m", "record evidence"]);
  return { repository, sourceCommit: git(repository, ["rev-parse", "HEAD"]) };
}

function runGenerator(repository: string) {
  return spawnSync(process.execPath, ["--experimental-strip-types", generatorPath], {
    cwd: repository,
    encoding: "utf8"
  });
}

afterEach(async () => {
  await Promise.all(temporaryRepositories.splice(0).map((repository) => rm(repository, {
    recursive: true,
    force: true
  })));
});

describe("create release condition", () => {
  it("binds the manifest to clean committed evidence and never overwrites it", async () => {
    const { repository, sourceCommit } = await createRepository();
    const first = runGenerator(repository);
    expect(first.status, first.stderr).toBe(0);

    const manifestPath = join(repository, "artifacts/submission/release-condition.json");
    const manifestBytes = await readFile(manifestPath);
    const manifest = JSON.parse(manifestBytes.toString("utf8")) as {
      sourceCommit: string;
      verificationSha256: string;
      onboardingSha256: string;
      requiredGate: string;
    };
    const verification = gitBlob(repository, "artifacts/submission/verification.md");
    const onboarding = gitBlob(repository, "docs/submission/onboarding-evidence.md");

    expect(manifest.sourceCommit).toBe(sourceCommit);
    expect(manifest.verificationSha256).toBe(digest(verification));
    expect(manifest.onboardingSha256).toBe(digest(onboarding));
    expect(manifest.requiredGate).toContain("npm run verify");
    expect(manifest.requiredGate).toContain("guarded live integration");
    expect(manifest.requiredGate).toContain('walletType:"unknown"');
    expect(manifest.requiredGate).toContain("executionAllowed:false");
    expect(manifest.requiredGate).toContain("official KeeperHub Turnkey EOA documentation");
    expect(manifest.requiredGate).toContain("matching wallet UI");
    expect(manifest.requiredGate).toContain("Sepolia Safe Sender disabled");
    expect(manifest.requiredGate).toContain("spendCap:null");
    expect(manifest.requiredGate).toContain('EVM "No cap set"');
    expect(manifest.requiredGate).toContain("no other warn, fail, or skip is accepted");
    expect(manifest.requiredGate).toContain("Claude, Codex, and Hermes");

    const second = runGenerator(repository);
    expect(second.status).not.toBe(0);
    expect(`${second.stdout}${second.stderr}`).toContain("EEXIST");
    await expect(readFile(manifestPath)).resolves.toEqual(manifestBytes);
  });

  it.each([
    "artifacts/submission/verification.md",
    "docs/submission/onboarding-evidence.md"
  ])("rejects dirty bound evidence before creating a manifest: %s", async (evidencePath) => {
    const { repository } = await createRepository();
    await writeFile(join(repository, evidencePath), "dirty evidence\n");

    const result = runGenerator(repository);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("Working-tree evidence differs from");
    await expect(readFile(join(repository, "artifacts/submission/release-condition.json"))).rejects.toThrow();
  });
});
