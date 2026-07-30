# KeeperHub CLI onboarding improvement evidence

## Current merge-ready Quickstart patch (2026-07-29)

`patches/keeperhub-cli-quickstart-auth.patch` is a minimal documentation patch
against KeeperHub CLI v0.13.1 at
`ef71237aecf9f448f65f808b859423bd99618149`. It replaces two stale first-login
claims: the CLI prints a device verification URL/code rather than opening a
browser, and the current flow stores its organization API key in the printed
`hosts.yml` path rather than the OS keyring.

The patch was applied to a second clean checkout, passed documentation
generation, focused auth/config tests, and whitespace validation. It has not
been submitted externally.

| Artifact | Purpose |
| --- | --- |
| `quickstart-patch-validation.txt` | Exact base, checksum, clean apply, generation, and scope checks |
| `quickstart-focused-tests.txt` | Sanitized focused Go test results |
| `../../docs/upstream-quickstart-pr-draft.md` | Ready-to-review PR title, body, scope, and validation |

Patch SHA-256:
`2042dc1cad2a6469787fc617554bff541ac1a220329ab0915fd5d941e30a9c7f`.

No branch, fork, issue, or pull request was created. External submission still
requires the user's separate confirmation.

## Current upstream resolution (2026-07-29)

**An equivalent official fix is merged upstream; no duplicate patch or external PR should be opened.** [KeeperHub/cli PR #75](https://github.com/KeeperHub/cli/pull/75), `fix: KEEP-1049 validate credentials against an endpoint that requires auth`, merged on 2026-07-28 at `72f68896aea6a792edd149d4ad42f90251eca332`. The current read-only base is [`ef71237aecf9f448f65f808b859423bd99618149`](https://github.com/KeeperHub/cli/commit/ef71237aecf9f448f65f808b859423bd99618149), release 0.13.1.

PR #75 resolves the core onboarding issue by resolving/sending `Authorization` and using the protected shared `/api/projects` credential probe for Doctor and API-key validation, instead of anonymous-tolerant `/api/auth/get-session` or `/api/workflows`. The current sources are [Doctor](https://github.com/KeeperHub/cli/blob/ef71237aecf9f448f65f808b859423bd99618149/cmd/doctor/doctor.go), [token resolution](https://github.com/KeeperHub/cli/blob/ef71237aecf9f448f65f808b859423bd99618149/internal/auth/token.go), [probe](https://github.com/KeeperHub/cli/blob/ef71237aecf9f448f65f808b859423bd99618149/internal/http/credential_probe.go), and [probe tests](https://github.com/KeeperHub/cli/blob/ef71237aecf9f448f65f808b859423bd99618149/internal/http/credential_probe_test.go).

The files below remain sanitized **historical local evidence**, generated on 2026-07-14 against v0.10.0. They are not output from v0.13.1 and do not establish authorship, submission, or influence on PR #75.

| Artifact | Historical purpose |
| --- | --- |
| `auth-regression-tests.txt` | Focused session, API-key, response-validation, header, 401, and timeout tests |
| `full-suite.txt` | Full Go test result after applying the historical patch to a clean v0.10.0 checkout |
| `patch-validation.txt` | v0.10.0 base, checksum, clean-apply checks, and negative regression summary |

Related records:

- Historical patch: `patches/keeperhub-cli-doctor-auth-v0.10.0.patch`
- Resolution record: `docs/upstream-pr-draft.md`
- No `patches/keeperhub-cli-doctor-auth.patch` exists because a current duplicate patch is unnecessary.

No raw API response, bearer token, OAuth token, private key, wallet signature, or real API key is stored in these artifacts. No external repository action has been performed from this repository.
