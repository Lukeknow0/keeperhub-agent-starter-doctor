# KeeperHub CLI Doctor patch evidence

This directory contains sanitized, locally generated evidence for the unsubmitted KeeperHub CLI patch based on `v0.10.0`.

| Artifact | Purpose |
| --- | --- |
| `auth-regression-tests.txt` | Focused session, API-key, response-validation, header, 401, and timeout tests |
| `full-suite.txt` | Full upstream Go test result after applying the patch to a clean checkout |
| `patch-validation.txt` | Base revision, checksum, clean-apply checks, and negative regression summary |

Related deliverables:

- Patch: `patches/keeperhub-cli-doctor-auth-v0.10.0.patch`
- PR draft: `docs/upstream-pr-draft.md`
- Ignored working checkout: `.upstream/cli`

No raw API response, bearer token, OAuth token, private key, wallet signature, or real API key is stored in these artifacts. No external repository action has been performed.
