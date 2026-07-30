# Draft PR: correct `kh auth login` storage and browser guidance

Status: local draft only; not submitted. Opening an external pull request
requires the user's separate, immediate confirmation.

## Proposed title

`docs: correct Quickstart device-login guidance`

## Proposed body

### Summary

- tell users to open the verification URL printed by `kh auth login`
- explain that the device flow creates an organization API key
- identify the printed `hosts.yml` path as the credential location

### Why

The current Quickstart says that `kh auth login` opens a browser and stores a
token in the OS keyring. Current v0.13.1 behavior instead prints the device
verification URL/code. After approval, the command creates an organization API
key and reports the `hosts.yml` path where it was stored. The OS keyring remains
a legacy credential fallback, but it is not the storage path for this current
login flow.

Accurate instructions matter during first-run onboarding: waiting for an
automatically opened browser or searching the keyring makes a successful login
look stalled or lost.

### Validation

Validated the patch against a clean checkout of
`ef71237aecf9f448f65f808b859423bd99618149` (v0.13.1). A clean-apply check ran
before application. After applying the change, the validation checkout ran:

```text
go generate ./docs/...
go test ./cmd/auth/... ./internal/auth/... ./internal/config/...
git diff --check
```

All checks passed. Documentation generation introduced no additional changes.
No live KeeperHub API, MCP, simulation, wallet, or transaction call was used.

### Scope

This changes only `docs/quickstart.md`. It does not alter authentication,
credential storage, CLI flags, output schemas, or transaction behavior.
`docs/concepts.md` contains a related legacy keyring-first description; it is
intentionally left for a focused follow-up rather than widening this minimal
Quickstart correction.

## Maintainer references

- Proposed patch: `patches/keeperhub-cli-quickstart-auth.patch`
- Validation record: `artifacts/upstream/quickstart-patch-validation.txt`
- Focused test record: `artifacts/upstream/quickstart-focused-tests.txt`
- Base commit: `ef71237aecf9f448f65f808b859423bd99618149`

The earlier local Doctor patch is archived separately because KeeperHub CLI
PR #75 already resolved that issue upstream. This Quickstart correction is a
different, current, non-duplicate onboarding improvement.
