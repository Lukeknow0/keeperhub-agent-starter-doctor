# Three-agent onboarding evidence

## Scope and result

This evidence records three independent, authenticated, read-only KeeperHub
`tools_documentation` invocations. Configuration or connection status alone is
not counted as proof. The final Doctor report passed at 2026-07-29 18:25:59
+08:00: schema version 1, all three agent checks pass, and its authenticated
MCP verification calls `tools_documentation`. A separate Doctor chain check
confirms Sepolia (chain ID 11155111).

The evidence is limited to configuration and simulation. No signing,
broadcast, execution, or transaction identifier exists.

| Agent | Fresh isolation | Binary and version | Configured path | Reachable | Authentication mechanism | Authenticated read-only tool | Write capability state | Result | Reproducible blocker or none observed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Claude | Original fresh project: `/private/tmp/keeperhub-onboarding-submission/claude-project`. | Claude Code 2.1.207 | Project-scoped `.mcp.json` in that isolated project. | Yes — the authenticated call completed. | User-completed hosted-MCP OAuth; OAuth material is omitted. | At 2026-07-29 11:08:58 +08:00, Claude invoked `tools_documentation` once and returned KeeperHub workflow, management, project, and integration documentation. | The evidence prompt was scoped to this read-only tool; hosted MCP write tools were not structurally disabled. No write or transaction call occurred. | Pass: actual authenticated read-only invocation. | The temporary onboarding root was later cleaned, so original isolated state cannot be reopened; this is a reproducible fresh-onboarding evidence-retention issue, not a failed invocation. A later controller lookup also hit managed-sandbox DNS failure. |
| Codex | Original fresh home and project: `/private/tmp/keeperhub-onboarding-submission/codex-home` and `codex-project`. | Codex CLI 0.144.3 | Hosted MCP entry in the original isolated Codex home. | Yes — the authenticated call completed. | User-completed Codex account login and hosted-MCP OAuth; credentials and OAuth material are omitted. | At 2026-07-29 13:44:29 +08:00, Codex invoked `tools_documentation` exactly once and returned documentation for workflows, projects/tags, integrations, templates, node-output syntax, and chain IDs. | The evidence prompt was scoped to this read-only tool; hosted MCP write tools were not structurally disabled. No write or transaction call occurred. | Pass: actual authenticated read-only invocation. | The temporary onboarding root was later cleaned, so original isolated state cannot be reopened; this is a reproducible fresh-onboarding evidence-retention issue. A later persistent Codex declarative configuration was recreated for Doctor only and did not rerun OAuth; it is not the invocation evidence. |
| Hermes | Fresh, ignored persistent isolation: `artifacts/private/task4/hermes-home` and `hermes-project`. | Hermes Agent 0.19.0 | Official KeeperHub plugin enabled in the isolated Hermes home. | Yes — the authenticated call completed. | KeeperHub API-key authentication was supplied only through the process environment; its name and value are omitted. | Hermes invoked `kh_tools_documentation` once with an empty object — the plugin-exposed name for KeeperHub `tools_documentation` — and returned workflow, organization, integration, template, reference-syntax, and chain-discovery documentation. | `KEEPERHUB_ENABLE_WRITES` was unset. The official plugin structurally withheld its ten write/execute tool registrations. | Pass: actual authenticated read-only invocation. | Hermes terminal footer reported 2 tool calls, while canonical redacted session metadata has `tool_call_count=1` and exactly one tool message named `kh_tools_documentation`. This is a reproducible Hermes UX/counting blocker, not duplicate execution. |

## Evidence categories and supporting sources

The matrix above is **authenticated MCP invocation evidence**. It is separate
from the following categories: **declarative/config state** (the configured
agent entries and Doctor configuration checks), **simulation evidence** (the
strict `simulate: true` result), **UI/account evidence** (the authenticated
KeeperHub account observations), and **future final-transaction evidence**.
The last category has no evidence: no final transaction exists.

The UI/account observations and their sanitization constraints are recorded in
the committed [compliance freeze](compliance-2026-07-28.md) at commit
`530bd8d`. The organization-wallet model is corroborated by the official
[KeeperHub Turnkey EOA documentation](https://docs.keeperhub.com/wallet-management/turnkey).

## Doctor release context

The final Doctor result is `ok: true`. Gas and strict simulation pass. The
simulation used `simulate: true` for a 0.000001 ETH self-transfer,
`wouldRevert: false`, and a gas estimate was present. It is not execution
evidence.

Exactly two user-approved warnings remain. The approved warning predicates are
exactly `spendCap:null`, `walletType:"unknown"`, and `executionAllowed:false`.
`keeperhub.spend_cap` is permitted only because spend-cap evidence is null and
the committed authenticated UI proof shows the EVM organization limit as “No
cap set.” `keeperhub.wallet_type` is permitted only with wallet type unknown
and execution disallowed; the same committed UI proof establishes wallet
`0x9b5f9ac9bd9e178962a50582f2b42b5523fcd042` and that Sepolia Safe Sender is
disabled, while official KeeperHub documentation establishes the Turnkey EOA
model. No other warning, failure, or skip is accepted.

Private session records and sanitized tool outputs are intentionally not linked
from this public evidence. They are summarized here only; no OAuth URL or
material, API-key material, private contact data, session identifier, or
transaction identifier is included.
