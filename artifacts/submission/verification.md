# Submission verification evidence

## Environment versions

Verification was recorded with Node.js `22.22.3` and npm `10.9.8`.

## Clean install and dependency lock

`npm ci` completed at `2026-07-29 10:15:42 +08:00` and passed, installing 146 packages. `npm ls --depth=0` completed at `2026-07-29 10:15:42 +08:00` and matched the lockfile-pinned direct dependencies: `@modelcontextprotocol/sdk@1.29.0`, `commander@15.0.0`, `zod@4.4.3`, `@types/node@22.15.34`, `tsx@4.23.1`, `typescript@7.0.2`, and `vitest@4.1.10`.

## Typecheck, tests, build, secret scan, and package check

`npm run verify` completed at `2026-07-29 10:15:47 +08:00` and passed its complete public chain: typecheck, 8 Vitest files / 62 tests, build, secret scan (176 files), 116-file package manifest, and clean-package smoke. Separate `npm run test:package` completed at `2026-07-29 10:15:49 +08:00` and passed for `keeperhub-agent-starter-0.1.0.tgz` with 116 files. `git diff --check` passed.

## Guarded live REST/MCP/simulation checks

`npm run test:integration` completed at `2026-07-29 10:16:32 +08:00` and passed: 1 file / 2 tests. It verified authenticated REST access, Sepolia availability, wallet and billing reads, authenticated MCP `tools_documentation`, and a strictly boolean `simulate: true` dry-run request. The protected API-key endpoint returned HTTP 200; the hosted MCP probe was reachable/authenticated, invoked `tools_documentation`, and reported 35 tools.

Simulation evidence is separate from account configuration and final on-chain execution evidence. The simulation used Ethereum Sepolia (`11155111`), public wallet `0x9b5f9ac9bd9e178962a50582f2b42b5523fcd042`, a self-transfer of `0.000001 ETH` (`1000000000000` wei), gas balance `0.050000 ETH` (`50000000000000000` wei), gas estimate `21227`, and `wouldRevert: false`. It produced no execution ID or transaction hash.

## Doctor evidence gate and accepted warning

`node dist/cli.js doctor --agent all --chain-id 11155111 --json` completed at `2026-07-29 10:16:50 +08:00`. Doctor required checks passed for authenticated API/MCP access, Sepolia enabled/testnet state, the public wallet above, Gas, and strict simulation. The following warnings were reviewed as follows:

- `agent.codex` and `agent.hermes` are explicitly deferred to Task 4; Task 4 must remove both.
- `keeperhub.wallet_type` reported `walletType: "unknown"` and `executionAllowed: false`. This API limitation is paired with the independently committed dashboard UI evidence at commit `530bd8d`: Turnkey EOA and no Safe configuration. This is account/UI configuration evidence, not simulation or final transaction evidence.
- `keeperhub.spend_cap` reported `status: "warn"`, `spendCap: null`, plan `free`, and subscription `active`. The user explicitly approved accepting this warning only with the independent committed UI cross-check at commit `530bd8d`: Manage Organizations → Limits displayed EVM `No cap set`.
- Claude configuration is present. Authenticated tool verification is established by the direct MCP probe, rather than an Agent-configuration warning.

## Clean tarball installation

The public `npm run test:package` command passed. It packaged `keeperhub-agent-starter-0.1.0.tgz` with 116 files, installed it under a fresh temporary prefix with lifecycle scripts disabled, and confirmed required public files, excluded runtime/evidence paths, CLI version `0.1.0`, and `setup --help` options.

## Known non-blocking observations

No final on-chain transaction evidence or final transaction hash exists. The successful dry-run and independently verified account/UI configuration evidence do not authorize execution and must never be represented as final transaction evidence. A final execution must wait for the user's future exact confirmation; no broadcast, signing operation, wallet creation, execution ID, or transaction hash is claimed here.
