# Submission verification evidence

## Environment versions

Verification was recorded with Node.js `22.22.3` and npm `10.9.8`.

## Clean install and dependency lock

`npm ci` completed at `2026-07-29 10:15:42 +08:00` and passed, installing 146 packages. `npm ls --depth=0` completed at `2026-07-29 10:15:42 +08:00` and matched the lockfile-pinned direct dependencies: `@modelcontextprotocol/sdk@1.29.0`, `commander@15.0.0`, `zod@4.4.3`, `@types/node@22.15.34`, `tsx@4.23.1`, `typescript@7.0.2`, and `vitest@4.1.10`.

## Typecheck, tests, build, secret scan, and package check

`npm run verify` completed at `2026-07-29 10:15:47 +08:00` and passed its complete public chain: typecheck, 8 Vitest files / 62 tests, build, secret scan (176 files), 116-file package manifest, and clean-package smoke. Separate `npm run test:package` completed at `2026-07-29 10:15:49 +08:00` and passed for `keeperhub-agent-starter-0.1.0.tgz` with 116 files. `git diff --check` passed.

After this evidence edit, the exact public command `npm run test:secrets` passed and reported `Secret scan passed (177 files checked).` No timestamp was captured for that final validation.

## Guarded live REST/MCP/simulation checks

`npm run test:integration` completed at `2026-07-29 10:16:32 +08:00` and passed: 1 file / 2 tests. It verified authenticated REST access, Sepolia availability, wallet and billing reads, authenticated MCP `tools_documentation`, and a strictly boolean `simulate: true` dry-run request. The protected API-key endpoint returned HTTP 200; the hosted MCP probe was reachable/authenticated, invoked `tools_documentation`, and reported 35 tools.

Simulation evidence is separate from account configuration and final on-chain execution evidence. The simulation used Ethereum Sepolia (`11155111`), public wallet `0x9b5f9ac9bd9e178962a50582f2b42b5523fcd042`, a self-transfer of `0.000001 ETH` (`1000000000000` wei), gas balance `0.050000 ETH` (`50000000000000000` wei), gas estimate `21227`, and `wouldRevert: false`. It produced no execution ID or transaction hash.

## Final Doctor evidence gate and approved warnings

The earlier Doctor check at `2026-07-29 10:16:50 +08:00` recorded the API/MCP, Sepolia, wallet, Gas, and strict-simulation checks, while Codex and Hermes onboarding remained to be completed. That earlier state is retained as historical evidence only; it is superseded by the final Doctor gate below.

`node dist/cli.js doctor --agent all --chain-id 11155111 --json` completed at `2026-07-29 18:25:59 +08:00` with `schemaVersion: 1` and `ok: true`. Its separate chain check confirmed Ethereum Sepolia (`11155111`); the authenticated MCP check invoked `tools_documentation`. These are distinct evidence categories: authenticated MCP verification does not itself prove the Sepolia chain state.

All three Doctor agent checks passed: `agent.claude`, `agent.codex`, and `agent.hermes`. The supporting Task 4 evidence is committed at `7d36fdc` in `docs/submission/onboarding-evidence.md`; it records one authenticated, read-only `tools_documentation` invocation for each agent. That onboarding evidence is distinct from the Doctor chain, account/UI, simulation, and future transaction evidence.

The final Doctor gate also passed the public wallet `0x9b5f9ac9bd9e178962a50582f2b42b5523fcd042`, Gas, and strict simulation. The simulation had boolean `simulate: true`, amount `0.000001`, `wouldRevert: false`, and a gas estimate present. It was a dry-run only and produced no execution ID or transaction hash.

Exactly two user-approved warnings remain; no other warning, failure, or skip is accepted:

- `keeperhub.wallet_type` is allowed only with `walletType: "unknown"` and `executionAllowed: false`. This API limitation is paired with the committed UI/compliance evidence at `530bd8d` in `docs/submission/compliance-2026-07-28.md`, which records the same public wallet, no Safe configuration, and no Sepolia Safe Sender. The official [KeeperHub Turnkey EOA documentation](https://docs.keeperhub.com/wallet-management/turnkey) establishes the organization-wallet EOA model. These are account/UI and official-documentation evidence, not simulation or final-transaction evidence.
- `keeperhub.spend_cap` is allowed only with `spendCap: null`, paired with the committed UI/compliance evidence at `530bd8d` in `docs/submission/compliance-2026-07-28.md`: Manage Organizations → Limits displayed EVM `No cap set`.

## Clean tarball installation

The public `npm run test:package` command passed. It packaged `keeperhub-agent-starter-0.1.0.tgz` with 116 files, installed it under a fresh temporary prefix with lifecycle scripts disabled, and confirmed required public files, excluded runtime/evidence paths, CLI version `0.1.0`, and `setup --help` options.

## Known non-blocking observations

No final on-chain transaction evidence or final transaction hash exists. The successful dry-run and independently verified account/UI configuration evidence do not authorize execution and must never be represented as final transaction evidence. A final execution must wait for the user's future exact confirmation; no broadcast, signing operation, wallet creation, execution ID, or transaction hash is claimed here.

## Release-condition readiness

This finalized public verification evidence is ready to be hashed only after the commit that contains this file. Its own digest is intentionally not recorded here, avoiding self-reference; the subsequent release-condition record must bind to that prior evidence commit and unchanged evidence files.
