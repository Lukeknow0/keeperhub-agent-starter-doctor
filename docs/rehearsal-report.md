# Pre-event rehearsal report

Recorded on 2026-07-14 (Asia/Shanghai). This document contains only sanitized,
public evidence. It does not contain an API key, OAuth token, private key,
signature material, or raw idempotency key.

## Compliance freeze

| Requirement | Rehearsal decision | Status |
| --- | --- | --- |
| Build window | Use the later displayed opening checkpoint: 2026-07-27 19:01 Asia/Shanghai | locked in code |
| Pre-event work | Private prototype and reproducible research only; preserve honest timestamps | active |
| Repository | Local Git only; no remote, public push, DoraHacks submission, or external PR | active |
| Transaction evidence | A real KeeperHub Sepolia onboarding transaction exists, but is explicitly excluded from the final submission | complete |
| Pre-event transaction policy | Reads and strict `simulate: true` only; no broadcast | enforced |
| Real-funds policy | Every broadcast requires a separate real-TTY confirmation for the exact digest | enforced |
| Secrets | No private key input; `KH_API_KEY` only from environment or ignored mode-0600 `.env` | enforced |
| Bounty application | External `Apply`/submission actions require separate user approval during the official window | pending |
| Final network | Continue with Sepolia until the organizer explicitly clarifies another eligible network | pending clarification |

The source timing conflict, pre-event-code eligibility, bounty application flow,
and final eligible network remain disclosure items for the eventual submission.
This rehearsal does not resolve them by assumption.

## Environment

| Component | Observed version |
| --- | --- |
| macOS | 26.4.1, arm64 |
| Node.js | v22.22.3 |
| npm | 10.9.8 |
| Claude Code | 2.1.207 |
| Codex CLI | 0.144.3 |
| Hermes Agent | 0.18.2 (2026.7.7.2) |
| KeeperHub CLI | 0.10.0, darwin/arm64 |
| Go used for upstream patch tests | 1.26.3, darwin/arm64 |

The application dependency versions are pinned exactly in `package.json` and
verified by Doctor against `npm ls --depth=0 --json`.

## Onboarding and transaction evidence

- Organization wallet: Turnkey EOA.
- Public address: `0x9b5f9ac9bd9e178962a50582f2b42b5523fcd042`.
- Network: Ethereum Sepolia (`11155111`).
- Onboarding execution ID: `04558fouwatcai4sz67b4`.
- Faucet receipt: <https://sepolia.etherscan.io/tx/0x339aeffad8f58c3cc57d86928590334f3eb6819947a3aac8c1b27adc722a53d5>.
- KeeperHub receipt: <https://sepolia.etherscan.io/tx/0x35e132ed013188f0a6a60ebbe4b632c7cd843ccacfa8eb621d95aa70d8df6352>.
- A replay with the same request and idempotency key returned the same
  execution ID and did not create a second transaction.

The transaction above occurred before the event. It proves onboarding only and
must not be represented as the final hackathon transaction.

The currently persisted Agent state is intentionally honest: Claude reports a
project-local connected hosted MCP; the normal Codex home has no `keeperhub`
entry; the global Hermes home has no enabled KeeperHub plugin. Codex and Hermes
can be rehearsed in isolated homes without altering the user's permanent
configuration. `setup` previews those exact official commands, while Doctor
reports persisted configuration separately from authenticated REST/MCP probes.

## Reproducible blockers, ranked

Scales: impact and reproducibility are High/Medium/Low; fix cost is S (hours), M
(one or two days), or L (multi-component work).

| Rank | Severity | Blocker | Impact | Reproducibility | Fix cost | Minimal fix |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | P0 | Device verification requires an undocumented claim request before the displayed code is accepted | High | High | M | Document or automate the claim step |
| 2 | P0 | Device login can report success while the resulting session is unusable | High | High | M | Validate `get-session` before persisting/reporting success |
| 3 | P0 | `kh doctor` treats HTTP 200 `null` as authenticated | High | High | S | Validate the session object and stable identity fields |
| 4 | P1 | Doctor creates unauthenticated clients for protected checks | High | High | S | Reuse the factory's authenticated HTTP client |
| 5 | P1 | An anonymous workflow probe can return HTTP 200 | High | High | S | Validate API keys through protected `/api/keys` |
| 6 | P1 | Hermes direct OAuth connects with zero tools after an async-lock failure | High | High | M | Use/fix the official KeeperHub Hermes plugin path |
| 7 | P1 | Wallet decoder expects string `chainId`, while live balances return a number | Medium | High | S | Accept documented compatible number/string forms |
| 8 | P1 | Wallet field mismatch: CLI expects `address`, live API returns `walletAddress` | High | High | S | Decode the observed field explicitly |
| 9 | P1 | Homebrew CLI binary is blocked by macOS Gatekeeper | High | High | M | Sign and notarize release artifacts |
| 10 | P2 | Insufficient-balance simulation surfaces a low-level execution error | Medium | High | S | Add a balance-specific diagnosis and repair link |
| 11 | P2 | `KH_CONFIG_DIR` is documented but ignored by the observed CLI build | Medium | High | M | Implement it or remove the claim |

The selected mergeable contribution fixes ranks 3–5 in the KeeperHub CLI
Doctor. The local patch validates the observed session shape, validates the
observed `/api/keys` object shape, rejects malformed/multi-value HTTP 200
responses, and proves Authorization propagation with regression tests.

## Rehearsal safety evidence

- `demo/proof.txt` condition SHA-256:
  `93f8d8512b94d3850151cd717c14bbe1e40ae5a9f8725276c9b7f2514d02b966`.
- `release prepare` is permitted to make only a strict boolean
  `simulate: true` request.
- The live simulate-only rehearsal returned `value=1000000000000`,
  `gasEstimate=21227`, `wouldRevert=false`, intent digest
  `71ea9823cc1f31c77ada8e0b2264d9199c08a1bf8eec4583006b1acad2ec1dcb`,
  and plan digest
  `2fcaa344dbdb1489cdf3bbabb5a474e603ea7e662f25e0b761772767e3af2903`.
- `audit verify` accepted the two-row condition/simulation chain with head
  `0978e493374a2bab65076b5715d22d1764d066e542325b87010721ebfd2490f9`.
- `release execute` and a cross-process `release retry` are hard-locked before
  2026-07-27 19:01 Asia/Shanghai.
- A real CLI execution attempt during rehearsal exited with usage code 2 at
  the pre-event lock and did not create `.keeperhub/release-state.json`.
- The private state is created exclusively with mode 0600 before any POST.
- A request may use one UUID idempotency key for the initial attempt plus no
  more than three safe retries.
- Public audit rows store only the SHA-256 of that key and form a hash chain.
- Unknown or incomplete completion evidence is `ambiguous` and is never
  replaced with a new transaction.

## Upstream contribution artifacts

- Patch: `patches/keeperhub-cli-doctor-auth-v0.10.0.patch`
- Patch SHA-256:
  `aa6743d8c765580c4c8f9c97d30afe33c8fddf0a93f3cac4d91fc36000ce6d66`
- PR draft: `docs/upstream-pr-draft.md`
- Focused and full-suite evidence: `artifacts/upstream/`

No external repository action has been performed. Opening a PR remains a
separate, explicitly confirmed action after the official window opens.

## Verification gate

- `npm ci`: pass from the committed lockfile.
- TypeScript typecheck and production build: pass.
- Local Vitest suite: 60 tests pass; integration tests are excluded here.
- Live guarded suite: 2 tests pass (protected REST reads, MCP
  `tools_documentation`, and strict simulation only).
- Secret scan: source, build output, public audit, and ignored runtime plan pass.
- `npm pack --dry-run`: pass.
- Clean temporary tarball installation: packaged binary reports
  `0.1.0-rehearsal.0` and setup preview runs.
