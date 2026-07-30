# KeeperHub hackathon delivery plan

Status: **DELIVERY PREPARATION — FINAL RECORDING NOT RUN**

This document replaces the earlier step-by-step execution draft. Git history preserves that draft as provenance, but its live Doctor, online integration, simulation, plan-creation, expiry-recovery, and audit-creation instructions are retired. The only runnable final-execution procedure is [the single-recording runbook](../../submission/recording-runbook.md), governed by [the machine-readable static policy](../../../artifacts/submission/recording-policy.json).

## Goal

Deliver a judge-ready KeeperHub Agent Starter + Doctor for Claude Code, Codex, and Hermes, with:

- a reproducible TypeScript/Node.js package;
- actionable `Step / Cause / Fix / Evidence` diagnosis;
- an honest three-Agent onboarding record;
- a current, minimal upstream Quickstart patch;
- a condition-bound, independently authorized Sepolia release protocol;
- complete architecture, security, bounty, video, and DoraHacks materials.

The immutable private rehearsal remains tagged at `pre-event-rehearsal` (`c4d7d2a38e5dea9d607913a384cdf168aec78e9c`). Submission work remains on `hackathon/submission`; the earlier transaction is onboarding evidence only.

## Frozen evidence

These completed evidence sets are accepted and must not be repeated merely to improve presentation:

- authenticated read-only KeeperHub documentation calls from Claude Code, Codex, and Hermes;
- the protected REST, chain, wallet, Gas, billing, MCP, and strict-simulation Doctor gate;
- the online integration gate;
- the authenticated organization observation confirming the matching full wallet address, no enabled Sepolia Safe Sender, and EVM `No cap set`;
- the preserved pre-event onboarding receipt and same-idempotency-key replay.

The frozen files remain:

- `docs/submission/compliance-2026-07-28.md`
- `docs/submission/onboarding-evidence.md`
- `artifacts/submission/verification.md`
- `artifacts/submission/release-condition.json`
- `docs/rehearsal-report.md`

They are not final-transaction evidence. Revalidate a frozen item only if its related code or external account state materially changes.

## Completed delivery work

- Public package version and provenance disclosure.
- Preview-first setup adapters for all three Agents.
- Structured Doctor with protected REST and authenticated MCP separation.
- EOA/Sepolia-only release validation, strict response parsing, exclusive private state, same-key retry, ambiguity stops, and redacted audit chaining.
- Clean-package smoke test, secret-free CI, secret scan, and offline verification.
- Ranked onboarding blockers and historical Doctor regression record.
- Current KeeperHub CLI Quickstart patch, clean-apply evidence, focused Go tests, and a PR draft.
- Judge-facing README, architecture, security model, demo script, form-field map, and DoraHacks/bounty copy.

## Current upstream contribution

The mergeable candidate is the documentation correction in `patches/keeperhub-cli-quickstart-auth.patch`, validated against KeeperHub CLI v0.13.1 commit `ef71237aecf9f448f65f808b859423bd99618149`.

It corrects the Quickstart so device login matches current behavior: the operator opens the printed URL, confirms the one-time code, and the CLI stores the resulting organization API key in the printed `hosts.yml` path. Validation and focused-test evidence live under `artifacts/upstream/quickstart-*`; the prepared draft is `docs/upstream-quickstart-pr-draft.md`.

The older v0.10.0 Doctor patch remains historical evidence only. Equivalent official PR #75 merged independently, so no duplicate Doctor PR was opened and no authorship or influence is claimed. No upstream PR may be submitted without a new immediate user confirmation.

## Before recording: frozen evidence and offline verification only

Until the formal recording begins:

1. Finish code, documentation, static fixtures, and submission copy.
2. Run only the offline gate:

   ```bash
   npm run verify
   ```

3. Confirm the tracked release condition still has SHA-256 `2cfae70f499548b2a1fd3a5b75c87ba597dacf82b63b4c9c066bc451b9042a46`.
4. Confirm the final plan, state, audit, and raw video are still absent.
5. Keep the recipient, final execution, GitHub publication, video upload, DoraHacks submission, and bounty application blocked behind their named checkpoints.

No live onboarding, Doctor, online integration, evidence-refresh simulation, or final release artifact may run in this phase. Local unit tests use fixtures and make no KeeperHub call.

## Formal recording handoff

The final network sequence is deferred in full to `docs/submission/recording-runbook.md`. It may begin only after:

- the user supplies and approves a recipient distinct from the organization sender;
- remaining official-rule blockers are resolved;
- the recording and privacy setup is ready;
- the final plan, state, and audit paths are confirmed absent;
- the user explicitly starts the one continuous raw recording.

Inside that recording, the protocol permits one strict final simulation, then shows the complete sanitized plan summary. Simulation grants no authority. The user must independently authorize that exact summary before execution starts, after which the CLI separately requires the plan-digest-bound phrase in a real TTY. The same recording then shows KeeperHub status, an independent successful Sepolia receipt check, and finally audit verification.

Failure, expiry, ambiguity, interruption, or privacy exposure hard-aborts. There is no automatic second simulation and no attempt may be silently relabeled as final.

## External-action checkpoints

Each action below requires a separate, immediate user confirmation at the moment it becomes actionable:

1. final recipient approval;
2. exact post-simulation transaction authorization;
3. upstream Quickstart PR creation;
4. GitHub repository publication;
5. reviewed video upload;
6. DoraHacks main `Submit`;
7. Best Onboarding UX Improvement bounty `Apply`.

One confirmation never authorizes another action.

## Remaining deliverables

| Deliverable | State | Completion evidence |
| --- | --- | --- |
| Starter, Doctor, release safety, tests | Ready for offline gate | `src/`, `tests/`, `.github/workflows/ci.yml` |
| Three-Agent onboarding | Frozen complete | `docs/submission/onboarding-evidence.md` |
| Current upstream patch package | Prepared locally | `patches/keeperhub-cli-quickstart-auth.patch`, `artifacts/upstream/quickstart-*`, `docs/upstream-quickstart-pr-draft.md` |
| Judge materials | Prepared; pending final URLs | `README.md`, `docs/submission/`, `artifacts/submission/delivery-gate.*` |
| Final recipient | Blocked | User-supplied and separately approved |
| Final transaction and receipt | Recording-only, not run | No final plan, state, audit, execution ID, hash, or receipt exists |
| Public repository and video | Blocked | Separate publication/upload approvals |
| DoraHacks submission and bounty application | Blocked | Separate final confirmations |

## Safety invariants

- Ethereum Sepolia `11155111`, wallet type `eoa`, and amount `0.000001 ETH` are fixed.
- The organization sender is `0x9b5f9ac9bd9e178962a50582f2b42b5523fcd042`; the final recipient must differ.
- No private key, seed phrase, OAuth token, raw `KH_API_KEY`, HMAC secret, signature material, or raw idempotency key may enter source, logs, screenshots, video, or public evidence.
- Mainnet and Safe execution remain blocked.
- The final private state is mode `0600`; public audit data contains only a digest of the idempotency key.
- KeeperHub completion evidence is not an independent onchain receipt. The public receipt is checked separately before the audit is presented as final evidence.
- Browser work, when required later, uses only ego-browser after reading its skill instructions; login/user takeover remains a hard stop until the user explicitly resumes.
