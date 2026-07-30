# Archived local proposal: `kh doctor` authentication resolution

## Resolution

**Superseded by an official upstream fix; do not open a duplicate pull request.**

KeeperHub merged [PR #75: `fix: KEEP-1049 validate credentials against an endpoint that requires auth`](https://github.com/KeeperHub/cli/pull/75) on 2026-07-28 at `72f68896aea6a792edd149d4ad42f90251eca332`. The current `main` was verified read-only at [`ef71237aecf9f448f65f808b859423bd99618149`](https://github.com/KeeperHub/cli/commit/ef71237aecf9f448f65f808b859423bd99618149) (`chore(main): release 0.13.1 (#83)`).

PR #75 is behaviorally equivalent for the core onboarding defect: Doctor resolves and sends `Authorization`, neither Doctor nor API-key validation relies on anonymous-tolerant probes, and both use the protected shared `CredentialProbePath` (`/api/projects`). It also covers protected-path selection, refusal behavior, header propagation, and known anonymous-tolerant endpoints. Current implementation and tests are available in [Doctor](https://github.com/KeeperHub/cli/blob/ef71237aecf9f448f65f808b859423bd99618149/cmd/doctor/doctor.go), [token resolution](https://github.com/KeeperHub/cli/blob/ef71237aecf9f448f65f808b859423bd99618149/internal/auth/token.go), [credential probe](https://github.com/KeeperHub/cli/blob/ef71237aecf9f448f65f808b859423bd99618149/internal/http/credential_probe.go), and [credential-probe tests](https://github.com/KeeperHub/cli/blob/ef71237aecf9f448f65f808b859423bd99618149/internal/http/credential_probe_test.go).

This repository independently reproduced and patched the defect on 2026-07-14 against v0.10.0, before PR #75. That historical work is evidence only: it is not claimed to be the source of, submitted to, or to have influenced PR #75. No branch was pushed and no external pull request was opened from this repository.

## Compatibility and security

For the official credential-probe resolution, the Doctor credential check has no Doctor CLI flag, JSON result-schema, or exit-code contract change. Doctor resolves the existing credential only to send `Authorization` to the protected probe endpoint; it does not include credential material in Doctor result output.

The historical local v0.10.0 patch likewise changed no CLI flags, JSON schema, or exit-code behavior. It logged and retained no credential material, and it did not change wallet, billing, or transaction-execution behavior.

This compatibility statement is limited to the credential-probe resolution. PR #75 also contains its documented login and version-warning changes, so it would be inaccurate to characterize the entire upstream PR as Doctor-internals-only. This archive contains no real credentials, and no external pull request was opened from this repository.

## Historical local proposal (archived, not proposed for merge)

The local v0.10.0 patch reused the factory's authenticated HTTP client and treated invalid 200 responses as unauthenticated. It also checked non-empty `user.id` and `session.id`, required exactly one JSON value, and used `/api/keys` with an `{items,meta,_links}`-style API-key response.

Those choices are intentionally **not** a claim that upstream copied or must adopt this patch. The historical body validation is stricter than PR #75's status-on-protected-`/api/projects` approach, and `/api/keys` is a different protected route. The solutions are equivalent for the reported false-positive/auth-header onboarding failure, but are not patch-identical.

### Historical regression matrix

| Case | Historical local v0.10.0 evidence | Official PR #75 resolution |
| --- | --- | --- |
| Authenticated client and `Authorization` | Factory client/header propagation test | Doctor resolves and sends `Authorization`; protected-probe tests cover propagation |
| `200 null` or anonymous-tolerant endpoint | Rejects invalid session bodies | Avoids `/api/auth/get-session`; probes protected `/api/projects` |
| API-key validation | Uses protected `/api/keys`, validates `items` shape | Shares protected `/api/projects`; no `/api/workflows` probe |
| 401/refusal and timeout | Local 401 and timeout cases | PR #75 tests refusal; PR description reports live bogus/no-credential/revoked-key checks |
| Test scope | Focused Doctor tests and 28-package suite recorded locally | PR #75 reports a green 28-package suite upstream |

### Historical commands and result

The following ran locally on 2026-07-14 against tag `v0.10.0` at `56d28630e3ad49fd0681a8afae7b7c6c1cf8b512`, using Go 1.26.3 on darwin/arm64. They are not results from current v0.13.1:

```bash
git apply --check patches/keeperhub-cli-doctor-auth-v0.10.0.patch
git apply patches/keeperhub-cli-doctor-auth-v0.10.0.patch
go test ./cmd/doctor -count=1
go test ./... -count=1
git diff --check
```

The historical patch SHA-256 is `aa6743d8c765580c4c8f9c97d30afe33c8fddf0a93f3cac4d91fc36000ce6d66`. Its focused/full-suite and negative-regression evidence remains under `artifacts/upstream/` without being re-labelled as current-upstream output.

## Duplicate-check result

- Official equivalent: merged PR #75, merge commit `72f68896aea6a792edd149d4ad42f90251eca332`.
- Current release base inspected read-only: `ef71237aecf9f448f65f808b859423bd99618149`.
- Action: no refreshed patch, port, branch, or external PR was created.
- Local file retained: `patches/keeperhub-cli-doctor-auth-v0.10.0.patch` is a historical v0.10.0 artifact, not a current merge proposal.

PR #75's live valid/bogus/no-credential/revoked-key checks and 28-package full-suite result are attributed to the upstream PR report; they were not rerun locally for this archive.
