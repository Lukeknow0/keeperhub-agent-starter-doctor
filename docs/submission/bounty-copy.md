# Best Onboarding UX Improvement bounty copy

## Submission title

KeeperHub Agent Starter + Doctor: from zero to a diagnosable, human-controlled transaction path

## What changed for a new builder

The starter turns three different Agent paths into one preview-first workflow:

```bash
npm ci
npm run build
node dist/cli.js setup --agent all
node dist/cli.js doctor --agent all --chain-id 11155111
```

Setup renders the official Claude, Codex, and Hermes commands before applying anything. Doctor then separates persisted configuration, protected REST authentication, MCP reachability, authenticated `tools_documentation`, chain/wallet/Gas/billing reads, and strict simulation. A failed check returns `Step / Cause / Fix / Evidence`, so the builder gets a copyable repair path instead of a false “connected” state.

After onboarding, the final workflow is condition → strict simulation → full summary → independent user authorization → launch `release execute` → separate real-TTY confirmation → exclusive mode-0600 state → KeeperHub execution/status → same-key recovery → independent public-chain verification → final hash-chain audit. The completed Sepolia release followed that path; failure or expiry still hard-aborts with no automatic second simulation.

The exact final namespace is `.keeperhub/final-release-plan.json`, `.keeperhub/final-release-state.json`, and `audit/final-release.jsonl`. The default plan/state/audit paths are non-final rehearsal only.

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

| Rank | Severity | Blocker | Affected step / impact | Reproducibility | Fix cost | Reproduction | Evidence / provenance | Resolution / status |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | Device verification requires an undocumented claim request | Login cannot advance from the displayed code; High | High | M | Start device auth and submit the displayed code before `GET /api/auth/device?user_code=...`; confirmation rejects it | Recorded authenticated observation; raw UI unavailable publicly | **Still open in observed journey:** document or automate claim |
| 2 | P0 | Device login reports success with an unusable session | Authentication appears complete but later commands fail; High | High | M | Complete the observed login, then run `kh auth status`; `get-session` returns `null` | Sanitized local command evidence | **Still open in observed journey:** validate session before persisting/reporting success |
| 3 | P0 | `kh doctor` accepted HTTP 200 `null` as authenticated | False-positive Doctor blocks correct repair; High | High | S | Run v0.10.0 Doctor with the unusable device token | Historical local v0.10.0 regression evidence | **Equivalent official fix merged:** KeeperHub/cli PR #75 at `72f68896aea6a792edd149d4ad42f90251eca332` |
| 4 | P1 | Doctor protected checks omitted Bearer auth | Wallet/limit checks failed despite a valid key; High | High | S | Run v0.10.0 Doctor with valid `KH_API_KEY`; protected checks report authentication required | Historical local tests plus official PR #75 | **Equivalent official fix merged:** PR #75 resolves/sends Authorization and uses a protected probe |
| 5 | P1 | Anonymous workflow probe returned HTTP 200 | Invalid API keys could look valid; High | High | S | Request the observed workflow probe without credentials | Historical local negative evidence plus official PR #75 | **Equivalent official fix merged:** PR #75 uses shared protected `/api/projects` probing |
| 6 | P1 | Hermes direct hosted-MCP OAuth connected with zero tools | Hermes onboarding reached a connection with no usable KeeperHub tools; High | High | M | Add hosted MCP with OAuth; observe async-lock failure and zero tools | Sanitized recorded session evidence | **Locally worked around:** starter recommends the official plugin; upstream direct-OAuth status not independently resolved here |
| 7 | P1 | Observed wallet response used numeric `chainId` and `walletAddress` | Wallet/balance diagnosis failed on the observed response; High | High | S | Decode the recorded response shape with string-only `chainId` / `address` expectations | Sanitized recorded API observation; no raw response published | **Locally fixed:** compatibility schemas accept the recorded fields; no upstream claim |
| 8 | P1 | Hermes footer counted two tool calls while canonical session contained one | Evidence UI can imply duplicate actions; Medium | High | S | Invoke only `kh_tools_documentation`; compare footer `2 tool calls` with canonical redacted metadata `tool_call_count=1` and one tool message | Sanitized canonical session metadata; raw UI unavailable publicly | **Observed discrepancy:** treat canonical session metadata as evidence; upstream status unknown |
| 9 | P1 | macOS Gatekeeper rejected the observed release binary | New macOS builder could not run that installed build; High | High | M | Install the observed Homebrew release and execute the binary | Recorded local observation tied to the tested build | **Open for the observed build:** current release notarization not rechecked here |
| 10 | P2 | Insufficient-balance simulation exposed a low-level error | Funding repair is unclear; Medium | High | S | Simulate an amount above native balance | Historical sanitized simulation evidence | **Locally improved:** Doctor provides Gas context; upstream message remains only a candidate |
| 11 | P2 | `KH_CONFIG_DIR` was documented but ignored in the observed build | Isolated/predictable onboarding state is harder; Medium | High | M | Set `KH_CONFIG_DIR` during login and observe files under XDG location | Recorded local filesystem observation | **Open for the observed build:** current upstream behavior not rechecked here |

## Starter and Doctor evidence

- Claude Code 2.1.207, Codex CLI 0.144.3, and Hermes Agent 0.19.0 each passed an authenticated read-only KeeperHub documentation invocation.
- Hermes write/execute tools were structurally withheld; Claude/Codex were prompt-scoped only.
- Doctor’s recorded public gate passed with exactly two approved warnings. Wallet-type and spend-cap conclusions depend on official Turnkey documentation plus a recorded authenticated observation—not Doctor alone; raw authenticated UI material is unavailable publicly.
- The frozen verification record preserves its dated onboarding, Doctor, integration, and strict-simulation result. The current delivery gate separately records the latest offline typecheck, tests, build, package, secret, link, and provenance result without rerunning live evidence.
- The immutable release condition is `2cfae70f499548b2a1fd3a5b75c87ba597dacf82b63b4c9c066bc451b9042a46`, sourced from evidence commit `afcf7028a7fe365760f7df5d76cf64b3e1f80923`.

## Upstream duplicate check and mergeability

The current mergeable candidate is a minimal Quickstart correction validated against KeeperHub CLI v0.13.1 commit `ef71237aecf9f448f65f808b859423bd99618149`. It replaces the outdated claim that the browser opens automatically and the token is stored in the OS keyring with the current flow: open the printed URL, confirm the one-time code, and find the generated organization API key in the printed `hosts.yml` path.

- [Patch](../../patches/keeperhub-cli-quickstart-auth.patch)
- [Clean-apply and generation evidence](../../artifacts/upstream/quickstart-patch-validation.txt)
- [Focused Go-test evidence](../../artifacts/upstream/quickstart-focused-tests.txt)
- [Prepared PR draft](../upstream-quickstart-pr-draft.md)

The patch applies cleanly in an exact-base validation checkout, leaves no generated-document drift, and passes focused auth/config tests. It is prepared locally only; opening the upstream PR requires a new immediate user confirmation.

Separately, this project independently reproduced and tested the Doctor authentication defects on 2026-07-14 against KeeperHub CLI v0.10.0. The historical patch:

- reused an authenticated client;
- rejected malformed HTTP 200 session/key responses;
- covered header propagation, invalid shape, 401, timeout, focused Doctor tests, and the 28-package suite;
- has SHA-256 `aa6743d8c765580c4c8f9c97d30afe33c8fddf0a93f3cac4d91fc36000ce6d66`.

Equivalent official KeeperHub/cli [PR #75](https://github.com/KeeperHub/cli/pull/75) later merged independently at `72f68896aea6a792edd149d4ad42f90251eca332`. It resolves/sends Authorization and shares a protected `/api/projects` credential probe. No duplicate Doctor PR, branch push, or external Doctor-patch submission was created from this repository. We claim no authorship of or influence on PR #75. The preserved v0.10.0 patch is historical evidence, not a current merge proposal. The no-duplicate-PR decision applies only to the historical Doctor fix; it does not apply to the distinct current Quickstart documentation correction.

The standalone starter/teardown contribution is the TypeScript package described here: preview-first setup adapters, structured Doctor output, compatibility checks, strict release state machine, tests, and documentation. The organizer confirmed that this category is independently eligible without a merged PR when shared publicly during the event. Its utility does not depend on changes to the official CLI.

## Transaction and application status

- Final recipient: `0x7c1569bf1384d6ffec460ac36b671c2998fdcffb`.
- Final KeeperHub execution/receipt: **Completed and independently verified — [Sepolia receipt](https://sepolia.etherscan.io/tx/0xfcb18018db0969f984489332ee605f532acb052ce8a22b88880ef95147288975).**
- Repository URL: **[github.com/Lukeknow0/keeperhub-agent-starter-doctor](https://github.com/Lukeknow0/keeperhub-agent-starter-doctor)** — published during the official event window.
- Demo URL: **https://youtu.be/EnZ03RbggBc** — 170-second privacy-reviewed unlisted YouTube build; unauthenticated playability verified.
- DoraHacks BUIDL URL: **https://dorahacks.io/buidl/47398 — Under Review.**
- Bounty application: **Submitted for Best Onboarding UX Improvement using BUIDL 47398.** DoraHacks returned `Saved successfully`; no separate public application URL is exposed.

The receipt ending `...6352` is **pre-event onboarding evidence only**, never final transaction evidence.

Organizer clarification resolves pre-event prototyping, deadline conversion, Sepolia acceptance, and standalone starter/teardown eligibility; see [the dated addendum](organizer-clarifications-2026-07-30.md). The repository was published during the event before the main submission and separate bounty application. Both consequential actions were independently confirmed and completed on 2026-08-02.
