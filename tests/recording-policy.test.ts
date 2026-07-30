import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const POLICY_PATH = "artifacts/submission/recording-policy.json";
const RUNBOOK_PATH = "docs/submission/recording-runbook.md";
const PLAN_PATH = "docs/superpowers/plans/2026-07-28-hackathon-submission.md";
const DEMO_PATH = "docs/submission/demo-script.md";
const ARCHITECTURE_PATH = "docs/submission/architecture.md";
const README_PATH = "README.md";
const BOUNTY_PATH = "docs/submission/bounty-copy.md";
const DELIVERY_GATE_PATH = "artifacts/submission/delivery-gate.md";

type RecordingPolicy = {
  status: string;
  policyKind: string;
  maxFinalSimulations: number;
  finalNamespace: {
    plan: string;
    state: string;
    audit: string;
    video: string;
  };
  preRecording: {
    planMustNotExist: boolean;
    stateMustNotExist: boolean;
    auditMustNotExist: boolean;
  };
  prepare: {
    command: string;
    allowedCount: number;
    onlyAfterRecordingStarts: boolean;
    simulate: boolean;
  };
  finalSequence: string[];
  prohibitedFinalCommands: string[];
  failurePolicy: {
    hardAbort: boolean;
    automaticSecondSimulation: boolean;
    expiryRequiresNewRecording: boolean;
  };
};

async function loadPolicy(): Promise<RecordingPolicy> {
  return JSON.parse(await readFile(POLICY_PATH, "utf8")) as RecordingPolicy;
}

describe("single-recording final-execution policy", () => {
  it("reserves one strict simulation for the formal recording and an explicit final namespace", async () => {
    const policy = await loadPolicy();

    expect(policy.status).toBe("recording-only-not-run");
    expect(policy.policyKind).toBe("machine-readable-static-policy");
    expect(policy.maxFinalSimulations).toBe(1);
    expect(policy.finalNamespace).toEqual({
      plan: ".keeperhub/final-release-plan.json",
      state: ".keeperhub/final-release-state.json",
      audit: "audit/final-release.jsonl",
      video: "artifacts/private/keeperhub-demo-final.mov"
    });
    expect(policy.preRecording).toEqual({
      planMustNotExist: true,
      stateMustNotExist: true,
      auditMustNotExist: true
    });
    expect(policy.prepare).toEqual({
      command: "release prepare",
      allowedCount: 1,
      onlyAfterRecordingStarts: true,
      simulate: true
    });
  });

  it("enforces the summary, independent authorization, real-TTY confirmation, execution, and evidence order", async () => {
    const policy = await loadPolicy();

    expect(policy.finalSequence).toEqual([
      "recording-started",
      "release-prepare-simulate-true",
      "full-summary-shown",
      "independent-user-authorization",
      "release-execute-started",
      "real-tty-confirm-phrase-entered",
      "status-checked",
      "receipt-independently-verified",
      "audit-verified"
    ]);
    expect(policy.prohibitedFinalCommands).toEqual(
      expect.arrayContaining(["doctor", "test:integration", "live-fixture-prepare"])
    );
  });

  it("hard-aborts without an automatic second simulation after failure or expiry", async () => {
    const policy = await loadPolicy();

    expect(policy.failurePolicy).toEqual({
      hardAbort: true,
      automaticSecondSimulation: false,
      expiryRequiresNewRecording: true
    });
  });

  it("makes the same invariant judge-visible in the runbook", async () => {
    const runbook = await readFile(RUNBOOK_PATH, "utf8");

    expect(runbook).toContain("Status: **RECORDING-ONLY — NOT RUN**");
    expect(runbook).toContain("Exactly one `release prepare`");
    expect(runbook).toContain("`simulate: true`");
    expect(runbook).toContain("independent user authorization");
    expect(runbook).toContain("real TTY");
    expect(runbook).toContain("No automatic second simulation");
    expect(runbook).toContain("artifacts/private/keeperhub-demo-final.mov");
  });

  it("keeps every pre-recording step offline and removes the superseded live command blocks", async () => {
    const plan = await readFile(PLAN_PATH, "utf8");

    expect(plan).toContain("Before recording: frozen evidence and offline verification only");
    expect(plan).not.toMatch(/npm run test:integration/);
    expect(plan).not.toMatch(/node\s+dist\/cli\.js\s+doctor/);
    expect(plan).not.toMatch(/node\s+dist\/cli\.js\s+release\s+prepare/);
    expect(plan).not.toMatch(/^### Task [67]:/m);
  });

  it("orders status, independent public receipt verification, and audit verification exactly", async () => {
    const runbook = await readFile(RUNBOOK_PATH, "utf8");
    const statusIndex = runbook.indexOf("node dist/cli.js release status");
    const receiptIndex = runbook.indexOf("## Independent public receipt verification");
    const auditIndex = runbook.indexOf("node dist/cli.js audit verify audit/final-release.jsonl");

    expect(statusIndex).toBeGreaterThan(-1);
    expect(receiptIndex).toBeGreaterThan(statusIndex);
    expect(auditIndex).toBeGreaterThan(receiptIndex);
    expect(runbook).toContain("Prepare output does not display the TTY confirmation phrase");
    expect(runbook).toContain("`CONFIRM <plan-digest-prefix>`");
    expect(runbook).not.toContain("`CONFIRM <intent-digest-prefix>`");
  });

  it("keeps the policy description static, timings flexible, and receipt evidence outside the audit event graph", async () => {
    const [demo, architecture, readme, bounty, deliveryGate] = await Promise.all([
      readFile(DEMO_PATH, "utf8"),
      readFile(ARCHITECTURE_PATH, "utf8"),
      readFile(README_PATH, "utf8"),
      readFile(BOUNTY_PATH, "utf8"),
      readFile(DELIVERY_GATE_PATH, "utf8")
    ]);

    for (const document of [demo, architecture, readme, bounty, deliveryGate]) {
      expect(document.toLowerCase()).not.toContain("machine-enforced");
    }
    expect(demo).toContain("Flexible shot sequence");
    expect(demo).not.toMatch(/\b\d{2}:\d{2}\b/);
    expect(architecture).toContain("Independent receipt verification is external evidence, not an audit event");
    expect(architecture).not.toContain("Q --> P");
    expect(architecture).not.toContain("R --> P");
  });

  it("links the current mergeable Quickstart patch separately from the historical Doctor record", async () => {
    const [readme, bounty] = await Promise.all([
      readFile(README_PATH, "utf8"),
      readFile(BOUNTY_PATH, "utf8")
    ]);

    expect(readme).toContain("(patches/keeperhub-cli-quickstart-auth.patch)");
    expect(readme).toContain("(artifacts/upstream/quickstart-patch-validation.txt)");
    expect(readme).toContain("(artifacts/upstream/quickstart-focused-tests.txt)");
    expect(readme).toContain("(docs/upstream-quickstart-pr-draft.md)");
    expect(bounty).toContain("(../../patches/keeperhub-cli-quickstart-auth.patch)");
    expect(bounty).toContain("(../../artifacts/upstream/quickstart-patch-validation.txt)");
    expect(bounty).toContain("(../../artifacts/upstream/quickstart-focused-tests.txt)");
    expect(bounty).toContain("(../upstream-quickstart-pr-draft.md)");
    expect(bounty).toContain("The no-duplicate-PR decision applies only to the historical Doctor fix");
  });
});
