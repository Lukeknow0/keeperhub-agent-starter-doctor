# Security model

The design assumes that an Agent can be mistaken, a network response can be incomplete, a retry can follow an ambiguous POST, local files can be modified, and terminal output can be published accidentally. It therefore makes a real transfer an explicit, digest-bound human protocol rather than an ordinary client call.

## Assets, actors, and trust boundaries

Protected assets are the organization API key, OAuth material, KeeperHub signing authority, public wallet funds and limits, the exact transfer intent, the private idempotency state, and the integrity of the public audit/receipt evidence.

Relevant actors are the authorized operator, a fallible or prompt-injected Agent, local software with workspace access, an attacker who obtains logs or published artifacts, and an unreliable or compromised network/upstream service. KeeperHub and the chain are external trust domains; their responses are validated but cannot be made available or correct by this CLI.

## Credential and wallet boundaries

- The starter never accepts a private key, seed phrase, wallet signature, OAuth token, or HMAC secret. KeeperHub retains signing/custody responsibility.
- `KH_API_KEY` is read from the process environment, which may optionally be populated by the ignored local `.env` loader after that file is restricted to mode `0600`. It is never accepted as a CLI argument or printed. Output and nested evidence are redacted for API keys, Bearer values, tokens, private keys, HMAC values, secrets, and idempotency keys.
- OAuth is separate from organization API-key authentication. Claude and Codex use hosted-MCP browser OAuth; Doctor independently verifies a protected REST request and authenticated MCP `tools_documentation` with `KH_API_KEY`. Configuration or reachability alone is not proof.
- During Hermes onboarding, `KEEPERHUB_ENABLE_WRITES` was unset. The official plugin structurally withheld ten write/execute registrations. Claude and Codex were prompt-scoped to read-only; their hosted write tools were not structurally disabled.
- The release lane accepts only Ethereum Sepolia (`11155111`) and wallet type `eoa`; mainnet and Safe release requests are rejected.
- The exact wallet `0x9b5f9ac9bd9e178962a50582f2b42b5523fcd042`, Turnkey EOA semantics, no configured Sepolia Safe Sender, and “No cap set” conclusion come from official Turnkey documentation plus a recorded authenticated observation. Raw authenticated UI evidence is unavailable in the public repository. Doctor’s balances response alone does not establish wallet type or spend-cap sufficiency.

## Intent integrity and approval

`release prepare` verifies a workspace-contained `file-sha256` condition, normalizes the recipient and amount, binds chain/wallet/recipient/amount/condition into an intent digest, and binds the successful strict simulation into a plan digest. Simulation is hard-coded as JSON boolean `true`; it creates no transaction and grants no authority. For the final transaction, `release prepare` may run exactly once and only after the formal raw screen recording starts; final plan/state/audit paths must not exist before capture.

The plan expires after ten minutes. Before any POST, the service rereads the plan, revalidates both digests and the complete intent, rehashes the condition file, and rereads the active wallet. A change to chain, wallet, recipient, amount, condition, or simulation invalidates approval.

The recorded final sequence first shows the full prepare JSON summary, then requires independent user authorization to proceed. Prepare does not display the TTY phrase. Only after that authorization may execution start. Execution requires stdin and stdout to be real TTYs, repeats the exact summary, and separately displays and requires `CONFIRM <plan-digest-prefix>`. There is no noninteractive confirmation flag. A cross-process retry separately requires `CONFIRM RETRY <plan-digest-prefix>`.

## State, retry, status, and receipt safety

Before the first broadcast attempt, the program creates the private state with exclusive `wx` semantics and mode `0600`. Existing state stops execution rather than replacing a possibly live idempotency key. The digest-bound/checksummed state envelope binds the plan, intent, key digest, attempt count, phase, and execution fields; reads reject unsafe permissions, malformed state, or digest inconsistencies.

One UUID idempotency key is used for the initial request and at most three safe retries. Retryable cases are network/unknown status, HTTP 408, 429, 5xx, and documented `idempotency_in_progress`; delays are bounded. Retries revalidate the same condition, plan, wallet, body, and persisted key.

HTTP 409 is non-retryable: state becomes blocked and the operator is directed to status/investigation. If KeeperHub says “completed” without all of `result.success: true`, a 32-byte transaction hash, and a matching HTTPS Sepolia Etherscan transaction URL, the result becomes `ambiguous`. Ambiguous state is audited and never causes creation of a replacement idempotency key or automatic rebroadcast.

The CLI validates KeeperHub completion evidence matched to the stored execution ID: status `completed`, `result.success: true`, a valid 32-byte transaction hash, and an exact HTTPS Sepolia Etherscan transaction-URL shape. This is not independent onchain receipt verification; the CLI does not fetch an explorer or RPC receipt. Final submission evidence additionally requires a later independent public explorer/RPC check proving the matching successful Sepolia receipt. A strict simulation, execution ID, bare transaction hash, or URL-shaped string is insufficient.

## Audit and publication safety

The public JSONL audit recursively redacts secret-named fields and credential-shaped strings. It stores the SHA-256 of the idempotency key, never the raw key. Each record binds its index, timestamp, event, redacted data, and prior row hash; `audit verify` recomputes the chain and rejects blank, malformed, reordered, altered, or unlinked records.

Never open, capture, or publish the whole `.keeperhub/` directory. The default `.keeperhub/release-plan.json`, `.keeperhub/release-state.json`, and `audit/release.jsonl` namespace is non-final rehearsal only. The explicit final state `.keeperhub/final-release-state.json` contains the raw idempotency key; neither state file may appear in a demo or repository. Terminal account identity, OAuth screens, and credentials are likewise private. Public wallet addresses, plan/intent digests, execution IDs, transaction hashes, and independently verified receipt URLs may be shown only in their correct evidence category.

## Low-level primitive warning

`KeeperHubClient.executeTransfer` and exported dependency-injection surfaces are low-level primitives used by the validated service and local tests. They do not enforce the complete condition → simulation → TTY confirmation → exclusive state → same-key recovery → KeeperHub completion validation → independent public receipt verification → audit protocol by themselves. Direct client calls are not the supported safety workflow.

## Remaining limitations

- CLI time/TTY/file controls are not an operating-system sandbox. A compromised host or package can bypass or alter them.
- `stateDigest` is an unkeyed SHA-256 checksum. It detects accidental/inconsistent state changes but is not a MAC or signature and cannot protect against a malicious local writer that can recompute it.
- Prompt-scoped Claude/Codex evidence does not structurally remove their hosted MCP write tools.
- Redaction reduces accidental disclosure but cannot guarantee removal of every novel secret format or sensitive identity shown outside captured program output.
- A hash chain is tamper-evident only from a trusted head/reference; it does not provide external timestamping or prevent deletion of the whole file.
- Status and explorer validation rely on KeeperHub availability/correctness and Etherscan URL conventions; chain reorgs and external service failures remain possible.
- “No cap set” is a UI observation, not a recommendation to leave limits unset.
- A failed, ambiguous, interrupted, privacy-exposing, or expired final take hard-aborts. It never triggers an automatic second simulation; a new attempt requires a wholly new formal recording and readiness decision.
- The final recipient has not been supplied. No final signing, execution, audit, hash, receipt, or transaction link exists.
- Organizer clarification resolves pre-event prototyping, deadline conversion, Sepolia acceptance, and standalone starter/teardown eligibility. Publication, final execution, video upload, submission, and bounty application remain blocked only on their operational prerequisites and separate immediate confirmations.
