# DoraHacks submission copy

## Title

KeeperHub Agent Starter + Doctor

## Tagline

From clean clone to authenticated Agent proof and a human-confirmed, idempotent KeeperHub release—with actionable diagnostics at every step.

## Problem

Agent onboarding fails in ways that look deceptively successful: configuration can be mistaken for authentication, public endpoints can validate bad credentials, Agent setup differs, wallet response shapes drift, and ambiguous retries can risk duplicate transfers. Builders need a fast path to a landed transaction without hiding these boundaries.

## Solution

A TypeScript starter for Claude Code, Codex, and Hermes that previews official setup commands, verifies protected REST and authenticated MCP `tools_documentation`, diagnoses failures as `Step / Cause / Fix / Evidence`, and wraps a conditional KeeperHub transfer in strict simulation, exact real-TTY approval, exclusive private state, same-key recovery, KeeperHub completion-evidence validation, a redacted hash-chain audit, and independent public receipt verification.

Final execution status is `completed-and-verified`. One approved Sepolia release passed strict simulation and exact human confirmation, reused one request identity through two safe retries, completed once through KeeperHub, and produced an independently verified public receipt plus an eight-record redacted audit chain.

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

Network: Ethereum Sepolia (`11155111`). Amount: `0.000001 ETH`. Public organization wallet: `0x9b5f9ac9bd9e178962a50582f2b42b5523fcd042`. Turnkey EOA and spend-cap conclusions are based on official KeeperHub Turnkey documentation plus a recorded authenticated observation, not Doctor alone. Raw authenticated UI material is unavailable in the public repository.

## Architecture

Setup adapters feed a structured Doctor and validated KeeperHub client. Release preparation binds a workspace-contained file hash, EOA/Sepolia transfer intent, and strict simulation into digests. The final namespace is exactly `.keeperhub/final-release-plan.json`, `.keeperhub/final-release-state.json`, and `audit/final-release.jsonl`; default release paths are non-final rehearsal. Execution follows the single-recording authorization order, creates exclusive mode-0600 state with one idempotency key, and requires a real TTY. Retry/status reuse that key. The CLI accepts KeeperHub completion evidence only when status is completed, success is true, the hash is valid, and the Sepolia Etherscan URL has the exact matching shape; a separate public explorer/RPC receipt check is required for final onchain evidence. Every public event joins a redacted JSONL hash chain.

## Safety

No private keys, seed phrases, wallet signatures, OAuth tokens, or HMAC secrets are accepted. `KH_API_KEY` comes from the process environment, optionally populated by the ignored mode-0600 `.env` loader; it is never a CLI argument or output. Mainnet and Safe release paths are blocked. Plans expire in ten minutes. HTTP 409 blocks, ambiguous completion never produces a replacement key, and low-level client primitives are explicitly outside the supported release workflow. Failure or expiry hard-aborts with no automatic second simulation.

## Three-Agent onboarding

Claude Code 2.1.207, Codex CLI 0.144.3, and Hermes Agent 0.19.0 each passed one authenticated read-only KeeperHub documentation invocation. Hermes structurally withheld ten write/execute tools; Claude and Codex were read-only by prompt scope, not structural tool removal.

## Upstream contribution

A current minimal patch against KeeperHub CLI v0.13.1 corrects the Quickstart device-login description so it matches the printed URL/code and `hosts.yml` API-key storage behavior. The repository includes the patch, exact-base clean-apply evidence, documentation-generation check, focused Go tests, and a prepared PR draft. It has not been submitted upstream; PR creation requires a separate immediate confirmation. The older v0.10.0 Doctor patch is retained only as historical independent work because equivalent official PR #75 later merged; the no-duplicate decision applies only to that Doctor fix.

## Reproducibility

```bash
npm ci
npm run verify
node dist/cli.js setup --agent all
node dist/cli.js doctor --agent all --chain-id 11155111 --json
```

The frozen verification evidence records its dated offline and authenticated-live gate. The current delivery gate independently records the latest offline typecheck, unit/policy tests, build, package smoke, secret scan, link, and provenance results. Condition SHA-256: `2cfae70f499548b2a1fd3a5b75c87ba597dacf82b63b4c9c066bc451b9042a46`; evidence source commit: `afcf7028a7fe365760f7df5d76cf64b3e1f80923`.

## Links and execution status

- Source repository: **[github.com/Lukeknow0/keeperhub-agent-starter-doctor](https://github.com/Lukeknow0/keeperhub-agent-starter-doctor)** — published during the event; baseline [`bb78e88`](https://github.com/Lukeknow0/keeperhub-agent-starter-doctor/commit/bb78e881eaf1323cf0780b55327d62b333ea8382).
- Demo video: **[Three Agents. One Doctor. Two Safe Retries. One Verified Release.](https://youtu.be/EnZ03RbggBc)** — 170-second privacy-reviewed unlisted YouTube build; unauthenticated playability verified.
- Final transaction: **[Verified Sepolia receipt](https://sepolia.etherscan.io/tx/0xfcb18018db0969f984489332ee605f532acb052ce8a22b88880ef95147288975).**
- DoraHacks submission URL: **Pending — submission has not been authorized or created.**
- Bounty application URL: **Pending — application has not been authorized or created.**

The existing transaction ending `...6352` is **pre-event onboarding evidence only** and is excluded from the final-transaction field.

## Limitations and organizer clarifications

The CLI controls are not an OS sandbox; Claude/Codex write-tool restriction was prompt-scoped; redaction and a local hash chain do not replace host security or external notarization. The completed final execution used a distinct approved recipient and exact human confirmation.

The organizer has resolved the prior rule questions:

1. pre-event repository exploration and prototyping are allowed; submission and any upstream PR must occur during the official window;
2. the body deadline `2026-08-13 12:00 UTC+2` equals the authenticated Asia/Shanghai widget time `2026-08-13 18:00 UTC+8`;
3. a merged PR is not required for the onboarding bounty—a public, well-documented starter or concrete teardown shared during the event is independently eligible;
4. Sepolia is accepted without a judging penalty.

Sources and project decisions are frozen in [the 2026-07-30 clarification addendum](organizer-clarifications-2026-07-30.md). The repository was published during the event and the privacy-reviewed demo is available via an unlisted YouTube link. Main submission and separate bounty `Apply` still require independent immediate confirmation.

## Judging-criteria map

| Criterion | Evidence |
| --- | --- |
| KeeperHub onchain execution | One real condition-bound Sepolia release completed through KeeperHub; [independent receipt](https://sepolia.etherscan.io/tx/0xfcb18018db0969f984489332ee605f532acb052ce8a22b88880ef95147288975) and redacted audit are public |
| KeeperHub feature depth | Hosted MCP, official Hermes plugin, protected REST, strict simulation, direct execution, idempotency, polling, completion-evidence validation, public receipt, and audit |
| Reliability and observability | Structured Doctor contract, strict schemas, intent/plan/state digests, same-key recovery, ambiguity stop, verified hash-chain audit, and clearly labeled deterministic retry/Gas/error-state tests |
| Originality and usefulness | Three-Agent onboarding plus evidence-category separation and a digest-bound human release protocol |
| Integration quality / developer experience | Five-command clean-clone preview, explicit apply/authentication/Doctor steps, copyable fixes, package smoke test, blocker teardown |
| Working transactions, not mockups | The pre-event receipt remains onboarding-only; the distinct final KeeperHub Sepolia receipt is public and independently verified |
