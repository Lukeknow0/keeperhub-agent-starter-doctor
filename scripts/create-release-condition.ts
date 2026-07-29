import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const verificationRecord = "artifacts/submission/verification.md";
const onboardingRecord = "docs/submission/onboarding-evidence.md";
const outputPath = "artifacts/submission/release-condition.json";

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (!/^[0-9a-f]{40}$/u.test(sourceCommit)) {
  throw new Error("Cannot bind release condition to an exact Git commit.");
}

function readCommittedEvidence(path: string): Buffer {
  return execFileSync("git", ["show", `${sourceCommit}:${path}`]);
}

function requireCommittedEvidence(path: string): Buffer {
  const committed = readCommittedEvidence(path);
  const workingTree = readFileSync(path);
  if (!workingTree.equals(committed)) {
    throw new Error(`Working-tree evidence differs from ${sourceCommit}: ${path}`);
  }
  return committed;
}

const verification = requireCommittedEvidence(verificationRecord);
const onboarding = requireCommittedEvidence(onboardingRecord);

const condition = {
  schemaVersion: 1,
  project: "KeeperHub Agent Starter + Doctor",
  conditionType: "file-sha256",
  releaseStatement: "Release 0.000001 Sepolia ETH only after the submission verification and three-Agent onboarding evidence are complete and approved.",
  requiredGate: "npm run verify plus guarded live integration plus Doctor with exactly two approved warnings: keeperhub.wallet_type only when walletType:\"unknown\" and executionAllowed:false, paired with official KeeperHub Turnkey EOA documentation, matching wallet UI, and Sepolia Safe Sender disabled; keeperhub.spend_cap only when spendCap:null, paired with UI proof of EVM \"No cap set\"; no other warn, fail, or skip is accepted; plus authenticated read-only onboarding in Claude, Codex, and Hermes",
  verificationRecord,
  verificationSha256: sha256(verification),
  onboardingRecord,
  onboardingSha256: sha256(onboarding),
  sourceCommit,
  chainId: 11_155_111,
  amountEth: "0.000001",
  approvalMode: "human-confirmed exact digest"
} as const;

const serialized = `${JSON.stringify(condition, null, 2)}\n`;
writeFileSync(outputPath, serialized, { encoding: "utf8", flag: "wx", mode: 0o644 });
process.stdout.write(`${JSON.stringify({
  path: outputPath,
  sourceCommit,
  conditionSha256: sha256(serialized)
})}\n`);
