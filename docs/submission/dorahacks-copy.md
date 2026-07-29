# DoraHacks submission copy

## Title

KeeperHub Agent Starter + Doctor

## Tagline

From clean clone to authenticated Agent proof and a human-confirmed, idempotent KeeperHub release—with actionable diagnostics at every step.

## Problem

Agent onboarding fails in ways that look deceptively successful: configuration can be mistaken for authentication, public endpoints can validate bad credentials, Agent setup differs, wallet response shapes drift, and ambiguous retries can risk duplicate transfers. Builders need a fast path to a landed transaction without hiding these boundaries.

## Solution

A TypeScript starter for Claude Code, Codex, and Hermes that previews official setup commands, verifies protected REST and authenticated MCP `tools_documentation`, diagnoses failures as `Step / Cause / Fix / Evidence`, and wraps a conditional KeeperHub transfer in strict simulation, exact real-TTY approval, exclusive private state, same-key recovery, KeeperHub completion-evidence validation, and a redacted hash-chain audit. Independent public explorer/RPC receipt verification remains a separate final-evidence step.

## Target users

Hackathon builders and Agent developers who need reproducible KeeperHub onboarding, clear failure recovery, and a safety-first route from intent to an auditable onchain outcome.

## Innovation

The project treats onboarding and execution as one evidence pipeline. “Configured,” “reachable,” “authenticated,” “simulated,” “submitted,” and “verified onchain” are separate states. A file-SHA-256 condition binds approved evidence to the exact transfer intent; a ten-minute plan and typed digest confirmation prevent stale or altered execution; ambiguous completion stops rather than rebroadcasting.

## KeeperHub usage

- Official hosted MCP for Claude/Codex and official Hermes plugin
- Authenticated `tools_documentation`
- Protected REST diagnostics
- `/api/chains` for live Sepolia support
- `/api/execute/transfer` with strict boolean simulation, then idempotent execution
- `/api/execute/{executionId}/status` polling and KeeperHub-returned transaction-hash/link completion evidence

Network: Ethereum Sepolia (`11155111`). Amount: `0.000001 ETH`. Public organization wallet: `0x9b5f9ac9bd9e178962a50582f2b42b5523fcd042`. Turnkey EOA and spend-cap conclusions are based on official KeeperHub Turnkey documentation plus independent authenticated UI proof, not Doctor alone.

## Architecture

Setup adapters feed a structured Doctor and validated KeeperHub client. Release preparation binds a workspace-contained file hash, EOA/Sepolia transfer intent, and strict simulation into digests. Execution requires a real TTY, then creates exclusive mode-0600 state with one idempotency key. Retry/status reuse that key. The CLI accepts KeeperHub completion evidence only when status is completed, success is true, the hash is valid, and the Sepolia Etherscan URL has the exact matching shape; a separate public explorer/RPC receipt check is required for final onchain proof. Every public event joins a redacted JSONL hash chain.

## Safety

No private keys, seed phrases, wallet signatures, OAuth tokens, or HMAC secrets are accepted. `KH_API_KEY` comes from the process environment, optionally populated by the ignored mode-0600 `.env` loader; it is never a CLI argument or output. Mainnet and Safe release paths are blocked. Plans expire in ten minutes. HTTP 409 blocks, ambiguous completion never produces a replacement key, and low-level client primitives are explicitly outside the supported release workflow.

## Three-Agent onboarding

Claude Code 2.1.207, Codex CLI 0.144.3, and Hermes Agent 0.19.0 each passed one authenticated read-only KeeperHub documentation invocation. Hermes structurally withheld ten write/execute tools; Claude and Codex were read-only by prompt scope, not structural tool removal.

## Reproducibility

```bash
npm ci
npm run verify
node dist/cli.js setup --agent all
node dist/cli.js doctor --agent all --chain-id 11155111 --json
```

The frozen verification evidence records its historical 8-test-file / 62-test gate. Current local quality is 9 test files / 65 tests, including 3 isolated Git-process tests for immutable condition generation. Condition SHA-256: `2cfae70f499548b2a1fd3a5b75c87ba597dacf82b63b4c9c066bc451b9042a46`; evidence source commit: `afcf7028a7fe365760f7df5d76cf64b3e1f80923`.

## Links and execution status

- Source repository: **Pending — requires the separately authorized publication checkpoint.**
- Demo video: **Pending — requires a compliant final execution and separately authorized upload checkpoint.**
- Final transaction: **Pending — no final recipient, signing, execution, hash, or receipt exists.**
- DoraHacks submission URL: **Pending — submission has not been authorized or created.**
- Bounty application URL: **Pending — application has not been authorized or created.**

The existing transaction ending `...6352` is **pre-event onboarding evidence only** and is excluded from the final-transaction field.

## Limitations and eligibility status

The CLI controls are not an OS sandbox; Claude/Codex write-tool restriction was prompt-scoped; redaction and a local hash chain do not replace host security or external notarization. Final execution also requires a distinct approved recipient and exact human confirmation.

Submission eligibility is **not resolved**. Three official-rule ambiguities remain:

1. whether the tagged July 14 pre-event source baseline is eligible;
2. which displayed deadline is authoritative because UTC+2 body text conflicts with a timezone-less timeline widget;
3. when the required source repository must become public before `Apply`.

Written organizer/platform clarification is required before final execution, repository publication, agreement, submission, or bounty application.

## Judging-criteria map

| Criterion | Evidence |
| --- | --- |
| KeeperHub onchain execution | Implemented conditional execution/status/completion-evidence path; independent public receipt verification and **final real execution remain pending separately authorized checkpoints** |
| KeeperHub feature depth | Hosted MCP, official Hermes plugin, protected REST, strict simulation, direct execution, idempotency, polling, completion-evidence validation, audit; independent public receipt verification remains pending |
| Reliability and observability | Structured Doctor contract, strict schemas, intent/plan/state digests, same-key recovery, ambiguity stop, audit verification |
| Originality and usefulness | Three-Agent onboarding plus evidence-category separation and a digest-bound human release protocol |
| Integration quality / developer experience | Five-command clean-clone preview, explicit apply/authentication/Doctor steps, copyable fixes, package smoke test, blocker teardown |
| Working transactions, not mockups | Pre-event receipt is disclosed only as onboarding evidence; the required final KeeperHub Sepolia receipt remains pending |
