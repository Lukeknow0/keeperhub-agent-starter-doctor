# Demo script — one continuous raw take

Historical status snapshot: **RECORDING-ONLY — NOT RUN.** This file preserves the pre-execution safety plan and is not the current project status. Current outcome: [final execution completed and verified](../../artifacts/submission/final-execution.md); the submission video is a privacy-reviewed post-execution walkthrough.

The exact final namespace is `.keeperhub/final-release-plan.json`, `.keeperhub/final-release-state.json`, and `audit/final-release.jsonl`. Default release paths are non-final rehearsal only.

## Flexible shot sequence

The segment lengths are intentionally flexible. Keep the final edit concise, but let authentication evidence, the complete transaction summary, human authorization, public receipt verification, and privacy-safe transitions remain readable.

### First 30 seconds — required

- **0–5s:** title plus the one-path promise.
- **5–18s:** show one preview command expanding into Claude, Codex, and Hermes setup paths.
- **18–30s:** show one `Step / Cause / Fix / Evidence` Doctor card and the condition → KeeperHub → independent receipt flow.

**Voice:** “For Claude Code, Codex, and Hermes builders, configured can look authenticated and retry ambiguity can duplicate a transfer. This starter gives one preview-first setup and actionable diagnosis. KeeperHub provides authenticated simulation, idempotent Sepolia execution, and completion status that we match to an independent receipt.”

### Problem and promise

**Screen:** title, then the repository root.

**Voice:** “Getting an Agent onchain is easy to demo and hard to trust: setup differs by Agent, ‘connected’ may not mean authenticated, and an unsafe retry can duplicate a transfer. KeeperHub Agent Starter + Doctor makes the path diagnosable and puts a human-confirmed, idempotent protocol around execution.”

### Setup preview for three Agents

**Screen:** static, previously sanitized setup output for Claude, Codex, and Hermes. Do not run setup or Doctor during the final sequence.

**Voice:** “One starter renders the current official setup for Claude Code, Codex, and Hermes. Preview is the default. Claude and Codex use hosted MCP OAuth; Hermes uses the official plugin and keeps write tools structurally disabled unless explicitly enabled.”

### Doctor failure contract

**Screen:** a static local fixture showing a failed check with `Step`, `Cause`, `Fix`, and redacted `Evidence`.

**Caption:** **LOCAL TEST FIXTURE — EXPECTED FAILURE, NO LIVE CALL**

**Voice:** “Failures are repair instructions, not stack traces. Every check names the step, evidence-backed cause, copyable fix, and sanitized evidence. JSON output preserves the same schema for automation.”

### Authenticated read-only onboarding evidence

**Screen:** the public three-Agent matrix; pan across the authenticated tool and capability columns.

**Voice:** “All three Agents independently completed one authenticated read-only documentation invocation. Hermes withheld ten write and execute tools. Claude and Codex were prompt-scoped only, which we disclose rather than overstate.”

### The one final strict simulation

**Screen:** after the recording indicator is visible, confirm the final plan/state/audit paths were absent, hash `artifacts/submission/release-condition.json`, then run exactly one `release prepare` with `--plan .keeperhub/final-release-plan.json` and `--audit audit/final-release.jsonl`. Show strict `simulate: true` and the complete sanitized summary.

**Voice:** “The approved evidence is bound at source commit `afcf7028a7fe365760f7df5d76cf64b3e1f80923`. Prepare binds that file hash to Sepolia, EOA, recipient, `0.000001 ETH`, wallet, and a strict boolean simulation. The ten-minute plan cannot survive a changed condition or intent.”

**Status:** **Blocked until a recipient is supplied. Do not substitute a live fixture prepare and do not simulate before recording.**

### Independent authorization, then separate TTY confirmation

**Screen:** keep the full prepare JSON summary visible. It contains both full addresses, amount, condition digest, simulation result/Gas/would-revert fields, intent digest, plan digest, and expiry; it does not display the confirmation phrase. Obtain independent user authorization for that exact summary while the same recording continues. Only then start `release execute` with the explicit final plan/state/audit paths. At the separate real-TTY prompt, enter the displayed `CONFIRM <plan-digest-prefix>` phrase.

**Voice:** “Simulation granted no authority. After reviewing the complete summary, the user independently authorized this exact request. Execution repeats it and requires a separate phrase in a real TTY. The program creates one exclusive mode-0600 state file before POST, uses one idempotency key, and sends through KeeperHub.”

**Status:** **Pending — requires the separately authorized exact-summary checkpoint. No final recipient, signing, or execution exists. Record this shot only after authorization; do not substitute a fixture without the fixture caption.**

### Status and safe-recovery boundary

**Screen:** show status using `.keeperhub/final-release-state.json`. Use a static diagram for 409/ambiguity behavior; do not run retry fixtures or a second prepare.

**Caption:** **LOCAL TEST FIXTURES — RETRY/AMBIGUITY BEHAVIOR, NO NETWORK TRANSACTION**

**Voice:** “Recovery reuses the same body and persisted key. A 409 blocks; incomplete completion evidence becomes ambiguous; neither path creates a replacement key. Public audit rows redact the raw key and chain every event by hash.”

### Independent receipt, final audit, and bounty

**Screen A:** KeeperHub completion output, then a separate public-explorer check; if using RPC, show both transaction-by-hash fields and the successful receipt in Sepolia context. Then run `node dist/cli.js audit verify audit/final-release.jsonl`.

**Status:** **Pending — no final transaction hash or receipt exists.**

**Screen B:** ranked blocker table, the current Quickstart documentation patch, and the historical Doctor-resolution row.

**Voice:** “The CLI validates KeeperHub completed status, success, a valid hash, and the exact Sepolia Etherscan URL shape. It does not verify the chain receipt itself, so final evidence adds a separate public explorer or RPC receipt check. The current contribution corrects today’s Quickstart device-login storage description and has clean-apply plus focused Go-test evidence. Our July 14 v0.10.0 Doctor work is historical evidence; equivalent official PR 75 later merged independently, so the no-duplicate decision applies to that Doctor fix only.”

## Fixture versus final-execution rules

- Fixture-only: Doctor failures, retryable errors, HTTP 409, ambiguous KeeperHub completion evidence, cancellation, non-TTY rejection, and any plan shown before the recipient is approved.
- Real final shot: the only final `release prepare`, full summary, independent user authorization, separate typed real-TTY confirmation, KeeperHub execution/status, transaction hash and URL-shape validation, a separate independent public explorer/RPC check of the matching successful Sepolia receipt, and `audit/final-release.jsonl` verification.
- Do not run Doctor, `test:integration`, a live fixture prepare, or a second simulation during the final sequence.
- The pre-event transaction ending `...6352` is **onboarding evidence only**. Never show it in the final-transaction shot or field.
- Any failure, expiry, ambiguity, interruption, or privacy exposure hard-aborts the take. There is no automatic second simulation. Start a new formal recording only after a new readiness decision.
- If the final checkpoint has not occurred, do not start the formal final recording; retain the “Final execution pending” status card as a static preparation asset.

## Privacy shot checklist

- [ ] Crop browser chrome, account menus, email, organization/member names, contacts, and unrelated tabs.
- [ ] Never show `KH_API_KEY`, OAuth URLs/codes/tokens, shell history containing credentials, private keys, HMAC values, or the raw idempotency key.
- [ ] Never open or show `.env` or the whole `.keeperhub/` directory.
- [ ] Explicitly keep both the default `.keeperhub/release-state.json` and any custom state such as `.keeperhub/final-release-state.json` off screen; each can contain the raw idempotency key.
- [ ] Keep Hermes/Claude/Codex private session artifacts and identifiers off screen.
- [ ] Show only public wallet, approved recipient, public digests, sanitized execution ID, transaction hash/link, and public audit.
- [ ] Verify the explorer network is Sepolia and the displayed hash matches KeeperHub status.
- [ ] Caption every static fixture and visually separate it from the real execution.
- [ ] Run the secret scan on public artifacts and review the final export frame by frame before upload.

Video URL: **Pending — raw final video unavailable; recording has not run. A compliant final transaction, full privacy review, and separately authorized upload are required.**
