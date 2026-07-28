# Submission compliance freeze — 2026-07-28

Status: **DONE WITH CONCERNS**. Sepolia, organization-wallet EOA semantics, the active full wallet address, absence of a Sepolia Safe Sender, and EVM limit capacity are resolved. Local/offline verification and material preparation may continue. Remaining official-rule ambiguities still gate final execution/publication/submission, and any eventual real transaction requires an independent exact-summary confirmation.

## Sources and checked time

All times below are recorded in Asia/Shanghai (CST, UTC+08:00). The browser revalidation was updated through 2026-07-28 17:33:26 CST.

| Official source | Checked | Observed wording used by this freeze |
| --- | --- | --- |
| [DoraHacks event](https://dorahacks.io/hackathon/agents-onchain/detail) | 2026-07-28, session ending 15:59:10 CST | “All times are UTC+2”; “Every project must use KeeperHub as its onchain execution layer”; “Every team links a transaction their agent has executed.” |
| [DoraHacks organizer reply](https://dorahacks.io/discussion/1562060) | 2026-07-28 16:58:59 CST | Reply dated 2026/07/16 by “Malpiedi @ KeeperHub” with role “Organizer”: “Testnet (incl Sepolia) is accepted and won't be marked down, mixing execution and payment networks is fine, and mainnet is a strengthener for your reliability story rather than a rule.” |
| [DoraHacks bounty 1363](https://dorahacks.io/hackathon/bounty/1363) | 2026-07-28, session ending 15:59:10 CST | “Best Onboarding UX Improvement”; “1,000 USDC/USDT”; “Two winners will be drawn (prize of $500 per winner)”; “Stackable with the Grand Prize.” |
| [KeeperHub Hackathon Quickstart](https://docs.keeperhub.com/quickstart) | 2026-07-28, session ending 15:59:10 CST | “Testnets (recommended for hacking)” and “Ethereum Sepolia”, chainId `11155111`, status “stable”. |
| [KeeperHub MCP Server](https://docs.keeperhub.com/ai-tools/mcp-server) | 2026-07-28, session ending 15:59:10 CST | Hosted endpoint `https://app.keeperhub.com/mcp`; OAuth via browser or an organization `kh_` Bearer token for headless use. |
| [KeeperHub Agentic Wallets](https://docs.keeperhub.com/ai-tools/agentic-wallet) | 2026-07-28, session ending 15:59:10 CST | The first-party agentic wallet is a separate “server-side Turnkey custody” wallet for x402/MPP payment; the page distinguishes it from a KeeperHub creator wallet. |
| [KeeperHub Direct Execution API](https://docs.keeperhub.com/api/direct-execution) | 2026-07-28, session ending 15:59:10 CST | Organization `kh_` Bearer authentication; strict body boolean `"simulate": true`; unique `Idempotency-Key`; status polling at `/api/execute/{executionId}/status`; `transactionHash` and `transactionLink` are authoritative proof. |
| [KeeperHub Turnkey Integration](https://docs.keeperhub.com/wallet-management/turnkey) | 2026-07-28 16:58:59 CST | “Your organization’s Turnkey wallet is provisioned automatically once your email is verified”; “Topping up your Turnkey EOA with native gas tokens ... is required”; “Every workflow transaction is signed and broadcast by the EOA.” |
| [Authenticated KeeperHub UI](https://app.keeperhub.com/) | 2026-07-28 17:33:26 CST | The visible `Copy wallet address` control supplied the full expected address exactly. The visible `Organization Wallet` panel listed only `Open Turnkey EOA (EVM Compatible)` and `Open Turnkey EOA (SVM Compatible)`, displayed `Deploy a Safe`, and contained zero Safe account cards and zero Sender switches. Manage Organizations → Limits displayed EVM `No cap set`. No private limit was read or recorded; `Create Wallet` and `Deploy a Safe` were never clicked. |
| [Authenticated DoraHacks form at bounty 1363](https://dorahacks.io/hackathon/bounty/1363) | 2026-07-28, session ending 15:59:10 CST | A separate `Apply` entry exists. The flow states that a BUIDL must be submitted to the hackathon before bounty application; the observed final review also said “You have selected to apply for Best Onboarding UX Improvement.” No agreement or submit control was activated. |

## Event window and eligibility

| Decision | Official evidence | Freeze |
| --- | --- | --- |
| Opening | The [event body](https://dorahacks.io/hackathon/agents-onchain/detail) says “All times are UTC+2” and “July 27, 2026, 12:00 - Hackathon opens.” The page timeline widget separately displayed `Submission 2026/07/27 13:01` without a source timezone. | The body boundary is 2026-07-27 18:00 CST, but the widget is inconsistent/unspecified. Do not use the widget to infer pre-event eligibility. |
| Closing | The [event body](https://dorahacks.io/hackathon/agents-onchain/detail) says “August 13, 2026, 12:00 - Submission deadline. Registrations and BUIDL submissions close.” The timeline widget separately displayed `Deadline 2026/08/13 18:00` without a source timezone. | **Authoritative deadline unresolved.** Use neither value for a consequential submission until the organizer resolves the conflict in writing. |
| Participant eligibility | The [event](https://dorahacks.io/hackathon/agents-onchain/detail) says “Open to builders worldwide, solo or in teams, 18 and over” and excludes applicable-sanctions/OFAC-restricted jurisdictions. | The participant must independently satisfy age, location, platform terms, and sanctions requirements. No maximum team size is stated on the checked page. |
| Project eligibility | The [event](https://dorahacks.io/hackathon/agents-onchain/detail) says a working agent must execute through KeeperHub and describes July 27–August 13 as the “Build phase,” but it does not say whether pre-event source is allowed. | The private baseline is tagged `pre-event-rehearsal` at commit `c4d7d2a38e5dea9d607913a384cdf168aec78e9c` (authored 2026-07-14). **Its eligibility is not established; treat the project as not cleared for submission until written organizer clarification.** |

## Main-track judging and required fields

| Requirement | Official evidence | Freeze |
| --- | --- | --- |
| KeeperHub execution | The [event](https://dorahacks.io/hackathon/agents-onchain/detail) says “Every project must use KeeperHub as its onchain execution layer” and heavily weights “Working transactions, not mockups.” | A mock, simulation, or pre-event transaction cannot be represented as final execution evidence. |
| Judging | The [event](https://dorahacks.io/hackathon/agents-onchain/detail) lists execution via KeeperHub; use of MCP/CLI/x402/MPP/workflow builder/audit trail; reliability and observability; originality/usefulness; and integration quality/developer experience. | Submission material must map only verified evidence to these criteria. |
| Source | The [event header](https://dorahacks.io/hackathon/agents-onchain/detail) says “GitHub/Gitlab/Bitbucket Link Required” while “How to submit” says “A link to your source code on GitHub.” | Use GitHub conservatively. The page does not say whether the repository must already be public before `Apply`; publication and application stay blocked pending clarification. |
| Video | The [event](https://dorahacks.io/hackathon/agents-onchain/detail) requires “A short demo video showing your agent executing onchain through KeeperHub.” | Record only after a compliant final transaction exists; do not substitute the simulate-only Doctor flow. |
| Transaction link | The [event](https://dorahacks.io/hackathon/agents-onchain/detail) requires “A link to a transaction your agent executed via KeeperHub.” The [Organizer reply](https://dorahacks.io/discussion/1562060) says “Testnet (incl Sepolia) is accepted and won't be marked down.” | A verified KeeperHub Sepolia receipt may be used after the wallet safety and independent confirmation gates clear. |
| Form fields | The authenticated [DoraHacks flow](https://dorahacks.io/hackathon/bounty/1363) displayed labels/placeholders for BUIDL name, logo, vision, category, AI-agent classification, source repository, optional website, demo video, at least one social link, details, team information/invites, Telegram primary contact, backup contact, track, and agreements. | These are material-preparation fields only. No agreement or final submit control is authorized by this freeze. |

## Best Onboarding UX Improvement bounty

| Decision | Official evidence | Freeze |
| --- | --- | --- |
| Prize | [Bounty 1363](https://dorahacks.io/hackathon/bounty/1363) displays “1,000 USDC/USDT”, “Two winners will be drawn (prize of $500 per winner)”, and “Stackable with the Grand Prize.” | Two $500 awards; stackable with the Grand Prize. |
| Evaluation | [Bounty 1363](https://dorahacks.io/hackathon/bounty/1363) rewards the contribution that gets a new builder “from zero to their first landed transaction faster and with less friction” and gives a bonus for work mergeable during the event. | Center evidence on measured onboarding friction, reproducible fixes, and time-to-first-transaction. |
| Eligible deliverables | [Bounty 1363](https://dorahacks.io/hackathon/bounty/1363) explicitly lists a merged KeeperHub PR, a starter template/boilerplate, or a clear teardown with concrete proposed fixes. | The Starter qualifies as a listed category; a blocker report qualifies if it is a clear teardown with concrete fixes. An unmerged patch must not be described as a “merged PR”; it supports the starter/teardown until actually merged. |
| Application flow | [Bounty 1363](https://dorahacks.io/hackathon/bounty/1363) has a separate `Apply` entry; the authenticated flow says a BUIDL must first be submitted to the hackathon, then the bounty can be applied for. | Main submission and bounty `Apply` are separate consequential gates and require separate immediate confirmation. Neither is authorized now. |

## KeeperHub integration contracts

| Implemented surface | Current official contract | Freeze |
| --- | --- | --- |
| Hosted MCP `/mcp` | The [MCP page](https://docs.keeperhub.com/ai-tools/mcp-server) documents the hosted endpoint, browser OAuth, organization `kh_` Bearer tokens, organization scoping, and `tools_documentation` as the runtime-current reference. | Local match: endpoint constant at `src/core/constants.ts:1-2`; Claude/Codex hosted setup and OAuth plus official Hermes plugin at `src/agents/catalog.ts:15-70`; covering setup assertions at `tests/setup.test.ts:50-110`. The focused suite passed. Never log or publish the token or raw `KH_API_KEY`. |
| Chains `/api/chains` | The [Quickstart](https://docs.keeperhub.com/quickstart) calls `GET /api/chains` the “live source of truth” and says agents can read status through `list_action_schemas`. | Require `isEnabled` and `isTestnet`; do not add undocumented networks or aliases. |
| Transfer `/api/execute/transfer` | The [Direct Execution page](https://docs.keeperhub.com/api/direct-execution) documents numeric `chainId`, recipient, human-readable amount, and optional token address; organization `kh_` authentication is required. | Local match: `src/keeperhub/client.ts:100-126` implements simulation, broadcast, idempotency header, and status GET; response schemas are `src/keeperhub/schemas.ts:59-88`; covering assertions are `tests/client.test.ts:59-115`. The focused suite passed. |
| Simulation | The [Direct Execution page](https://docs.keeperhub.com/api/direct-execution) says `simulate` must be a strict boolean body field and that strings/numbers are rejected; success requires `success: true` and `wouldRevert: false`. It also says simulation creates no audit row, reserves no cap, and produces no transaction hash. | Local match: hard-coded boolean at `src/keeperhub/client.ts:100-108`; evidence validation at `src/release/service.ts:152-206`; strict/negative coverage at `tests/client.test.ts:59-68` and `tests/doctor.test.ts:105-217`. The focused suite passed. Never treat simulation as transaction evidence. |
| Broadcast/idempotency | The [Direct Execution page](https://docs.keeperhub.com/api/direct-execution) says remove `simulate`, add a unique `Idempotency-Key`, send once, and reuse the same key/body only for safe retry. | Local match: broadcast header/body at `src/keeperhub/client.ts:111-118`; pre-POST revalidation at `src/release/service.ts:115-145`; same persisted key/retry handling at `src/release/service.ts:280-330`; coverage at `tests/client.test.ts:71-115` and `tests/release.test.ts:251-298`. The focused suite passed. |
| Status/receipt | The [Direct Execution page](https://docs.keeperhub.com/api/direct-execution) documents `GET /api/execute/{executionId}/status`, the `X-Poll-Interval-Hint`, terminal states, and authoritative `transactionHash`/`transactionLink`. | Local match: receipt/link validation at `src/release/service.ts:343-369`; poll-hint/status loop at `src/release/service.ts:418-453`; coverage at `tests/release.test.ts:251-298` and `tests/release.test.ts:545-575`. The focused suite passed; completed evidence lacking a matching Sepolia receipt remains ambiguous. |
| Protected diagnostic reads | The [Quickstart](https://docs.keeperhub.com/quickstart) identifies organization `kh_` keys and `/api/keys` management, but the four mandated pages do not publish response contracts for `/api/keys`, `/api/user/wallet/balances`, or `/api/billing/subscription`. | Keep these as observed compatibility checks, not evidence of wallet type or cap sufficiency. Do not invent alternative fields/endpoints. |
| Wallet semantics | The [Turnkey Integration page](https://docs.keeperhub.com/wallet-management/turnkey) says “Your organization’s Turnkey wallet is provisioned automatically”, calls it a “Turnkey EOA”, and says “Every workflow transaction is signed and broadcast by the EOA.” The [Direct Execution page](https://docs.keeperhub.com/api/direct-execution) separately warns that a Safe-routed organization is simulated with the organization EOA as `from`. | Official documentation establishes EOA semantics. Visible UI supplied the exact expected address; its account list contained only the two Turnkey EOA cards, offered `Deploy a Safe`, and contained zero Safe cards/Sender switches. Therefore no Safe is configured and Ethereum Sepolia has no Safe Sender enabled. |

## Network and transaction evidence decision

| Item | Official evidence | Freeze |
| --- | --- | --- |
| KeeperHub Sepolia support | The [Quickstart](https://docs.keeperhub.com/quickstart) lists Ethereum Sepolia `11155111` under “Testnets (recommended for hacking)” with status “stable.” | KeeperHub integration support is confirmed. |
| Hackathon Sepolia acceptance | The [Organizer reply](https://dorahacks.io/discussion/1562060) is dated 2026/07/16, identifies “Malpiedi @ KeeperHub” as “Organizer”, and says: “Testnet (incl Sepolia) is accepted and won't be marked down, mixing execution and payment networks is fine, and mainnet is a strengthener for your reliability story rather than a rule.” | **Approved.** A Sepolia transaction is acceptable final network evidence and is not marked down merely for being testnet. |
| Explorer proof | The [Direct Execution page](https://docs.keeperhub.com/api/direct-execution) calls the status response’s `transactionHash` and `transactionLink` authoritative proof. | For the organizer-approved Sepolia network, accept only a KeeperHub-returned link whose hash matches a successful Sepolia receipt. |
| Existing transaction | The [event](https://dorahacks.io/hackathon/agents-onchain/detail) requires a transaction “your agent executed” and the pre-event-source rule is unresolved. | The existing pre-event onboarding transaction remains disclosed onboarding evidence only and is excluded from final submission evidence. |

## Publication and confirmation gates

| Action | Gate |
| --- | --- |
| Local tests, secret scan, offline documentation | Allowed; must remain non-publishing and non-broadcasting. |
| Authenticated reads / Doctor strict simulation | Existing read-only diagnostic evidence may be retained and must never be described as a transaction. Do not run a new final simulation until the active-organization wallet checks clear; `simulate: true` must remain a strict boolean. |
| Final prepare/simulation | Visible-UI prerequisites pass: copied full address exact match, zero Safe account cards/Sender switches (therefore no Sepolia Safe Sender), and EVM `No cap set`. Never click `Create Wallet`/`Deploy a Safe` or record a private limit. Preparation remains subject to the unresolved official-rule gates below. |
| Final execution | Wallet/network prerequisites pass, but execution remains gated by the unresolved official-rule items, a distinct public recipient, exact condition, unchanged successful simulation, and a fresh independent exact-summary TTY confirmation. Sepolia is organizer-approved. |
| Repository publication | Blocked while pre-event eligibility and source-public-before-`Apply` remain unresolved; publication requires its own immediate confirmation. |
| Main DoraHacks submission | Blocked until deadline, eligibility, source visibility, public repository, video, wallet safety, and final Sepolia receipt are resolved/complete; final click requires separate immediate confirmation. |
| Bounty `Apply` | Blocked until the main BUIDL is submitted and the bounty package is complete; `Apply` requires a separate immediate confirmation. |

## Resolved conflicts and remaining blockers

Resolved:

- The [bounty UI](https://dorahacks.io/hackathon/bounty/1363) establishes a separate `Apply` gate after BUIDL submission.
- The [KeeperHub Quickstart](https://docs.keeperhub.com/quickstart) establishes that Sepolia is a stable KeeperHub-supported hacking testnet, and the [Organizer reply](https://dorahacks.io/discussion/1562060) explicitly clears it as accepted and not marked down.
- The [KeeperHub Turnkey Integration documentation](https://docs.keeperhub.com/wallet-management/turnkey) establishes that the organization wallet uses a Turnkey EOA and that every workflow transaction is signed and broadcast by that EOA; literal EOA wording in the UI is no longer required.
- The [Direct Execution documentation](https://docs.keeperhub.com/api/direct-execution) establishes strict simulation, idempotency, polling, and receipt contracts used by the implementation.
- Visible read-only UI checks establish: `Copy wallet address` full exact match to `0x9b5f9ac9bd9e178962a50582f2b42b5523fcd042`: **yes**; visible Safe account cards: **0**; visible Sender switches: **0**; `Deploy a Safe` offered but not clicked; Ethereum Sepolia Safe Sender enabled: **no**; EVM `No cap set`: **yes**. No private limit was read.

Remaining mandatory blockers:

1. **Pre-event source eligibility:** no checked official rule clears the tagged July 14 baseline.
2. **Authoritative deadline:** the UTC+2 body deadline and timezone-less timeline widget conflict.
3. **Source visibility before `Apply`:** a source link is required, but the page does not state when it must be public.

Required resolution: safe-to-quote written organizer/platform clarification for blockers 1–3. Until then, local/offline code and material preparation may continue, but stop before final execution, publication, agreement, submission, or bounty application. Never click `Create Wallet`. Any eventual real transaction requires a separate immediate exact-summary confirmation.
