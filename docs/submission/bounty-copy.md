# Best Onboarding UX Improvement bounty copy

## Submission title

KeeperHub Agent Starter + Doctor: from zero to a diagnosable, safely landed transaction

## What changed for a new builder

The starter turns three different Agent paths into one preview-first workflow:

```bash
npm ci
npm run build
node dist/cli.js setup --agent all
node dist/cli.js doctor --agent all --chain-id 11155111
```

Setup renders the official Claude, Codex, and Hermes commands before applying anything. Doctor then separates persisted configuration, protected REST authentication, MCP reachability, authenticated `tools_documentation`, chain/wallet/Gas/billing reads, and strict simulation. A failed check returns `Step / Cause / Fix / Evidence`, so the builder gets a copyable repair path instead of a false “connected” state.

After onboarding, the supported workflow is condition → strict simulation → exact human confirmation → exclusive mode-0600 state → same-key retry/poll → KeeperHub completion-evidence validation → independent public explorer/RPC receipt verification → hash-chain audit. This is designed to reduce time to a landed transaction without trading away operator control.

## Before and after

| Before | After |
| --- | --- |
| Agent-specific setup instructions and unclear mutation | One preview-first command for all supported Agents; `--apply` is explicit |
| “Configured” or HTTP 200 can look authenticated | Protected REST plus an actual authenticated read-only MCP tool invocation |
| Errors expose low-level symptoms | `Step / Cause / Fix / Evidence` with redacted, copyable recovery |
| Wallet/API response drift breaks checks opaquely | Compatibility decoding and strict evidence categories |
| Simulation can be mistaken for authorization | Simulation is explicitly non-transaction evidence and cannot approve broadcast |
| Retry uncertainty can create a new request | Exclusive state persists one key; retry/status reuse it and stop on conflict/ambiguity |
| Logs are difficult to publish safely | Recursive redaction plus a verifiable public JSONL hash chain |

## Ranked reproducible blockers

Impact and reproducibility use High/Medium/Low. Fix cost is S (hours), M (one or two days), or L (multi-component).

| Rank | Severity | Blocker | Affected step / impact | Reproducibility | Fix cost | Reproduction | Resolution / status |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | Device verification requires an undocumented claim request | Login cannot advance from the displayed code; High | High | M | Start device auth and submit the displayed code before `GET /api/auth/device?user_code=...`; confirmation rejects it | **Still open in observed journey:** document or automate claim |
| 2 | P0 | Device login reports success with an unusable session | Authentication appears complete but later commands fail; High | High | M | Complete the observed login, then run `kh auth status`; `get-session` returns `null` | **Still open in observed journey:** validate session before persisting/reporting success |
| 3 | P0 | `kh doctor` accepted HTTP 200 `null` as authenticated | False-positive Doctor blocks correct repair; High | High | S | Run v0.10.0 Doctor with the unusable device token | **Officially fixed upstream:** equivalent KeeperHub/cli PR #75 merged at `72f68896aea6a792edd149d4ad42f90251eca332` |
| 4 | P1 | Doctor protected checks omitted Bearer auth | Wallet/limit checks failed despite a valid key; High | High | S | Run v0.10.0 Doctor with valid `KH_API_KEY`; protected checks report authentication required | **Officially fixed upstream:** PR #75 resolves/sends Authorization and uses a protected probe |
| 5 | P1 | Anonymous workflow probe returned HTTP 200 | Invalid API keys could look valid; High | High | S | Request the observed workflow probe without credentials | **Officially fixed upstream:** PR #75 uses shared protected `/api/projects` probing |
| 6 | P1 | Hermes direct hosted-MCP OAuth connected with zero tools | Hermes onboarding reached a connection with no usable KeeperHub tools; High | High | M | Add hosted MCP with OAuth; observe async-lock failure and zero tools | **Locally worked around:** starter recommends the official plugin; upstream direct-OAuth issue remains open |
| 7 | P1 | Live wallet response used numeric `chainId` and `walletAddress` | Wallet/balance diagnosis failed on valid live data; High | High | S | Decode the live balances response with string-only `chainId` / `address` expectations | **Locally fixed:** compatibility schemas accept observed fields; no upstream claim |
| 8 | P1 | Hermes footer counted two tool calls while canonical session contained one | Evidence UI can imply duplicate actions; Medium | High | S | Invoke only `kh_tools_documentation`; compare footer `2 tool calls` with canonical redacted metadata `tool_call_count=1` and one tool message | **Still open:** treat canonical session metadata as evidence and fix footer counting |
| 9 | P1 | macOS Gatekeeper rejected the release binary | New macOS builder cannot run installed CLI; High | High | M | Install observed Homebrew release and execute the binary | **Still open in observed journey:** sign/notarize release artifacts |
| 10 | P2 | Insufficient-balance simulation exposed a low-level error | Funding repair is unclear; Medium | High | S | Simulate an amount above native balance | **Locally improved:** Doctor provides Gas context; upstream message remains a candidate fix |
| 11 | P2 | `KH_CONFIG_DIR` was documented but ignored | Isolated/predictable onboarding state is harder; Medium | High | M | Set `KH_CONFIG_DIR` during login and observe files under XDG location | **Still open in observed build:** implement or remove documentation claim |

## Starter and Doctor evidence

- Claude Code 2.1.207, Codex CLI 0.144.3, and Hermes Agent 0.19.0 each passed an authenticated read-only KeeperHub documentation invocation.
- Hermes write/execute tools were structurally withheld; Claude/Codex were prompt-scoped only.
- Doctor’s final public gate passed with exactly two approved warnings. Wallet-type and spend-cap conclusions depend on official Turnkey documentation plus independent authenticated UI proof—not Doctor alone.
- The frozen verification record preserves 8 test files / 62 tests. Current local quality is 9 test files / 65 tests, with 3 isolated Git-process condition-generator tests.
- The immutable release condition is `2cfae70f499548b2a1fd3a5b75c87ba597dacf82b63b4c9c066bc451b9042a46`, sourced from evidence commit `afcf7028a7fe365760f7df5d76cf64b3e1f80923`.

## Upstream duplicate check and mergeability

This project independently reproduced and tested the Doctor authentication defects on 2026-07-14 against KeeperHub CLI v0.10.0. The historical patch:

- reused an authenticated client;
- rejected malformed HTTP 200 session/key responses;
- covered header propagation, invalid shape, 401, timeout, focused Doctor tests, and the 28-package suite;
- has SHA-256 `aa6743d8c765580c4c8f9c97d30afe33c8fddf0a93f3cac4d91fc36000ce6d66`.

Equivalent official KeeperHub/cli [PR #75](https://github.com/KeeperHub/cli/pull/75) later merged independently at `72f68896aea6a792edd149d4ad42f90251eca332`. It resolves/sends Authorization and shares a protected `/api/projects` credential probe. No duplicate PR, branch push, or external patch submission was created from this repository. We claim no authorship of or influence on PR #75. The preserved v0.10.0 patch is historical evidence, not a current merge proposal.

The eligible standalone starter/teardown contribution is the TypeScript package described here: preview-first setup adapters, structured Doctor output, compatibility checks, strict release state machine, tests, and documentation. It does not require changes to the official CLI to be useful.

## Transaction and application status

- Final recipient: **Pending — not supplied.**
- Final KeeperHub execution/receipt: **Pending — requires the separately authorized exact-summary checkpoint.**
- Repository URL: **Pending — requires the separately authorized publication checkpoint.**
- Demo URL: **Pending — requires final execution, privacy review, and upload checkpoint.**
- DoraHacks BUIDL URL: **Pending — no submission exists.**
- Bounty application URL: **Pending — no application exists.**

The receipt ending `...6352` is **pre-event onboarding evidence only**, never final transaction evidence.

Eligibility is not claimed as resolved. Written clarification remains required for (1) pre-event source eligibility, (2) the authoritative deadline/timezone, and (3) when the source repository must be public before `Apply`. Main submission and bounty `Apply` are separate consequential gates and each requires its own immediate confirmation.
