# Single-recording final execution runbook

Status: **RECORDING-ONLY — NOT RUN**

This runbook supersedes every older final-execution command sequence. Older commands in the implementation plan are historical provenance and are non-runnable. The only final namespace is:

| Asset | Exact path | Visibility |
| --- | --- | --- |
| Plan | `.keeperhub/final-release-plan.json` | Private; never show or publish |
| State | `.keeperhub/final-release-state.json` | Private mode `0600`; never show or publish |
| Audit | `audit/final-release.jsonl` | Public only after redaction and successful verification |
| Video | `artifacts/private/keeperhub-demo-final.mov` | Private until frame/audio review and separate upload approval |

The defaults `.keeperhub/release-plan.json`, `.keeperhub/release-state.json`, and `audit/release.jsonl` are **non-final rehearsal** paths. They never establish final evidence.

## Readiness matrix

| Gate | State | Blocker evidence / provenance | Required owner |
| --- | --- | --- | --- |
| Single-recording policy | PASS | `artifacts/submission/recording-policy.json`; focused policy test | Repository |
| Final plan/state/audit absent before recording | WAITING | Must be checked locally immediately before capture; no raw final evidence exists | Recorder |
| Recipient and exact transfer summary | BLOCKED | Recipient has not been supplied; `artifacts/submission/release-condition.json` supplies no recipient | User |
| Eligibility/deadline/source-visibility clarification | BLOCKED | Unresolved official-rule ambiguity recorded in the submission copy | Organizer/platform |
| Formal raw screen recording | RECORDING-ONLY | `artifacts/private/keeperhub-demo-final.mov` does not yet exist as reviewed evidence | Recorder + user |
| Final strict simulation/execution/receipt/audit | RECORDING-ONLY | No final plan, execution ID, transaction hash, receipt, or final audit exists | User + KeeperHub + public chain |

`PASS` means a non-live prerequisite is verified. `WAITING` means a just-in-time check remains. `BLOCKED` means an identified external input or ruling is missing. `RECORDING-ONLY` means the action may occur only inside the one formal raw recording and has not run.

## Before capture: absence and privacy gate

Do not create the final plan or audit before recording. Confirm all three final paths are absent:

```bash
test ! -e .keeperhub/final-release-plan.json
test ! -e .keeperhub/final-release-state.json
test ! -e audit/final-release.jsonl
git check-ignore artifacts/private/keeperhub-demo-final.mov
```

Resolve every `BLOCKED` row first. Close notifications and unrelated applications. Keep `.env`, OAuth/provider pages, shell history, `.keeperhub/`, account identity, secrets, and unrelated private data off screen.

## One continuous recording window

Start the macOS raw screen recording under direct user control and save it as `artifacts/private/keeperhub-demo-final.mov`. Only after the capture indicator is visible may the final sequence begin.

Exactly one `release prepare` is permitted, and it must request strict JSON boolean `simulate: true` through the release service:

```bash
node dist/cli.js release prepare \
  --condition-file artifacts/submission/release-condition.json \
  --expected-sha256 2cfae70f499548b2a1fd3a5b75c87ba597dacf82b63b4c9c066bc451b9042a46 \
  --recipient <user-supplied-approved-recipient> \
  --amount 0.000001 \
  --chain-id 11155111 \
  --wallet-type eoa \
  --plan .keeperhub/final-release-plan.json \
  --audit audit/final-release.jsonl
```

Do not run Doctor, `test:integration`, or any live fixture prepare in the final sequence. The prepare JSON must show the complete sanitized transaction summary: Sepolia network, full organization-wallet sender, full approved recipient, amount, condition digest, strict simulation status/value/Gas/would-revert fields, intent digest, plan digest, and expiry. Prepare output does not display the TTY confirmation phrase; that plan-digest-bound phrase is displayed only by `release execute`. Keep recording while the user reviews the prepare summary.

After the summary is visible, obtain **independent user authorization** to proceed. Preparation and simulation are not authorization. Do not start execution until the user authorizes this exact summary while the same recording continues.

Then start execution with the explicit final namespace:

```bash
node dist/cli.js release execute \
  --wallet-type eoa \
  --plan .keeperhub/final-release-plan.json \
  --state .keeperhub/final-release-state.json \
  --audit audit/final-release.jsonl
```

The CLI must display the summary again. In a separate interaction at the program's real TTY prompt, the user types the exact `CONFIRM <plan-digest-prefix>` phrase displayed by the program. Independent authorization and the real-TTY phrase are two distinct gates. Piped input, a stale or changed plan, any mismatch, or cancellation is a hard stop.

After submission, use only same-state status/recovery:

```bash
node dist/cli.js release status \
  --state .keeperhub/final-release-state.json \
  --audit audit/final-release.jsonl \
  --poll
```

Show KeeperHub status and its matching execution ID/hash/link.

## Independent public receipt verification

Using the already-displayed transaction hash, independently open the matching Ethereum Sepolia transaction in a public explorer or query it through an independent public RPC. Confirm the chain is Sepolia, the receipt succeeded, and the hash, sender, recipient, and amount match the authorized plan. This check is external evidence; it is not emitted by the CLI or appended as a native audit event.

## Audit verification

Only after KeeperHub status and the independent receipt agree, verify the public hash chain:

```bash
node dist/cli.js audit verify audit/final-release.jsonl
```

Stop recording only after status, independent receipt, and audit verification have succeeded in that order.

## Hard-abort rule

Any failure, ambiguity, changed field, expired plan, denied authorization, recording interruption, privacy exposure, or receipt mismatch ends the attempt. **No automatic second simulation** is allowed. Do not run `release prepare` again in the same take, do not silently rename another attempt as final, and do not create a replacement idempotency key.

If the plan expires or the recording fails, preserve no claim of final evidence. Move or discard private attempt material only under explicit user direction, diagnose offline without live final commands, and begin a wholly new formal recording only after a new independent readiness decision.

## Post-recording gate

Review the entire raw file frame by frame and with audio before any upload. Confirm that no secrets, account identity, private state, OAuth material, notification, or unrelated data appears. The raw file's existence is not transaction proof: the final status, independently verified receipt, and verified audit must agree. Upload, DoraHacks submission, and bounty `Apply` each require their own later immediate user authorization.
