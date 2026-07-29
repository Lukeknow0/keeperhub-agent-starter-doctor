# Demo script — 2:45

Status: recording-ready except for the explicitly pending final execution/receipt shot. Fixture clips demonstrate failure and retry behavior only; they must be captioned **LOCAL TEST FIXTURE — NO NETWORK TRANSACTION**.

## Timed shot list

### 00:00–00:15 — Problem and promise

**Screen:** title, then the repository root.

**Voice:** “Getting an Agent onchain is easy to demo and hard to trust: setup differs by Agent, ‘connected’ may not mean authenticated, and an unsafe retry can duplicate a transfer. KeeperHub Agent Starter + Doctor makes the path diagnosable and puts a human-confirmed, idempotent protocol around execution.”

### 00:15–00:35 — Setup preview for three Agents

**Screen:** `node dist/cli.js setup --agent all`; highlight preview-only output for Claude, Codex, and Hermes.

**Voice:** “One starter renders the current official setup for Claude Code, Codex, and Hermes. Preview is the default. Claude and Codex use hosted MCP OAuth; Hermes uses the official plugin and keeps write tools structurally disabled unless explicitly enabled.”

### 00:35–00:55 — Doctor failure contract

**Screen:** a local fixture showing a failed check with `Step`, `Cause`, `Fix`, and redacted `Evidence`.

**Caption:** **LOCAL TEST FIXTURE — EXPECTED FAILURE, NO LIVE CALL**

**Voice:** “Failures are repair instructions, not stack traces. Every check names the step, evidence-backed cause, copyable fix, and sanitized evidence. JSON output preserves the same schema for automation.”

### 00:55–01:15 — Authenticated read-only onboarding proof

**Screen:** the public three-Agent matrix; pan across the authenticated tool and capability columns.

**Voice:** “All three Agents independently completed one authenticated read-only documentation invocation. Hermes withheld ten write and execute tools. Claude and Codex were prompt-scoped only, which we disclose rather than overstate.”

### 01:15–01:40 — Immutable condition and strict simulation

**Screen:** hash `artifacts/submission/release-condition.json`, showing expected SHA-256 `2cfae70f499548b2a1fd3a5b75c87ba597dacf82b63b4c9c066bc451b9042a46`; then show a sanitized `release prepare` summary.

**Voice:** “The approved evidence is bound at source commit `afcf7028a7fe365760f7df5d76cf64b3e1f80923`. Prepare binds that file hash to Sepolia, EOA, recipient, `0.000001 ETH`, wallet, and a strict boolean simulation. The ten-minute plan cannot survive a changed condition or intent.”

**Note:** until a final recipient is supplied, use a clearly labeled local fixture for the command output. Do not imply that this is the final plan.

### 01:40–02:05 — Exact confirmation and real KeeperHub execution

**Screen:** future real TTY summary, with network, from, separately approved recipient, amount, condition digest, simulation result, plan digest, expiry, and the exact confirmation phrase; then the KeeperHub submission/status output.

**Voice:** “Only a real TTY can approve this complete summary. The program creates one exclusive mode-0600 state file before POST, uses one idempotency key, and sends through KeeperHub.”

**Status:** **Pending — requires the separately authorized exact-summary checkpoint. No final recipient, signing, or execution exists. Record this shot only after authorization; do not substitute a fixture without the fixture caption.**

### 02:05–02:25 — Safe retry and audit

**Screen:** local tests for 409 and ambiguous completion, then `node dist/cli.js audit verify audit/release.jsonl`.

**Caption:** **LOCAL TEST FIXTURES — RETRY/AMBIGUITY BEHAVIOR, NO NETWORK TRANSACTION**

**Voice:** “Recovery reuses the same body and persisted key. A 409 blocks; incomplete completion evidence becomes ambiguous; neither path creates a replacement key. Public audit rows redact the raw key and chain every event by hash.”

### 02:25–02:45 — Receipt and onboarding bounty

**Screen A:** future KeeperHub completion output, then a separate independent public explorer/RPC check of the matching successful Sepolia receipt.

**Status:** **Pending — no final transaction hash or receipt exists.**

**Screen B:** ranked blocker table and upstream resolution row.

**Voice:** “The CLI validates KeeperHub completed status, success, a valid hash, and the exact Sepolia Etherscan URL shape. It does not verify the chain receipt itself, so final evidence adds a separate public explorer or RPC receipt check. The onboarding teardown reproduces high-impact blockers; our July 14 v0.10.0 Doctor work is historical evidence. Equivalent official PR 75 later merged independently, so we opened no duplicate and claim no authorship or influence.”

## Fixture versus final-execution rules

- Fixture-only: Doctor failures, retryable errors, HTTP 409, ambiguous KeeperHub completion evidence, cancellation, non-TTY rejection, and any plan shown before the recipient is approved.
- Real final shot: exact TTY summary, typed confirmation, KeeperHub execution/status, transaction hash and URL-shape validation, a separate independent public explorer/RPC check of the matching successful Sepolia receipt, and final audit verification.
- The pre-event transaction ending `...6352` is **onboarding evidence only**. Never show it in the final-transaction shot or field.
- If the final checkpoint has not occurred, end with a “Final execution pending” card; do not record around the missing evidence.

## Privacy shot checklist

- [ ] Crop browser chrome, account menus, email, organization/member names, contacts, and unrelated tabs.
- [ ] Never show `KH_API_KEY`, OAuth URLs/codes/tokens, shell history containing credentials, private keys, HMAC values, or the raw idempotency key.
- [ ] Never open or show `.env` or the whole `.keeperhub/` directory.
- [ ] Explicitly keep both the default `.keeperhub/release-state.json` and any custom state such as `.keeperhub/final-release-state.json` off screen; each can contain the raw idempotency key.
- [ ] Keep Hermes/Claude/Codex private session artifacts and identifiers off screen.
- [ ] Show only public wallet, approved recipient, public digests, sanitized execution ID, transaction hash/link, and public audit.
- [ ] Verify the explorer network is Sepolia and the displayed hash matches KeeperHub status.
- [ ] Caption every fixture clip and visually separate it from the future real execution.
- [ ] Run the secret scan on public artifacts and review the final export frame by frame before upload.

Video URL: **Pending — requires a compliant final transaction, privacy review, and separately authorized upload checkpoint.**
