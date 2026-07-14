# PR draft: prevent false-positive authentication in `kh doctor`

Status: local draft only; no branch was pushed and no pull request was opened.

## Proposed title

`fix(doctor): validate authenticated session and API-key responses`

## Summary

- Reuse the CLI factory's authenticated HTTP client for every doctor request.
- Treat HTTP 200 responses with empty, malformed, multi-value, or structurally invalid JSON as unauthenticated.
- Validate a `KH_API_KEY` through the protected `/api/keys` endpoint and its observed `{items,meta,_links}` object shape instead of an endpoint that may also answer anonymous requests.
- Preserve the existing five-second per-check context deadline.

## Problem

`kh doctor` currently creates a new plain `http.Client`. That bypasses the token already resolved by `Factory.HTTPClient`, so the diagnostic requests do not carry the same `Authorization`, organization, version, or per-host headers as other CLI commands.

The Auth check also reports `authenticated` for any HTTP 200 response from `/api/auth/get-session`, including a literal `null`. This produced a contradictory onboarding state: Doctor passed Auth while `kh auth status` rejected the session and the authenticated organization endpoints returned 401.

API keys need a different validation route because they do not have a browser session. `/api/workflows` is unsuitable as an authentication probe when an unauthenticated request can receive HTTP 200. `/api/keys` was verified as a protected endpoint during onboarding.

## Implementation

1. `getHTTPClient` now returns `Factory.HTTPClient()` and `doGet` sends a context-bound retryable request through that client.
2. Session validation requires exactly one JSON value containing non-empty `user.id` and `session.id`; trailing JSON or garbage is rejected.
3. When the active `KH_API_KEY` has the documented prefix, the Auth check calls `/api/keys`. HTTP 200 is accepted only for exactly one response object with a non-null `items` array; an empty array remains valid.
4. Unauthorized, forbidden, timeout, malformed-body, and unexpected-status behavior remains a warning so Doctor's existing exit semantics do not change.

## Tests

Added focused regression coverage for:

- valid session plus `Authorization` header propagation;
- HTTP 200 with empty bodies, `null`, `{}`, arrays, missing user, missing session, empty identities, malformed JSON, trailing JSON, and trailing garbage;
- session 401;
- valid API key using `/api/keys` plus header propagation;
- invalid API key 401;
- valid API-key pagination shape with an empty `items` array;
- invalid API-key scalars, arrays, missing or null `items`, wrong item types, malformed JSON, and trailing data;
- context timeout.

Existing Doctor tests now clear `KH_API_KEY` to remain hermetic, and the all-pass fixture returns an actual session-shaped response.

Validated from tag `v0.10.0` at commit `56d28630e3ad49fd0681a8afae7b7c6c1cf8b512`:

```bash
git apply --check keeperhub-cli-doctor-auth-v0.10.0.patch
git apply keeperhub-cli-doctor-auth-v0.10.0.patch
go test ./cmd/doctor -count=1
go test ./... -count=1
git diff --check
```

All commands pass on Go 1.26.3 for darwin/arm64. The added regression tests fail against the unmodified tag in the expected ways: authentication headers are absent, invalid or multi-value 200 responses pass, and API keys use the session endpoint.

## Compatibility and security

- No CLI flags, JSON output schema, or exit codes change.
- No credential value is logged or placed in the patch artifacts.
- API-key detection follows the existing `KH_API_KEY` precedence in the CLI factory.
- The patch does not change token storage, login, wallet, billing, or transaction execution.

## Reviewer note

The session validator intentionally checks only stable identity fields and does not deserialize or retain token material. The API-key validator pins only the semantically required `items` array from the observed response shape; it does not require pagination metadata fields to remain byte-for-byte stable.
