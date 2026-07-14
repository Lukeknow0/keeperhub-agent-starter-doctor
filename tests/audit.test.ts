import { readFile, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  appendAuditEvent,
  verifyAuditContents,
  verifyAuditFile
} from "../src/release/audit.js";

describe("tamper-evident audit", () => {
  it("redacts secrets before writing and verifies the hash chain", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "keeperhub-audit-"));
    const path = "audit/release.jsonl";
    const now = new Date("2026-07-28T00:00:00.000Z");
    await appendAuditEvent(workspace, path, "condition", {
      apiKey: "kh_super_secret",
      authorization: "Bearer token-value",
      privateKey: "do-not-write",
      path: "deliverables/result.txt"
    }, now);
    await appendAuditEvent(workspace, path, "simulation", {
      idempotencyKey: "d90f2cb8-5f75-4c3d-a1bc-eaff8967ce4f",
      wouldRevert: false
    }, now);

    const contents = await readFile(join(workspace, path), "utf8");
    expect(contents).not.toContain("kh_super_secret");
    expect(contents).not.toContain("token-value");
    expect(contents).not.toContain("do-not-write");
    expect(contents).not.toContain("d90f2cb8-5f75-4c3d-a1bc-eaff8967ce4f");
    expect(contents).toContain("[REDACTED]");
    await expect(verifyAuditFile(workspace, path)).resolves.toMatchObject({ ok: true, records: 2 });
  });

  it("detects data edits and broken previousHash links", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "keeperhub-audit-"));
    const path = "release.jsonl";
    const now = new Date("2026-07-28T00:00:00.000Z");
    await appendAuditEvent(workspace, path, "one", { value: 1 }, now);
    await appendAuditEvent(workspace, path, "two", { value: 2 }, now);
    const file = join(workspace, path);
    const lines = (await readFile(file, "utf8")).trimEnd().split("\n");
    const first = JSON.parse(lines[0]!) as { data: { value: number } };
    first.data.value = 99;
    lines[0] = JSON.stringify(first);
    await writeFile(file, `${lines.join("\n")}\n`);

    const result = verifyAuditContents(await readFile(file, "utf8"));
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("line 1: hash mismatch");
  });

  it("fails verification when the audit file is missing", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "keeperhub-audit-"));
    await expect(verifyAuditFile(workspace, "missing.jsonl")).resolves.toEqual({
      ok: false,
      records: 0,
      headHash: null,
      errors: ["Audit file does not exist."]
    });
  });
});
