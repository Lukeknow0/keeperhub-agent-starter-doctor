# KeeperHub Hackathon Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the preserved private rehearsal into an eligible, reproducible KeeperHub hackathon submission with three-Agent onboarding proof, one post-window Sepolia transaction, a mergeable upstream Doctor patch, and judge-ready publication materials.

**Architecture:** Preserve the pre-event commit as an immutable annotated tag, then perform all submission work on `hackathon/submission`. Keep local verification, live read/simulation evidence, real execution state, public audit evidence, upstream contribution artifacts, and external publication as separate trust boundaries. Every network-changing or public action has its own human checkpoint; transaction execution remains bound to the exact condition, recipient, amount, simulation, plan digest, and persisted idempotency key.

**Tech Stack:** Node.js `>=22.12.0`, npm, ESM TypeScript 7.0.2, MCP SDK 1.29.0, Commander 15.0.0, Zod 4.4.3, Vitest 4.1.10, KeeperHub REST/MCP/CLI, Claude Code, Codex CLI, Hermes, Git/GitHub, DoraHacks, Ethereum Sepolia `11155111`, ego-browser for all website interaction.

## Global Constraints

- The immutable pre-event source commit is `c4d7d2a38e5dea9d607913a384cdf168aec78e9c`; do not rewrite or conceal its timestamp.
- The conservative build-window boundary was `2026-07-27 19:01 Asia/Shanghai`; the code lock has elapsed, but current DoraHacks eligibility rules must be revalidated before publication or final execution.
- Use only Ethereum Sepolia chain `11155111` unless current organizer rules explicitly require a different eligible network; any network ambiguity stops execution.
- The final amount is exactly `0.000001 ETH` and the wallet type must be independently verified as EOA. Safe or unknown wallet types remain blocked.
- Never accept, read, copy, display, log, or store a private key, seed phrase, wallet signature material, OAuth token, HMAC secret, raw `KH_API_KEY`, or raw idempotency key in public evidence.
- Load `KH_API_KEY` only from the process environment or the ignored mode-`0600` `.env`; there is no `--api-key` argument.
- Read `/Users/luke/.agents/skills/ego-browser/SKILL.md` completely before the first browser action, then use only ego-browser for website interaction in this plan.
- Treat a browser login or user takeover as a hard stop until the user explicitly asks the agent to continue.
- Do not broadcast a transaction until the user has approved the exact chain, sender, recipient, amount, condition digest, Gas estimate, intent digest, plan digest, and expiry shown after a fresh simulation.
- The approval covers only that request and safe retries with the already-persisted idempotency key. A new key or any field change requires a new simulation and new approval.
- GitHub publication, upstream pull-request creation, DoraHacks main submission, and bounty `Apply` are four separate consequential actions and each requires its own immediate confirmation.
- Do not enable Hermes write tools. `KEEPERHUB_ENABLE_WRITES` must remain unset during onboarding proof.
- Do not use a mock transaction as submission evidence. Local fixtures may demonstrate failures and retries only when clearly labeled as fixtures.
- Use `apply_patch` for hand-edited repository files. The exact reviewed condition generator in Task 5 may exclusively create its derived JSON with `flag: "wx"`; no other shell/file-write shortcut is allowed. Preserve unrelated user changes and stop if the worktree contains unexpected edits.

---

## File Map

### Existing files to modify

- `package.json` — change the public project version from `0.1.0-rehearsal.0` to `0.1.0`.
- `package-lock.json` — keep both root version fields synchronized at `0.1.0`.
- `src/cli.ts` — report CLI version `0.1.0`.
- `tests/cli.test.ts` — lock the public version and preserve the structured error contract.
- `package.json` scripts — add the post-window clean-package smoke gate to `npm run verify`.
- `README.md` — replace the expired publication freeze with an honest provenance disclosure, add final transaction evidence, clean-clone onboarding, demo flow, and submission links.
- `patches/keeperhub-cli-doctor-auth-v0.10.0.patch` — replace only if current upstream still needs the fix and the patch must be refreshed.
- `docs/upstream-pr-draft.md` — update base revision, test evidence, and duplicate-check result.
- `artifacts/upstream/README.md` — index refreshed upstream evidence.
- `artifacts/upstream/auth-regression-tests.txt` — sanitized focused Go test evidence.
- `artifacts/upstream/full-suite.txt` — sanitized full upstream test evidence.
- `artifacts/upstream/patch-validation.txt` — sanitized base revision, clean-apply, checksum, and negative-test evidence.

### New tracked files

- `docs/superpowers/plans/2026-07-28-hackathon-submission.md` — this execution plan.
- `scripts/package-smoke.ts` — install the generated tarball into a new temporary prefix and verify the packaged CLI surface.
- `scripts/create-release-condition.ts` — deterministically bind finalized evidence digests and their source commit into an exclusive-create condition manifest.
- `.github/workflows/ci.yml` — run the offline verification and package smoke gate on every push and pull request without repository secrets.
- `docs/submission/compliance-2026-07-28.md` — live rule, deadline, network, eligibility, and submission-requirement freeze.
- `docs/submission/onboarding-evidence.md` — sanitized proof that Claude, Codex, and Hermes each invoked an authenticated read-only KeeperHub tool.
- `artifacts/submission/verification.md` — reproducible local, package, live-read, and strict-simulation gate results.
- `artifacts/submission/release-condition.json` — the exact public `file-sha256` condition bound to final verification evidence.
- `audit/final-release.jsonl` — append-only public condition, simulation, confirmation, submission, retry, status, and receipt hash chain.
- `docs/submission/final-transaction.md` — KeeperHub execution ID, retry count, transaction hash/link, receipt checks, and audit head.
- `docs/submission/architecture.md` — component boundaries and data flow.
- `docs/submission/security.md` — threat model, approval boundaries, secret handling, idempotency, and ambiguous-state rules.
- `docs/submission/demo-script.md` — short, timed demo and recording shot list.
- `docs/submission/dorahacks-copy.md` — main-track submission copy.
- `docs/submission/bounty-copy.md` — Best Onboarding UX Improvement bounty copy and ranked blocker evidence.

### Local-only files

- `.keeperhub/final-release-plan.json` — ignored, ten-minute simulated intent plan; contains no credential but is never committed.
- `.keeperhub/final-release-state.json` — ignored mode-`0600` state containing the only raw idempotency key; never copy or commit it.
- `/private/tmp/keeperhub-onboarding-submission` — fixed isolated Agent homes and project directories used for clean onboarding proof and later Doctor evidence gates.
- `.upstream/cli-current` — ignored clean clone used to validate current KeeperHub CLI upstream state.
- `artifacts/private/` — ignored raw terminal/video material if required for local review; never publish without inspection.

---

### Task 1: Freeze the baseline and open the post-window branch

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/cli.ts`
- Modify: `tests/cli.test.ts`
- Modify: `README.md`
- Track: `docs/superpowers/plans/2026-07-28-hackathon-submission.md`

**Interfaces:**
- Consumes: immutable commit `c4d7d2a38e5dea9d607913a384cdf168aec78e9c` on `rehearsal/pre-event`.
- Produces: annotated tag `pre-event-rehearsal`, branch `hackathon/submission`, public version `0.1.0`, and an honest provenance statement used by all submission materials.

- [ ] **Step 1: Reconfirm the immutable source and inspect every local change**

Run:

```bash
git rev-parse HEAD
git branch --show-current
git status --short
git tag --list pre-event-rehearsal
git remote -v
```

Expected: HEAD is exactly `c4d7d2a38e5dea9d607913a384cdf168aec78e9c`; branch is `rehearsal/pre-event`; there is no remote or existing tag. The only expected untracked change is this plan. Stop if any unrelated path appears.

- [ ] **Step 2: Tag the exact pre-event commit without rewriting history**

Run:

```bash
git tag -a pre-event-rehearsal c4d7d2a38e5dea9d607913a384cdf168aec78e9c -m "Pre-event private rehearsal baseline"
git show --no-patch --decorate pre-event-rehearsal
```

Expected: the annotated tag points to the exact frozen commit and retains its original author/committer history.

- [ ] **Step 3: Create the submission branch**

Run:

```bash
git switch -c hackathon/submission
git branch --show-current
```

Expected: `hackathon/submission`. If the branch already exists, stop and inspect it; do not force or delete it.

- [ ] **Step 4: Write the failing public-version test**

Add this test inside the existing `describe("CLI error contract", ...)` block in `tests/cli.test.ts`:

```ts
it("reports the public submission version", async () => {
  let stdout = "";
  vi.spyOn(process.stdout, "write").mockImplementation(((chunk: string | Uint8Array) => {
    stdout += String(chunk);
    return true;
  }) as typeof process.stdout.write);

  const code = await main(["node", "keeperhub-starter", "--version"]);

  expect(code).toBe(0);
  expect(stdout.trim()).toBe("0.1.0");
});
```

- [ ] **Step 5: Run the test and verify the rehearsal version fails**

Run:

```bash
npm test -- tests/cli.test.ts
```

Expected: one failure showing `0.1.0-rehearsal.0` instead of `0.1.0`.

- [ ] **Step 6: Apply the minimal version conversion**

Use `apply_patch` to make exactly these replacements:

```text
package.json:       0.1.0-rehearsal.0 -> 0.1.0
package-lock.json:  both 0.1.0-rehearsal.0 fields -> 0.1.0
src/cli.ts:         .version("0.1.0-rehearsal.0") -> .version("0.1.0")
```

In `README.md`, replace the expired freeze with this provenance statement:

```markdown
> Provenance disclosure: the private pre-event research and implementation baseline is preserved at tag `pre-event-rehearsal` (commit `c4d7d2a38e5dea9d607913a384cdf168aec78e9c`). Submission work is developed transparently on `hackathon/submission` after the conservative opening boundary. The earlier transaction remains onboarding evidence and is never represented as the final hackathon transaction.
```

Also change “during rehearsal” to “for this Sepolia submission” and “the rehearsal build” to “the release workflow”; keep `docs/rehearsal-report.md` immutable.

- [ ] **Step 7: Verify the version and provenance change**

Run:

```bash
npm test -- tests/cli.test.ts
npm run build
node dist/cli.js --version
git diff --check
```

Expected: CLI tests pass, build passes, version is exactly `0.1.0`, and `git diff --check` is silent.

- [ ] **Step 8: Commit the branch foundation**

Run:

```bash
git add package.json package-lock.json src/cli.ts tests/cli.test.ts README.md docs/superpowers/plans/2026-07-28-hackathon-submission.md
git commit -m "chore: open hackathon submission branch"
```

Expected: one commit on `hackathon/submission`; the baseline tag remains on `c4d7d2a38e5dea9d607913a384cdf168aec78e9c`.

---

### Task 2: Revalidate live rules and freeze compliance decisions

**Files:**
- Create: `docs/submission/compliance-2026-07-28.md`

**Interfaces:**
- Consumes: current DoraHacks event/bounty pages and current KeeperHub Quickstart, MCP, Agentic Wallet, and Direct Execution documentation.
- Produces: a dated eligibility decision and exact stop conditions for testing, execution, publication, bounty application, and submission.

- [ ] **Step 1: Read the browser skill before any web action**

Read `/Users/luke/.agents/skills/ego-browser/SKILL.md` completely. Create one ego-browser task space for this hackathon goal and reuse it for the public rules, documentation, authenticated DoraHacks pages, and later receipt verification. Do not mix browser automation backends.

- [ ] **Step 2: Capture the current DoraHacks event rules**

Using ego-browser, inspect:

```text
https://dorahacks.io/hackathon/agents-onchain/detail
```

Record the checked time in `Asia/Shanghai`, displayed opening and closing times with source timezone, eligibility, judging criteria, required source visibility, video requirements, transaction/link requirements, allowed networks, team limits, and submission fields. If login is needed, hand control to the user and stop until the user explicitly says to continue.

- [ ] **Step 3: Capture the current bounty rules and application flow**

Using the same ego-browser task space, inspect:

```text
https://dorahacks.io/hackathon/bounty/1363
```

Record prize amount, evaluation criteria, eligible deliverables, whether Starter/blocker report/upstream patch satisfy the bounty, the `Apply` sequence, and whether a separate application is required after the main submission.

- [ ] **Step 4: Revalidate every KeeperHub integration contract used by the code**

Using ego-browser, inspect these current official pages:

```text
https://docs.keeperhub.com/quickstart
https://docs.keeperhub.com/ai-tools/mcp-server
https://docs.keeperhub.com/ai-tools/agentic-wallet
https://docs.keeperhub.com/api/direct-execution
```

Compare only documented/current behavior against the implemented endpoints, strict boolean `simulate: true`, status polling, OAuth/plugin onboarding, API-key handling, network, wallet semantics, and explorer link. Do not add an undocumented API, flag, environment variable, or network.

- [ ] **Step 5: Independently reverify organization wallet type and execution limits**

Using the same ego-browser task space, open `https://app.keeperhub.com`, let the user complete any account login, and stop until they explicitly resume. Navigate through the current authenticated organization UI to the wallet and billing/settings views.

Require the UI to explicitly identify the organization wallet as a Turnkey EOA and show the same public address returned by Doctor. Confirm that the current Spend Cap is present and sufficient for `0.000001 ETH` plus Sepolia Gas without committing the private limit value. If the UI says Safe, omits wallet type, shows a different address, or cannot establish the limit, stop; do not infer EOA from address shape or prior evidence.

- [ ] **Step 6: Write the compliance freeze**

Create `docs/submission/compliance-2026-07-28.md` with these exact sections:

```markdown
# Submission compliance freeze — 2026-07-28

## Sources and checked time
## Event window and eligibility
## Main-track judging and required fields
## Best Onboarding UX Improvement bounty
## KeeperHub integration contracts
## Network and transaction evidence decision
## Publication and confirmation gates
## Resolved conflicts and remaining blockers
```

Every factual row must cite its official URL and observed wording. Explicitly disclose the tagged pre-event baseline and state whether it is eligible. Record Sepolia as approved only if the current event and KeeperHub sources support it.

For authenticated organization evidence, record only checked time, explicit wallet type, matching public address, and `Spend Cap sufficient: yes/no`; do not paste account screenshots, raw responses, account identity, or the private limit.

- [ ] **Step 7: Enforce the compliance stop gate**

Stop and ask the user before proceeding if any of these remain ambiguous:

```text
pre-event source eligibility
Sepolia eligibility for the final transaction
the authoritative submission deadline
whether bounty Apply is separate
whether source must already be public before Apply
```

Do not resolve these by assumption or user preference. Proceed only with a cited official rule or written organizer clarification that is safe to quote; otherwise final execution/publication/submission remains blocked. If resolved, run `git diff --check`, then commit:

```bash
git add docs/submission/compliance-2026-07-28.md
git commit -m "docs: freeze current hackathon compliance rules"
```

---

### Task 3: Add the post-window package gate and re-run all verification

**Files:**
- Modify: `package.json`
- Create: `scripts/package-smoke.ts`
- Create: `.github/workflows/ci.yml`
- Modify: `src/agents/catalog.ts`
- Modify: `tests/setup.test.ts`
- Modify: `README.md`
- Create: `artifacts/submission/verification.md`

**Interfaces:**
- Consumes: committed lockfile, local source, guarded live integration suite, `KH_API_KEY`, and current KeeperHub environment.
- Produces: a substantive post-window reliability increment, secret-free CI, deterministic clean-tarball verification, sanitized reproducibility evidence, and a hard pass/fail gate for final onboarding and execution.

- [ ] **Step 1: Add the failing package-smoke script entry**

Use `apply_patch` to add this script in `package.json` and append it to the existing `verify` chain after `pack:check`:

```json
"test:package": "tsx scripts/package-smoke.ts"
```

The resulting end of `verify` must be:

```text
npm run pack:check && npm run test:package
```

Run:

```bash
npm run test:package
```

Expected: FAIL because `scripts/package-smoke.ts` does not exist yet.

- [ ] **Step 2: Implement the deterministic clean-package smoke test**

Create `scripts/package-smoke.ts` with this complete implementation:

```ts
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
```

- [ ] **Step 3: Run the new package gate and full local suite**

Run:

```bash
npm run test:package
npm run typecheck
npm test
```

Expected: the tarball is installed under a fresh temporary prefix, required public files are present, runtime/evidence paths are absent, packaged version is `0.1.0`, setup help is intact, typecheck passes, and all Vitest tests pass.

- [ ] **Step 4: Add secret-free CI for the substantive increment**

Create `.github/workflows/ci.yml` with this exact content:

```yaml
name: ci

on:
  push:
  pull_request:

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22.22.3
          cache: npm
      - run: npm ci
      - run: npm run verify
```

Do not add `KH_API_KEY` or run live integration in public CI. Add the CI/package-smoke command to README verification instructions, then run:

```bash
npm run verify
git diff --check
```

Expected: the new smoke gate runs as part of `verify`; all offline checks pass.

- [ ] **Step 5: Commit the post-window code increment**

Run:

```bash
git add package.json scripts/package-smoke.ts .github/workflows/ci.yml README.md
git commit -m "test: automate clean package verification"
```

Expected: the new code and CI are visibly later than `pre-event-rehearsal` and independently testable without credentials.

- [ ] **Step 6: Write the failing Claude project-scope expectations**

First run `claude mcp add --help` and require the installed current CLI to document `--scope` with `project` as an accepted value; stop if it does not. Then, in `tests/setup.test.ts`, change both Claude command expectations to exactly:

```text
claude mcp add --transport http --scope project keeperhub https://app.keeperhub.com/mcp
```

Run:

```bash
npm test -- tests/setup.test.ts
```

Expected: FAIL because the setup catalog still omits `--scope project`.

- [ ] **Step 7: Make Claude onboarding project-scoped**

In `src/agents/catalog.ts`, replace the Claude MCP argument array with:

```ts
[
  "mcp",
  "add",
  "--transport",
  "http",
  "--scope",
  "project",
  "keeperhub",
  KEEPERHUB_MCP_URL
]
```

Do not change Codex or Hermes commands.

- [ ] **Step 8: Verify and commit the onboarding UX increment**

Run:

```bash
npm test -- tests/setup.test.ts
npm run typecheck
npm run build
node dist/cli.js setup --agent claude
git diff --check
```

Expected: tests/typecheck/build pass, and preview prints the official hosted MCP command with explicit project scope without modifying any configuration.

Commit:

```bash
git add src/agents/catalog.ts tests/setup.test.ts
git commit -m "fix: keep Claude onboarding project-scoped"
```

- [ ] **Step 9: Prove the committed dependency graph from a clean install**

Run:

```bash
npm ci
npm ls --depth=0
```

Expected: install succeeds from `package-lock.json`; exact dependency versions match `package.json`; no version is silently upgraded.

- [ ] **Step 10: Run the full offline verification gate**

Run:

```bash
npm run verify
npm test -- tests/release.test.ts tests/audit.test.ts tests/cli.test.ts
```

Expected: typecheck, all non-integration Vitest tests, build, secret scan, `npm pack --dry-run`, and automated clean-package installation pass. Focused release/audit/CLI tests pass, including cancellation, non-TTY, tampering, same-key retry, poll hint, conflict, and ambiguous receipt behavior.

- [ ] **Step 11: Load the organization API key without echoing it**

Run in the active shell:

```bash
printf 'KeeperHub API key: ' >&2
IFS= read -rs KH_API_KEY
export KH_API_KEY
printf '\n' >&2
```

Expected: no key bytes appear in terminal output or shell history. Stop if the value does not have the documented organization-key shape; do not print it for diagnosis.

- [ ] **Step 12: Run guarded live integration**

Run:

```bash
npm run test:integration
```

Expected: the explicit credential check passes; the protected REST read, live Sepolia check, wallet/billing reads, authenticated MCP `tools_documentation`, and strict simulation test pass. The request guard must reject any transfer body whose `simulate` field is absent, non-boolean, or not exactly `true`.

- [ ] **Step 13: Run Doctor with the exact accepted-warning contract**

Run:

```bash
DOCTOR_JSON="$(node dist/cli.js doctor --agent all --chain-id 11155111 --json)"
node --input-type=module -e '
const report = JSON.parse(process.argv[1]);
const allowedWarnings = new Set([
  "agent.claude",
  "agent.codex",
  "agent.hermes",
  "keeperhub.wallet_type"
]);
const blocked = report.checks.filter((check) =>
  check.status === "fail"
  || check.status === "skip"
  || (check.status === "warn" && !allowedWarnings.has(check.id))
);
const walletType = report.checks.find((check) => check.id === "keeperhub.wallet_type");
if (
  blocked.length !== 0
  || walletType?.status !== "warn"
  || walletType?.evidence?.walletType !== "unknown"
  || walletType?.evidence?.executionAllowed !== false
) {
  console.error(JSON.stringify({
    blocked: blocked.map((check) => ({ id: check.id, status: check.status })),
    walletType: walletType ? { status: walletType.status, evidence: walletType.evidence } : null
  }));
  process.exit(1);
}
console.log("Pre-onboarding Doctor gate passed; Agent configuration warnings are deferred to Task 4 and wallet type requires dashboard EOA proof.");
' "$DOCTOR_JSON"
```

Expected: required checks pass for Node/npm/dependencies, API-key authentication, MCP tool invocation, Sepolia enabled/testnet state, public wallet, balance/Gas, Spend Cap, and a self-transfer simulation of exactly `0.000001 ETH`. Before fresh onboarding, only the three explicit `agent.*` configuration warnings and `keeperhub.wallet_type` may remain. Task 4 must eliminate every `agent.*` warning. Wallet type is allowed only because the verified balances API does not expose it; this warning never proves EOA and must be paired with the independent current dashboard proof captured in Task 2. Any other warning, failure, or skip blocks progress.

- [ ] **Step 14: Re-run the packaged artifact smoke test from its public command**

Run:

```bash
npm run test:package
```

Expected: the tarball contains only declared public files, reports `0.1.0`, and exposes setup help without requiring any Agent binary or writing Agent configuration.

- [ ] **Step 15: Write sanitized verification evidence**

Create `artifacts/submission/verification.md` with these exact sections:

```markdown
# Submission verification evidence

## Environment versions
## Clean install and dependency lock
## Typecheck, tests, build, secret scan, and package check
## Guarded live REST/MCP/simulation checks
## Doctor evidence gate and accepted warning
## Clean tarball installation
## Known non-blocking observations
```

Record commands, timestamps, pass counts, public wallet/network fields, Gas estimate, and `wouldRevert`; summarize responses rather than pasting raw bodies. Include no key, Authorization header, OAuth data, or local home path that exposes unrelated user information.

- [ ] **Step 16: Scan and commit the evidence**

Run:

```bash
npm run test:secrets
git diff --check
git add artifacts/submission/verification.md
git commit -m "test: record submission verification gate"
```

Expected: scan and whitespace checks pass. Keep `KH_API_KEY` only in the current process for the next live tasks, then `unset KH_API_KEY` when live work ends.

---

### Task 4: Prove fresh onboarding in Claude, Codex, and Hermes

**Files:**
- Create: `docs/submission/onboarding-evidence.md`

**Interfaces:**
- Consumes: built `keeperhub-starter`, official Agent CLIs, isolated homes/projects, hosted MCP OAuth for Claude/Codex, and the official Hermes plugin with write tools disabled.
- Produces: three independent authenticated read-only tool invocations, plus configured/reachable/authenticated distinctions and reproducible blocker notes.

Execute every shell block in this task with the Starter repository as the tool working directory. Each block recomputes `REPO` with `git rev-parse --show-toplevel`; never derive the repository from `pwd` after entering a temporary Agent project.

- [ ] **Step 1: Create isolated onboarding locations without touching permanent Agent homes**

Run from the repository root:

```bash
REPO="$(git rev-parse --show-toplevel)"
ONBOARDING_ROOT="/private/tmp/keeperhub-onboarding-submission"
test ! -e "$ONBOARDING_ROOT"
mkdir -p "$ONBOARDING_ROOT/claude-project" "$ONBOARDING_ROOT/codex-home" "$ONBOARDING_ROOT/codex-project" "$ONBOARDING_ROOT/hermes-home" "$ONBOARDING_ROOT/hermes-project"
```

Expected: all test configuration lives under the printed temporary root. Do not delete it until evidence is sanitized and reviewed.

- [ ] **Step 2: Rehearse Claude from a fresh project context**

Run this block from the repository root; it changes into the isolated Claude project. Inspect `claude mcp add --help` there to confirm the installed CLI’s current project/local scope semantics, then run the starter’s exact supported setup path:

```bash
REPO="$(git rev-parse --show-toplevel)"
ONBOARDING_ROOT="/private/tmp/keeperhub-onboarding-submission"
cd "$ONBOARDING_ROOT/claude-project"
node "$REPO/dist/cli.js" setup --agent claude
node "$REPO/dist/cli.js" setup --agent claude --apply
claude mcp get keeperhub
```

Expected: preview shows the exact command before apply; KeeperHub hosted MCP is configured for this fresh project context. If the current help contradicts the starter command, stop and fix/test the adapter before continuing.

- [ ] **Step 3: Complete Claude OAuth and invoke a read-only tool**

Launch Claude Code from the isolated project, run `/mcp`, and use ego-browser for the KeeperHub login. Hand control to the user for account login and stop until they explicitly say to continue. Then ask Claude to call KeeperHub `tools_documentation` only.

Expected: the tool returns authenticated documentation content. A green connection indicator alone is insufficient. Record the Agent version, configured scope, tool name, timestamp, and a short sanitized result description; do not record OAuth material.

- [ ] **Step 4: Rehearse Codex with an isolated `CODEX_HOME`**

Return to the repository, select a working Codex executable without using the broken wrapper, and inspect current official login help:

```bash
REPO="$(git rev-parse --show-toplevel)"
ONBOARDING_ROOT="/private/tmp/keeperhub-onboarding-submission"
cd "$REPO"
if codex --version; then
  CODEX_BIN="$(command -v codex)"
else
  CODEX_BIN="/Applications/ChatGPT.app/Contents/Resources/codex"
  "$CODEX_BIN" --version
fi
CODEX_HOME="$ONBOARDING_ROOT/codex-home" "$CODEX_BIN" login --help
CODEX_HOME="$ONBOARDING_ROOT/codex-home" "$CODEX_BIN" mcp add --help
CODEX_HOME="$ONBOARDING_ROOT/codex-home" "$CODEX_BIN" mcp login --help
CODEX_HOME="$ONBOARDING_ROOT/codex-home" node dist/cli.js setup --agent codex
```

Expected: current help confirms the commands printed by preview, and preview uses `codex mcp add keeperhub --url https://app.keeperhub.com/mcp` followed by `codex mcp login keeperhub`. Stop if help disagrees.

In a real PTY, run the current official `CODEX_HOME="$ONBOARDING_ROOT/codex-home" "$CODEX_BIN" login` account-authentication flow first. Use ego-browser for any web page, hand control to the user, and do not observe or record credentials. After account login succeeds, start `CODEX_HOME="$ONBOARDING_ROOT/codex-home" node dist/cli.js setup --agent codex --apply` in an ongoing PTY and handle the KeeperHub OAuth page while `codex mcp login keeperhub` is active. If the Starter subprocess does not expose an OAuth URL/page to ego-browser, stop it safely, record the blocker, and run the two exact previewed official `mcp add` and `mcp login` commands directly in the PTY; do not switch browser backends.

- [ ] **Step 5: Complete Codex OAuth and invoke a read-only tool**

Use ego-browser for the OAuth page, hand control to the user for login, and stop until explicitly resumed. Launch the same reported Codex executable with `CODEX_HOME=/private/tmp/keeperhub-onboarding-submission/codex-home` from `/private/tmp/keeperhub-onboarding-submission/codex-project`, then request KeeperHub `tools_documentation` only.

Expected: an authenticated read-only tool result from the isolated home. Record executable/version, `CODEX_HOME` isolation, tool name, timestamp, and sanitized result description.

- [ ] **Step 6: Rehearse Hermes with an isolated `HERMES_HOME` and writes disabled**

First configure an inference provider in the isolated home. Inspect `HERMES_HOME="$ONBOARDING_ROOT/hermes-home" hermes setup --help`; continue only if the current CLI confirms `hermes setup` is its official interactive provider-authentication flow. Run `HERMES_HOME="$ONBOARDING_ROOT/hermes-home" hermes setup` in a user-controlled terminal. The user enters provider credentials directly; the agent must not read, echo, copy, or include them in evidence.

After provider setup, ensure `KH_API_KEY` is present only in the environment and run:

```bash
REPO="$(git rev-parse --show-toplevel)"
ONBOARDING_ROOT="/private/tmp/keeperhub-onboarding-submission"
cd "$REPO"
printf 'KeeperHub API key: ' >&2
IFS= read -rs KH_API_KEY
export KH_API_KEY
printf '\n' >&2
unset KEEPERHUB_ENABLE_WRITES
HERMES_HOME="$ONBOARDING_ROOT/hermes-home" node dist/cli.js setup --agent hermes
HERMES_HOME="$ONBOARDING_ROOT/hermes-home" node dist/cli.js setup --agent hermes --apply
HERMES_HOME="$ONBOARDING_ROOT/hermes-home" hermes plugins list --json
```

Expected: the official `KeeperHub/hermes-plugin` is enabled, while KeeperHub write tools remain disabled.

- [ ] **Step 7: Invoke a read-only KeeperHub tool from Hermes**

Launch Hermes from `/private/tmp/keeperhub-onboarding-submission/hermes-project` with `HERMES_HOME=/private/tmp/keeperhub-onboarding-submission/hermes-home`, `KH_API_KEY` in the environment, and `KEEPERHUB_ENABLE_WRITES` unset. Request `tools_documentation` only.

Expected: an authenticated result from the official plugin. Record version, plugin status, write-disabled evidence, tool name, timestamp, and sanitized result description.

- [ ] **Step 8: Prove all three configurations with the exact Doctor warning allowlist**

Run this block from the repository root; it changes into the isolated Claude project while selecting the isolated Codex and Hermes homes:

```bash
REPO="$(git rev-parse --show-toplevel)"
ONBOARDING_ROOT="/private/tmp/keeperhub-onboarding-submission"
cd "$ONBOARDING_ROOT/claude-project"
printf 'KeeperHub API key: ' >&2
IFS= read -rs KH_API_KEY
export KH_API_KEY
printf '\n' >&2
unset KEEPERHUB_ENABLE_WRITES
export CODEX_HOME="$ONBOARDING_ROOT/codex-home"
export HERMES_HOME="$ONBOARDING_ROOT/hermes-home"
DOCTOR_JSON="$(node "$REPO/dist/cli.js" doctor --agent all --chain-id 11155111 --json)"
node --input-type=module -e '
const report = JSON.parse(process.argv[1]);
const allowedWarnings = new Set(["keeperhub.wallet_type"]);
const blocked = report.checks.filter((check) =>
  check.status === "fail"
  || check.status === "skip"
  || (check.status === "warn" && !allowedWarnings.has(check.id))
);
if (blocked.length !== 0) {
  console.error(JSON.stringify(blocked.map((check) => ({ id: check.id, status: check.status }))));
  process.exit(1);
}
console.log("Three-Agent Doctor gate passed with only keeperhub.wallet_type awaiting dashboard EOA proof.");
' "$DOCTOR_JSON"
```

Expected: all three Agent configuration checks pass together with REST authentication, authenticated MCP tool verification, Sepolia, wallet/Gas, Spend Cap, and strict simulation. Only `keeperhub.wallet_type` may remain `warn`, and the dashboard evidence must prove the same public address is a Turnkey EOA. Any other warning, failure, or skip blocks the matrix. Summarize the in-memory report rather than committing a raw response.

- [ ] **Step 9: Write and verify the three-Agent matrix**

Create `docs/submission/onboarding-evidence.md` with one row each for Claude, Codex, and Hermes and separate columns for:

```text
fresh isolation
binary and version
configured path
reachable
authentication mechanism
authenticated read-only tool
write capability state
result
reproducible blocker or none observed
```

Require all three rows to show an actual authenticated `tools_documentation` invocation. Configured-only or connected-only evidence is a failure.

- [ ] **Step 10: Scan and commit onboarding evidence**

Run:

```bash
REPO="$(git rev-parse --show-toplevel)"
cd "$REPO"
npm run test:secrets
git diff --check
git add docs/submission/onboarding-evidence.md
git commit -m "docs: prove three-agent KeeperHub onboarding"
```

Expected: evidence is sanitized and committed; isolated homes remain untracked and outside the repository.

---

### Task 5: Freeze the final release condition and obtain the recipient

**Files:**
- Create: `artifacts/submission/release-condition.json`
- Modify: `artifacts/submission/verification.md`
- Modify: `package.json`
- Create: `scripts/create-release-condition.ts`

**Interfaces:**
- Consumes: passing Task 3 gate, passing Task 4 three-Agent matrix, current submission commit, and a user-supplied public Sepolia recipient distinct from the organization wallet.
- Produces: immutable public condition content, its approved SHA-256, exact amount/network, and an independently confirmed recipient ready for simulation.

- [ ] **Step 1: Re-run the final non-mutating gate before freezing evidence**

Run:

```bash
REPO="$(git rev-parse --show-toplevel)"
cd "$REPO"
printf 'KeeperHub API key: ' >&2
IFS= read -rs KH_API_KEY
export KH_API_KEY
printf '\n' >&2
npm run verify
npm run test:integration
cd /private/tmp/keeperhub-onboarding-submission/claude-project
export CODEX_HOME=/private/tmp/keeperhub-onboarding-submission/codex-home
export HERMES_HOME=/private/tmp/keeperhub-onboarding-submission/hermes-home
DOCTOR_JSON="$(node "$REPO/dist/cli.js" doctor --agent all --chain-id 11155111 --json)"
node --input-type=module -e '
const report = JSON.parse(process.argv[1]);
const allowedWarnings = new Set(["keeperhub.wallet_type"]);
const blocked = report.checks.filter((check) =>
  check.status === "fail"
  || check.status === "skip"
  || (check.status === "warn" && !allowedWarnings.has(check.id))
);
if (blocked.length !== 0) {
  console.error(JSON.stringify(blocked.map((check) => ({ id: check.id, status: check.status }))));
  process.exit(1);
}
console.log("Doctor evidence gate passed with independent dashboard EOA proof required.");
' "$DOCTOR_JSON"
cd "$REPO"
```

Expected: every command passes and only the documented `keeperhub.wallet_type` warning remains, backed by current dashboard proof of the same Turnkey EOA address.

- [ ] **Step 2: Finalize and commit the evidence before hashing it**

Use `apply_patch` to record the final command timestamps, versions, pass counts, Doctor warning decision, dashboard EOA match, Spend Cap sufficiency, and simulation fields in `artifacts/submission/verification.md`. Do not insert that file’s own digest.

Run:

```bash
npm run test:secrets
git diff --check
git add artifacts/submission/verification.md
git commit -m "test: finalize release verification evidence"
EVIDENCE_COMMIT="$(git rev-parse HEAD)"
printf '%s\n' "$EVIDENCE_COMMIT"
```

Expected: the committed verification and onboarding files will not change again before execution. `EVIDENCE_COMMIT` is the commit containing those final files; the condition manifest deliberately references this prior commit to avoid self-reference.

- [ ] **Step 3: Add the deterministic exclusive-create condition generator**

Use `apply_patch` to add this package script:

```json
"condition:create": "tsx scripts/create-release-condition.ts"
```

Create `scripts/create-release-condition.ts` with this complete implementation:

```ts
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const verificationRecord = "artifacts/submission/verification.md";
const onboardingRecord = "docs/submission/onboarding-evidence.md";
const outputPath = "artifacts/submission/release-condition.json";

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

const verification = readFileSync(verificationRecord);
const onboarding = readFileSync(onboardingRecord);
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (!/^[0-9a-f]{40}$/u.test(sourceCommit)) {
  throw new Error("Cannot bind release condition to an exact Git commit.");
}

const condition = {
  schemaVersion: 1,
  project: "KeeperHub Agent Starter + Doctor",
  conditionType: "file-sha256",
  releaseStatement: "Release 0.000001 Sepolia ETH only after the submission verification and three-Agent onboarding evidence are complete and approved.",
  requiredGate: "npm run verify plus guarded live integration plus Doctor with only keeperhub.wallet_type allowed plus independent dashboard EOA proof plus authenticated read-only onboarding in Claude, Codex, and Hermes",
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
```

- [ ] **Step 4: Verify the generator before creating the real manifest**

Run:

```bash
npm run typecheck
npm test
npm run build
test ! -e artifacts/submission/release-condition.json
git diff --check
```

Expected: the generator typechecks, existing tests pass, production build remains clean, and exclusive creation has a fresh destination.

- [ ] **Step 5: Generate, cross-check, and hash the immutable condition**

Run:

```bash
npm run condition:create
node --input-type=module -e '
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const condition = JSON.parse(readFileSync("artifacts/submission/release-condition.json", "utf8"));
const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (
  condition.schemaVersion !== 1
  || condition.chainId !== 11155111
  || condition.amountEth !== "0.000001"
  || condition.sourceCommit !== head
  || condition.verificationSha256 !== digest(condition.verificationRecord)
  || condition.onboardingSha256 !== digest(condition.onboardingRecord)
) process.exit(1);
'
CONDITION_SHA256="$(shasum -a 256 artifacts/submission/release-condition.json | awk '{print $1}')"
printf '%s\n' "$CONDITION_SHA256"
npm run test:secrets
```

Expected: generator reports the same evidence commit from Step 2; JSON cross-check passes against final unchanged evidence files and current HEAD; exactly one 64-character condition SHA-256 is printed; secret scan passes. A second `npm run condition:create` must fail with `EEXIST` rather than overwrite the approved file.

- [ ] **Step 6: Commit the generator and condition manifest**

Run:

```bash
git add package.json scripts/create-release-condition.ts artifacts/submission/release-condition.json
git commit -m "feat: bind final release condition to verified evidence"
git status --short
```

Expected: the generated manifest remains byte-for-byte unchanged; its `sourceCommit` correctly refers to the immediately preceding finalized-evidence commit.

- [ ] **Step 7: Ask for the exact final recipient and stop**

Present the organization’s public EOA address, Sepolia `11155111`, amount `0.000001 ETH`, and the condition digest. Ask the user for one exact external Sepolia `0x` recipient address that they control or explicitly authorize.

Do not create a wallet, access a private key, reuse the organization sender as the final recipient, infer an address from browser history, or run `release prepare` until the user provides the address.

- [ ] **Step 8: Confirm the recipient is public, exact, and distinct**

Validate the supplied value as a 20-byte `0x` address and compare it case-insensitively with the live organization wallet. If equal or invalid, stop. Echo the public address back to the user and obtain acknowledgement that it is the intended Sepolia recipient.

- [ ] **Step 9: Reconfirm the immutable condition after recipient acknowledgement**

Run `git status --short` and `shasum -a 256 artifacts/submission/release-condition.json`. Expected: tracked worktree is clean and the digest is identical to Step 5. Do not modify the condition file; any change returns to Step 1 and requires new approval.

---

### Task 6: Simulate the exact final release and stop for authorization

**Files:**
- Create local: `.keeperhub/final-release-plan.json`
- Create: `audit/final-release.jsonl`
- Create conditionally: `audit/attempts/final-release-*.jsonl` using the first 12 hexadecimal characters of the expired plan digest.

**Interfaces:**
- Consumes: immutable condition digest, acknowledged external recipient, verified EOA sender, Sepolia availability, Gas/Spend Cap, and strict KeeperHub simulation.
- Produces: a ten-minute plan binding exact from/to/amount/network/condition/simulation plus a complete human-readable approval summary. It produces no signature, execution ID, or transaction hash.

- [ ] **Step 1: Assert a fresh final-run namespace**

Run:

```bash
test ! -e .keeperhub/final-release-plan.json
test ! -e .keeperhub/final-release-state.json
test ! -e audit/final-release.jsonl
```

Expected: all three commands exit zero. If any file exists, stop and inspect it; do not delete, truncate, overwrite, or create a new idempotency key casually.

- [ ] **Step 2: Re-run live prerequisites immediately before simulation**

Run:

```bash
REPO="$(git rev-parse --show-toplevel)"
printf 'KeeperHub API key: ' >&2
IFS= read -rs KH_API_KEY
export KH_API_KEY
printf '\n' >&2
cd /private/tmp/keeperhub-onboarding-submission/claude-project
export CODEX_HOME=/private/tmp/keeperhub-onboarding-submission/codex-home
export HERMES_HOME=/private/tmp/keeperhub-onboarding-submission/hermes-home
DOCTOR_JSON="$(node "$REPO/dist/cli.js" doctor --agent all --chain-id 11155111 --json)"
node --input-type=module -e '
const report = JSON.parse(process.argv[1]);
const allowedWarnings = new Set(["keeperhub.wallet_type"]);
const blocked = report.checks.filter((check) =>
  check.status === "fail"
  || check.status === "skip"
  || (check.status === "warn" && !allowedWarnings.has(check.id))
);
if (blocked.length !== 0) {
  console.error(JSON.stringify(blocked.map((check) => ({ id: check.id, status: check.status }))));
  process.exit(1);
}
console.log("Doctor evidence gate passed with independent dashboard EOA proof required.");
' "$DOCTOR_JSON"
cd "$REPO"
```

Expected: REST auth, MCP, enabled testnet, sender, balance/Gas, Spend Cap, and strict self-simulation pass. Stop for any Safe/unknown wallet, insufficient Gas, disabled network, API error, or ambiguous response. For insufficient Gas, show only the currently documented official Quickstart faucet path, ask for a separate user confirmation before claiming test ETH, use ego-browser for the faucet UI, and rerun this step afterward; never switch to mainnet or another faucet by assumption.

- [ ] **Step 3: Load the already-approved public inputs without embedding them in history**

Run:

```bash
CONDITION_SHA256="$(shasum -a 256 artifacts/submission/release-condition.json | awk '{print $1}')"
printf 'Final Sepolia recipient: ' >&2
IFS= read -r FINAL_RECIPIENT
```

Expected: `CONDITION_SHA256` matches the value approved in Task 5, and `FINAL_RECIPIENT` exactly matches the acknowledged address. These values are public, but keeping them in variables prevents accidental copy/paste drift.

- [ ] **Step 4: Prepare and simulate the exact final transfer**

Run:

```bash
node dist/cli.js release prepare \
  --condition-file artifacts/submission/release-condition.json \
  --expected-sha256 "$CONDITION_SHA256" \
  --recipient "$FINAL_RECIPIENT" \
  --amount 0.000001 \
  --chain-id 11155111 \
  --wallet-type eoa \
  --plan .keeperhub/final-release-plan.json \
  --audit audit/final-release.jsonl
```

Expected: KeeperHub returns `status=simulated`, `wouldRevert=false`, exact `from`, exact `to`, value `1000000000000` wei, and a positive Gas estimate. There is no execution ID or transaction hash, and `.keeperhub/final-release-state.json` remains absent.

- [ ] **Step 5: Validate the simulation artifact and public audit**

Run:

```bash
node dist/cli.js audit verify audit/final-release.jsonl
npm run test:secrets
stat -f '%Sp %N' .keeperhub/final-release-plan.json audit/final-release.jsonl
```

Expected: the two-row condition/simulation hash chain verifies, the secret scan passes, and only the current plan/audit exist. No private execution state exists.

- [ ] **Step 6: Define the only safe expired-plan rotation path**

Do not run this step while the plan is unexpired or after `.keeperhub/final-release-state.json` exists. If the user’s authorization does not arrive before expiry, preserve the simulation attempt with:

```bash
test ! -e .keeperhub/final-release-state.json
node dist/cli.js audit verify audit/final-release.jsonl
node --input-type=module -e '
import { readFileSync } from "node:fs";
const plan = JSON.parse(readFileSync(".keeperhub/final-release-plan.json", "utf8"));
if (Date.now() <= Date.parse(plan.expiresAt)) process.exit(1);
'
PLAN_PREFIX="$(node --input-type=module -e 'import { readFileSync } from "node:fs"; const p=JSON.parse(readFileSync(".keeperhub/final-release-plan.json","utf8")); process.stdout.write(p.planDigest.slice(0,12));')"
mkdir -p .keeperhub/expired audit/attempts
test ! -e ".keeperhub/expired/final-release-plan-$PLAN_PREFIX.json"
test ! -e "audit/attempts/final-release-$PLAN_PREFIX.jsonl"
mv -n .keeperhub/final-release-plan.json ".keeperhub/expired/final-release-plan-$PLAN_PREFIX.json"
mv -n audit/final-release.jsonl "audit/attempts/final-release-$PLAN_PREFIX.jsonl"
```

Expected: the expired plan and its verified two-row audit are preserved under digest-derived, collision-checked names; the fixed plan/audit paths are absent; no state or idempotency key ever existed. Return to Task 6 Step 1 for a fresh simulation and new approval. Never rotate, rename, delete, or replace an execution state.

- [ ] **Step 7: Present the independent funding authorization checkpoint and stop**

Show the user, without abbreviation:

```text
network name and chain ID
verified wallet type
full sender address
full recipient address
0.000001 ETH and 1000000000000 wei
condition path and full SHA-256
simulation status, full Gas estimate, and wouldRevert
full intent digest
full plan digest
plan expiry in Asia/Shanghai
confirmation phrase suffix
statement that simulation had zero on-chain side effect
statement that safe retry reuses the same persisted key
```

Ask for explicit authorization of this exact request. Do not run `release execute`, create state, sign, or broadcast in the same turn as the summary. If approval arrives after plan expiry, run the safe Step 6 rotation, prepare a fresh plan, and request approval again.

---

### Task 7: Execute exactly once, recover safely, and verify the receipt

**Files:**
- Create local: `.keeperhub/final-release-state.json`
- Modify: `audit/final-release.jsonl`
- Create: `docs/submission/final-transaction.md`

**Interfaces:**
- Consumes: unexpired approved plan, exact user authorization, real TTY, private state created before POST, and one persisted UUID idempotency key.
- Produces: one completed KeeperHub execution, one Sepolia transaction hash/link, verified receipt, retry record, and sanitized audit proof.

- [ ] **Step 1: Revalidate approval scope immediately before execution**

Confirm the current plan is unexpired and no field or condition file changed since the user’s approval. Confirm `.keeperhub/final-release-state.json` is still absent. Any mismatch returns to Task 6.

- [ ] **Step 2: Execute through a real PTY only**

Run in a real PTY:

```bash
printf 'KeeperHub API key: ' >&2
IFS= read -rs KH_API_KEY
export KH_API_KEY
printf '\n' >&2
node dist/cli.js release execute \
  --wallet-type eoa \
  --plan .keeperhub/final-release-plan.json \
  --state .keeperhub/final-release-state.json \
  --audit audit/final-release.jsonl
```

After the CLI prints the exact summary again, enter only the displayed `CONFIRM` phrase. The prior user message is the authorization; the TTY phrase is the second mechanical gate. Do not enter it if any displayed field differs.

Expected: state is created mode `0600` before the first POST and one idempotency key is reused. The current CLI submits and polls internally, then prints its JSON result only after polling returns; do not expect or invent a mid-flight execution-ID message. Keep the PTY attached and never print or copy the state file.

- [ ] **Step 3: Handle failure and retry without creating a second request**

If the CLI reports a retryable network error, 408, 429, 5xx, or `idempotency_in_progress`, allow only the built-in retry budget. If the command exits or is interrupted after state creation without a verified receipt, do not inspect the private file. In a new PTY, reload `KH_API_KEY` with the same silent prompt above, then run:

```bash
node dist/cli.js release retry \
  --plan .keeperhub/final-release-plan.json \
  --state .keeperhub/final-release-state.json \
  --audit audit/final-release.jsonl
```

If private state already contains an execution ID, `release retry` only polls that execution and does not ask for or send a replacement transaction. If no execution ID was persisted, enter only the displayed `CONFIRM RETRY` phrase; the request reuses the existing state and idempotency digest. On conflict, exhausted attempts, malformed state, changed intent, or ambiguous execution, stop; never delete state or create a replacement key.

- [ ] **Step 4: Poll the existing execution to a verified terminal state**

If the first command does not already return a verified receipt, run:

```bash
node dist/cli.js release status \
  --state .keeperhub/final-release-state.json \
  --audit audit/final-release.jsonl \
  --poll
```

Expected: polling respects `X-Poll-Interval-Hint` and ends only with `completed`, `result.success=true`, a 32-byte transaction hash, and the exact Sepolia explorer URL. An incomplete `completed` response is `ambiguous` and must not trigger rebroadcast.

- [ ] **Step 5: Verify the audit and public receipt independently**

Run:

```bash
node dist/cli.js audit verify audit/final-release.jsonl
npm run test:secrets
stat -f '%Sp %N' .keeperhub/final-release-state.json
```

Expected: audit chain verifies, secret scan passes, state mode is `-rw-------`, public audit contains only the idempotency-key SHA-256, and exactly one final execution/transaction is recorded.

Using the existing ego-browser task space, open the returned Sepolia explorer link and verify success, chain, full hash, sender, recipient, amount, and timestamp. Compare the hash and execution ID with KeeperHub status. Do not inspect unrelated account history.

After KeeperHub status and receipt verification are complete, run `unset KH_API_KEY` in every live shell used by this task.

- [ ] **Step 6: Write the final public transaction record**

Create `docs/submission/final-transaction.md` with these exact sections:

```markdown
# Final KeeperHub transaction evidence

## Approved intent
## Simulation
## Human confirmation
## KeeperHub execution and safe retries
## Sepolia receipt
## Audit-chain verification
## Pre-event onboarding transaction distinction
```

Record public from/to, amount, chain, condition/intent/plan digests, Gas estimate, execution ID, attempt/retry count, transaction hash/link, receipt status, audit row count/head, and checked time. Do not include the raw idempotency key or private state.

- [ ] **Step 7: Commit only public evidence**

Run:

```bash
npm run test:secrets
git diff --check
git add audit docs/submission/final-transaction.md
git commit -m "feat: record verified KeeperHub release"
```

Expected: `.keeperhub/` remains ignored; only the sanitized public audit and transaction document are committed.

---

### Task 8: Complete judge-facing documentation and demo materials

**Files:**
- Modify: `README.md`
- Create: `docs/submission/architecture.md`
- Create: `docs/submission/security.md`
- Create: `docs/submission/demo-script.md`
- Create: `docs/submission/dorahacks-copy.md`
- Create: `docs/submission/bounty-copy.md`

**Interfaces:**
- Consumes: compliance freeze, verification proof, three-Agent onboarding matrix, blocker report, upstream patch evidence, and final transaction record.
- Produces: clean-clone instructions, architecture/security narrative, honest demo script, and exact main/bounty submission copy.

- [ ] **Step 1: Upgrade README from rehearsal guide to submission entry point**

Keep the provenance disclosure and add a top-level “Hackathon submission” section containing:

```text
one-sentence problem and outcome
Best Onboarding UX Improvement fit
three-Agent support matrix
five-minute clean-clone path
Doctor Step/Cause/Fix/Evidence example
conditional release prepare/confirm/execute/retry/status flow
final transaction link
architecture and security links
verification commands
ranked blockers and upstream patch links
demo script/video link
explicit pre-event transaction distinction
```

Do not claim an Agent, wallet type, network, test, transaction, PR, or video status that has not been verified.

- [ ] **Step 2: Write the architecture document**

In `docs/submission/architecture.md`, document boundaries for setup adapters, Doctor orchestration, validated KeeperHub client, MCP probe, release condition, plan/state files, TTY confirmation, idempotent executor, status poller, and hash-chain audit. Include one Mermaid flow from Agent request through simulation, confirmation, KeeperHub execution, receipt, and audit.

- [ ] **Step 3: Write the security document**

In `docs/submission/security.md`, cover:

```text
assets and threat actors
no-private-key boundary
environment-only KH_API_KEY
OAuth separation
write-disabled Hermes onboarding
Sepolia and EOA enforcement
condition/intent/plan digest binding
ten-minute plan expiry
real-TTY and human approval
0600 exclusive state creation
same-key retry classification
409 and ambiguous-state stop behavior
audit redaction and hash chain
low-level library primitive warning
remaining limitations
```

- [ ] **Step 4: Write a short, honest demo script**

Make `docs/submission/demo-script.md` a timed 2–3 minute script with these shots:

```text
00:00 problem and promise
00:15 setup preview for Claude, Codex, and Hermes
00:35 Doctor failure with Step/Cause/Fix/Evidence
00:55 authenticated read-only onboarding proof
01:15 file-sha256 condition and strict simulation
01:40 exact human confirmation and real KeeperHub execution
02:05 safe retry/audit explanation
02:25 verified Sepolia receipt and bounty blocker/patch summary
```

Clearly label fixture-only failure/retry clips as local tests. Show the real final execution and explorer link separately. Blur/crop any account identity and never show credentials or `.keeperhub/final-release-state.json`.

- [ ] **Step 5: Draft main-track copy**

Write `docs/submission/dorahacks-copy.md` with final title, tagline, problem, solution, target users, innovation, KeeperHub usage, architecture, safety, three-Agent onboarding, reproducibility, final transaction link, repository link status, demo link status, limitations, and judging-criteria mapping. Use exact verified facts and concise English suitable for judges.

- [ ] **Step 6: Draft bounty copy**

Write `docs/submission/bounty-copy.md` around the actual onboarding journey, at least five ranked reproducible blockers, impact/reproducibility/fix-cost matrix, Starter/Doctor improvement, before/after developer experience, current upstream duplicate check, patch/test evidence, and mergeability. State that no external PR has been opened unless separately confirmed and actually opened.

- [ ] **Step 7: Verify documentation and links locally**

Run:

```bash
rg -n '0x35e132ed013188f0a6a60ebbe4b632c7cd843ccacfa8eb621d95aa70d8df6352' README.md docs artifacts
rg -n 'final|onboarding|pre-event|rehearsal' README.md docs/submission docs/rehearsal-report.md
npm run verify
git diff --check
```

Expected: the old hash is always labeled pre-event onboarding evidence; the new hash is always labeled final submission evidence; all local gates pass.

- [ ] **Step 8: Commit the submission documentation**

Run:

```bash
git add README.md docs/submission/architecture.md docs/submission/security.md docs/submission/demo-script.md docs/submission/dorahacks-copy.md docs/submission/bounty-copy.md
git commit -m "docs: complete hackathon submission materials"
```

---

### Task 9: Refresh the mergeable KeeperHub CLI Doctor patch

**Files:**
- Preserve: `patches/keeperhub-cli-doctor-auth-v0.10.0.patch`
- Create conditionally: `patches/keeperhub-cli-doctor-auth.patch`
- Modify: `docs/upstream-pr-draft.md`
- Modify: `artifacts/upstream/README.md`
- Modify: `artifacts/upstream/auth-regression-tests.txt`
- Modify: `artifacts/upstream/full-suite.txt`
- Modify: `artifacts/upstream/patch-validation.txt`

**Interfaces:**
- Consumes: current `https://github.com/KeeperHub/cli.git`, existing v0.10.0 patch, regression tests, and ranked Doctor blockers.
- Produces: either documented proof that upstream already fixed the issue, or a current clean-applying minimal patch plus sanitized tests and PR draft. It does not create an external PR.

- [ ] **Step 1: Inspect current upstream in a new ignored clone**

Run:

```bash
REPO="$(git rev-parse --show-toplevel)"
test ! -e "$REPO/.upstream/cli-current"
git clone --filter=blob:none https://github.com/KeeperHub/cli.git "$REPO/.upstream/cli-current"
git -C "$REPO/.upstream/cli-current" remote -v
git -C "$REPO/.upstream/cli-current" log -1 --oneline
git -C "$REPO/.upstream/cli-current" tag --list 'v*' --sort=-version:refname
```

Expected: origin is exactly KeeperHub’s CLI repository and the clone is clean. If the directory already exists, inspect it instead of deleting it.

- [ ] **Step 2: Check for an equivalent merged or open fix before editing**

Inspect current `cmd/doctor` authentication/client code and search current upstream issues/pull requests through a read-only GitHub mechanism. Compare behavior, not only titles, for all of these cases:

```text
authenticated HTTP client reuse
HTTP 200 null/empty/malformed session rejection
stable user/session identity validation
protected /api/keys API-key validation
Authorization propagation
401 and timeout handling
```

If an equivalent fix already exists, record its commit or PR URL and do not prepare a duplicate patch.

- [ ] **Step 3: Choose one evidence-backed branch without improvising a port**

Run from the Starter repository:

```bash
REPO="$(git rev-parse --show-toplevel)"
git -C "$REPO/.upstream/cli-current" status --short
git -C "$REPO/.upstream/cli-current" apply --check "$REPO/patches/keeperhub-cli-doctor-auth-v0.10.0.patch"
```

Use exactly one branch:

```text
A. Equivalent fix exists upstream: do not apply or create a patch; record the upstream URL/commit and mark the local v0.10.0 patch historical.
B. No equivalent fix exists and git apply --check passes: continue to Step 4.
C. No equivalent fix exists and git apply --check fails: stop Task 9 and write a separate concrete porting plan from the current symbols/tests; do not edit current upstream by guesswork.
```

- [ ] **Step 4: Apply the already-reviewed minimal patch when Branch B is proven**

Run:

```bash
REPO="$(git rev-parse --show-toplevel)"
git -C "$REPO/.upstream/cli-current" apply "$REPO/patches/keeperhub-cli-doctor-auth-v0.10.0.patch"
git -C "$REPO/.upstream/cli-current" diff --check
git -C "$REPO/.upstream/cli-current" diff --stat
```

Expected: changes remain confined to the existing Doctor implementation/tests and preserve the reviewed behavior: authenticated client reuse, exact single-document validation, non-empty `user.id`/`session.id`, protected `/api/keys`, Authorization propagation, 401, and timeout tests. Do not change login, token storage, wallet, billing, execution, flags, JSON schema, or exit semantics.

- [ ] **Step 5: Run focused and full upstream tests for Branch B**

Run with an explicit upstream working directory:

```bash
REPO="$(git rev-parse --show-toplevel)"
go -C "$REPO/.upstream/cli-current" test ./cmd/doctor -count=1
go -C "$REPO/.upstream/cli-current" test ./... -count=1
git -C "$REPO/.upstream/cli-current" diff --check
```

Expected: all focused and full tests pass. Preserve the exact Go version and base commit in sanitized evidence.

- [ ] **Step 6: Generate the current-base patch mechanically**

For Branch B, run:

```bash
REPO="$(git rev-parse --show-toplevel)"
git -C "$REPO/.upstream/cli-current" diff --binary --output="$REPO/patches/keeperhub-cli-doctor-auth.patch" -- cmd/doctor
git -C "$REPO/.upstream/cli-current" rev-parse HEAD
shasum -a 256 "$REPO/patches/keeperhub-cli-doctor-auth.patch"
git -C "$REPO/.upstream/cli-current" diff --check
```

Expected: the new stable-name patch is non-empty, limited to `cmd/doctor`, whitespace-clean, and tied to the printed current base commit. Preserve the v0.10.0 patch as historical evidence; do not silently replace it.

For either Branch A or B, update the three `artifacts/upstream/` evidence files plus `docs/upstream-pr-draft.md` using `apply_patch`. Branch A records the equivalent upstream URL/commit and why no PR is needed. Branch B records current base, patch SHA-256, focused/full tests, and duplicate search.

The PR draft must include title, problem, minimal behavior change, regression matrix, exact commands, compatibility/security notes, base commit, and duplicate-check result.

- [ ] **Step 7: Validate Branch B in a second clean clone**

For Branch B, run:

```bash
REPO="$(git rev-parse --show-toplevel)"
test ! -e "$REPO/.upstream/cli-validation"
git clone --filter=blob:none https://github.com/KeeperHub/cli.git "$REPO/.upstream/cli-validation"
test "$(git -C "$REPO/.upstream/cli-validation" rev-parse HEAD)" = "$(git -C "$REPO/.upstream/cli-current" rev-parse HEAD)"
git -C "$REPO/.upstream/cli-validation" apply --check "$REPO/patches/keeperhub-cli-doctor-auth.patch"
git -C "$REPO/.upstream/cli-validation" apply "$REPO/patches/keeperhub-cli-doctor-auth.patch"
go -C "$REPO/.upstream/cli-validation" test ./cmd/doctor -count=1
go -C "$REPO/.upstream/cli-validation" test ./... -count=1
git -C "$REPO/.upstream/cli-validation" diff --check
```

Expected: clean clone base matches, patch applies once, and focused/full tests pass.

- [ ] **Step 8: Commit the local contribution package from the Starter root**

Run for either Branch A or B:

```bash
REPO="$(git rev-parse --show-toplevel)"
cd "$REPO"
npm run test:secrets
git diff --check
git add patches artifacts/upstream docs/upstream-pr-draft.md README.md docs/submission/bounty-copy.md
if test -e patches/keeperhub-cli-doctor-auth.patch; then
  git commit -m "fix: refresh KeeperHub Doctor contribution patch"
else
  git commit -m "docs: record upstream Doctor resolution"
fi
```

Expected: Branch B has a clean-applying, tested current-base patch; Branch A has cited proof that a duplicate patch/PR is unnecessary. In both cases evidence is sanitized. Stop here. Opening an upstream PR requires a separate later confirmation.

---

### Task 10: Audit history, publish GitHub, and verify a clean clone

**Files:**
- Modify: `docs/submission/dorahacks-copy.md`
- Modify: `docs/submission/bounty-copy.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: completed branch, final transaction, documentation, patch evidence, and a clean secret/history audit.
- Produces: public repository `keeperhub-agent-starter-doctor`, immutable public commit URLs, and clean-clone reproducibility proof.

- [ ] **Step 1: Run working-tree and ignored-runtime secret checks**

Run:

```bash
npm run test:secrets
git status --short --ignored
git remote -v
```

Inspect ignored paths by name only. Confirm `.env`, `.keeperhub/`, Agent homes, `.upstream/`, and `artifacts/private/` are not tracked. Do not print their contents.

- [ ] **Step 2: Scan every Git object without printing matching secret text**

Run filename-only PCRE history searches with the same synthetic fixture/example prefixes allowlisted by `scripts/secret-scan.ts`:

```bash
git rev-list --all | while IFS= read -r rev; do git grep -I -l -P '\bkh_(?!your_|fixture|test|example|super_secret|acme|personal)[A-Za-z0-9_-]{20,}\b' "$rev" -- . ':(exclude).env.example' || true; done
git rev-list --all | while IFS= read -r rev; do git grep -I -l -P '\bBearer\s+(?!\$\{|<|\[|kh_fixture|kh_test|token-value)[A-Za-z0-9._~-]{16,}' "$rev" -- . || true; done
git rev-list --all | while IFS= read -r rev; do git grep -I -l -P '\bwfb_(?!your_|fixture|test|example)[A-Za-z0-9_-]{20,}\b' "$rev" -- . || true; done
git rev-list --all | while IFS= read -r rev; do git grep -I -l -P '"idempotencyKey"\s*:\s*"[0-9a-fA-F]{8}-[0-9a-fA-F-]{27}"' "$rev" -- . || true; done
git rev-list --all | while IFS= read -r rev; do git grep -I -l -E 'BEGIN (EC |RSA |OPENSSH )?PRIVATE KEY' "$rev" -- . || true; done
```

Expected: no output, including for the known `kh_fixture_*` test literals. These commands report only revision/path if a non-allowlisted match exists, never the matching credential text. Any match blocks publication until investigated and remediated without rewriting the preserved baseline unless the user explicitly approves a history operation.

- [ ] **Step 3: Run the final repository gate**

Run:

```bash
npm ci
npm run verify
git diff --check
git status --short
git log --oneline --decorate --graph --all
```

Expected: all gates pass, worktree is clean, `pre-event-rehearsal` visibly points to the original baseline, and submission commits are later on `hackathon/submission`.

- [ ] **Step 4: Ask for GitHub publication confirmation and stop**

Present the proposed public repository name `keeperhub-agent-starter-doctor`, owner resolved from the user’s authenticated GitHub CLI session, branch, commit, secret/history results, license, provenance tag, and disclosure statement. Explicitly note that publication permanently associates the public organization wallet, execution ID, and transaction hashes with this repository. Ask for permission to create the public repository, push the submission branch, and push the single provenance tag. Do not create a remote or push in the same turn as the request.

- [ ] **Step 5: Create and push only after confirmation**

After confirmation, run:

```bash
gh auth status
gh repo create keeperhub-agent-starter-doctor --public --source=. --remote=origin --push
git push origin refs/tags/pre-event-rehearsal
git remote -v
git ls-remote --heads origin hackathon/submission
git ls-remote origin 'refs/tags/pre-event-rehearsal^{}'
```

Expected: the public repository exists, `origin` has no embedded credential, the remote branch hash equals local HEAD, and the dereferenced remote tag hash is exactly `c4d7d2a38e5dea9d607913a384cdf168aec78e9c`. Do not open an upstream PR as part of this action.

- [ ] **Step 6: Verify from a genuinely clean public clone**

Run:

```bash
PUBLIC_SMOKE="$(mktemp -d /private/tmp/keeperhub-public-clone.XXXXXX)"
git clone "$(git remote get-url origin)" "$PUBLIC_SMOKE/repo"
cd "$PUBLIC_SMOKE/repo"
npm ci
npm run verify
node dist/bin.js setup --help
git rev-parse 'pre-event-rehearsal^{}'
```

Expected: clean clone installs, verifies, builds, secret-scans, packages, exposes setup help without requiring installed Agent CLIs, and resolves the tag to exactly `c4d7d2a38e5dea9d607913a384cdf168aec78e9c` with no local ignored state.

- [ ] **Step 7: Insert the verified public URLs**

Use `apply_patch` to replace repository-link status text in README, DoraHacks copy, and bounty copy with the actual public URL and immutable commit URL. Run `npm run test:secrets`, commit, and push only after showing the exact documentation-only diff to the user and obtaining confirmation for this follow-up push.

---

### Task 11: Prepare and submit DoraHacks main track and bounty separately

**Files:**
- Modify: `docs/submission/dorahacks-copy.md`
- Modify: `docs/submission/bounty-copy.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: public repository, final transaction link, local reviewed demo recording, exact main/bounty copy, live YouTube/DoraHacks forms, and separate user approvals.
- Produces: verified main submission URL/status and verified bounty application URL/status.

- [ ] **Step 1: Finalize the video without exposing private material**

Use the macOS Screenshot recording UI (`Shift-Command-5`) under direct user control and save the final take at this exact ignored path:

```text
artifacts/private/keeperhub-demo-2026-07-28.mov
```

Record against `docs/submission/demo-script.md` with notifications and unrelated applications closed. Never open `.env`, `.keeperhub/final-release-state.json`, provider settings, OAuth pages, or raw logs during capture. Run:

```bash
test -f artifacts/private/keeperhub-demo-2026-07-28.mov
mdls -name kMDItemDurationSeconds -name kMDItemPixelWidth -name kMDItemPixelHeight artifacts/private/keeperhub-demo-2026-07-28.mov
git check-ignore -v artifacts/private/keeperhub-demo-2026-07-28.mov
```

Expected: a 2–3 minute QuickTime recording exists, has readable dimensions, and is ignored by `artifacts/private/`. Review the entire file in QuickTime Player with the user. Check every frame and the audio for API keys, OAuth/account identity, browser chrome, notifications, `.env`, private state, raw idempotency key, and unrelated data. Confirm fixture failures/retries are visibly labeled while the real final transaction is separately verifiable. If any sensitive frame/audio exists, do not upload; the user discards the take and records a clean replacement at the same ignored path.

The publication destination is **YouTube, Unlisted**. Using ego-browser, open `https://studio.youtube.com/`, hand control to the user for login, and stop until explicitly resumed. Immediately before selecting the local MOV file, show the exact path, destination, and visibility and obtain upload confirmation because this sends a local file externally. Use this exact title:

```text
KeeperHub Agent Starter + Doctor — Agents Onchain Hackathon Demo
```

Set “Not made for kids,” visibility `Unlisted`, and a description containing only the verified public repository, final KeeperHub/Sepolia transaction, and provenance disclosure. Show the final metadata/visibility summary and request a second confirmation immediately before `Save`/`Publish`.

After processing completes, verify with ego-browser that the watch page shows the exact title, expected duration, completed playable resolution, and `Unlisted` state. Use the ego-browser skill’s documented unauthenticated verification mechanism to confirm the watch URL loads without the owner session. Record that verified URL in README and DoraHacks copy using a reviewed commit/push. If the user declines YouTube or either confirmation, stop and revise this step explicitly; do not silently choose another host.

- [ ] **Step 2: Open the authenticated DoraHacks main-submission form**

Read the current ego-browser skill again if its instructions or installed version changed. Reuse the hackathon task space, navigate to the authenticated submission form, and hand control to the user if login/CAPTCHA is required. Stop until the user explicitly resumes.

- [ ] **Step 3: Populate a main-submission draft and verify every field**

Use `docs/submission/dorahacks-copy.md` to fill the form. Verify title, track, description, public GitHub URL, immutable commit, demo video URL, KeeperHub final execution/transaction link, team details supplied by the user, and all required checkboxes. Do not paste the pre-event transaction into the final-transaction field.

- [ ] **Step 4: Ask for main-submission confirmation and stop before Submit**

Show the user a concise field-by-field summary and any platform preview. Ask for explicit permission to click the main `Submit` control. Do not treat earlier GitHub/video permission as DoraHacks submission permission.

- [ ] **Step 5: Submit the main entry and verify status**

After confirmation, click `Submit` once with ego-browser. Verify the resulting project URL, displayed status, timestamp, and edit availability. Record the public URL in local submission copy; avoid duplicate submission if the UI response is slow or ambiguous.

- [ ] **Step 6: Populate the Best Onboarding UX Improvement bounty application**

Open bounty `1363`, choose the already-created project if the live flow requires it, and fill from `docs/submission/bounty-copy.md`. Verify ranked blockers, Starter/Doctor value, upstream patch evidence, test logs, repository, demo, and transaction links. Do not state that an upstream PR exists unless separately confirmed and actually created.

- [ ] **Step 7: Ask for bounty `Apply` confirmation and stop**

Show the complete bounty application summary and ask for explicit permission to click `Apply`. This is independent of the main submission confirmation.

- [ ] **Step 8: Apply once and verify the bounty state**

After confirmation, click `Apply` once with ego-browser. Verify the application status/URL and timestamp. If the response is ambiguous, inspect current application state before any retry; do not submit twice.

- [ ] **Step 9: Record final public submission links**

Update README and both submission-copy documents with the verified main and bounty URLs, run `npm run verify` and `npm run test:secrets`, show the documentation-only diff, request follow-up push confirmation, then commit and push.

After all URLs/statuses are recorded and no further user action needs the live page, close the ego-browser task space.

---

## Final Acceptance Checklist

- [ ] `pre-event-rehearsal` points exactly to `c4d7d2a38e5dea9d607913a384cdf168aec78e9c`, and later work remains visibly separate on `hackathon/submission`.
- [ ] Current official rules explicitly support the project’s pre-event provenance and final Sepolia evidence, or the unresolved ambiguity has stopped execution/submission.
- [ ] Claude, Codex, and Hermes each prove a fresh authenticated read-only `tools_documentation` invocation; configured/connected alone is never counted.
- [ ] `npm ci`, `npm run verify`, focused release/audit tests, guarded live integration, the exact Doctor warning allowlist, independent dashboard EOA proof, package installation, and clean public-clone verification all pass.
- [ ] Doctor proves Sepolia enabled/testnet state, verified EOA sender, balance/Gas, Spend Cap, MCP authentication, and strict boolean simulation.
- [ ] The condition file, evidence digests, external recipient, amount, network, simulation, intent, plan, and expiry were shown before funding authorization.
- [ ] Exactly one post-window KeeperHub execution and exactly one final Sepolia transaction exist; any retries reused the same private state/key.
- [ ] KeeperHub status, transaction hash, explorer URL, chain receipt, and public audit all agree.
- [ ] No raw `KH_API_KEY`, bearer/OAuth token, private key, HMAC secret, signature material, or raw idempotency key appears in tracked files, ignored evidence output, terminal capture, video, or Git history.
- [ ] README contains clean-clone setup, three-Agent onboarding, Doctor behavior, real workflow, failure/retry/audit evidence, final transaction link, provenance, architecture, and security boundaries.
- [ ] At least five reproducible onboarding blockers are ranked by severity, impact, reproducibility, and fix cost.
- [ ] The upstream Doctor contribution is either current and cleanly mergeable with passing tests, or explicitly marked superseded by an equivalent upstream fix; no duplicate PR is opened.
- [ ] The demo video clearly distinguishes local fixture failures/retries from the real KeeperHub transaction and contains no sensitive material.
- [ ] Public GitHub creation/push, video upload, main submission, bounty Apply, and any upstream PR each have their own recorded immediate confirmation.
- [ ] Main submission and bounty application URLs/statuses are verified after a single consequential click each.
