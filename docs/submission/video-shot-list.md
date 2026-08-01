# Product-first video shot list

Format: 1920×1080, 30 fps, H.264, English local TTS, burned English captions,
no music, no desktop capture, and no credential-bearing source material.

| Time | Visual focus | Evidence class | Primary source |
| --- | --- | --- | --- |
| 00:00–00:08 | `CONNECTED ≠ AUTHENTICATED`; three Agent nodes, then a read-only tool-call failure | Product problem | `docs/submission/onboarding-evidence.md` |
| 00:08.0–00:21.9 | Claude Code, Codex, and Hermes converge on Starter + Doctor; `Step / Cause / Fix / Evidence` | Product UX | `src/agents/setup.ts`, `src/core/output.ts` |
| 00:21.9–00:31.9 | `TWO SAFE RETRIES → ONE VERIFIED RELEASE`; Sepolia Success and shortened final hash | Verified execution evidence | `audit/final-release.jsonl`, public Etherscan receipt |
| 00:31.9–00:49.3 | Before/after comparison; only verified counts `3`, `11`, and `115/115` | Frozen repository evidence | `docs/rehearsal-report.md`, `artifacts/submission/delivery-gate.json` |
| 00:49.3–00:56.3 | Sanitized output from a real local `setup --agent all --json` preview | Real offline command output | `dist/cli.js`, `src/agents/setup.ts` |
| 00:56.3–01:10.7 | Representative MCP call-stage failure and repaired pass | **OFFLINE DETERMINISTIC TEST**, then frozen authenticated evidence | `tests/doctor.test.ts`, `docs/submission/onboarding-evidence.md` |
| 01:10.7–01:24.9 | One Quickstart blocker, minimal patch, clean apply, and focused Go tests | Upstream-ready evidence | `patches/keeperhub-cli-quickstart-auth.patch`, `artifacts/upstream/quickstart-*` |
| 01:24.9–01:52.5 | Animated safety contract: condition → strict simulation → digest → exact TTY → KeeperHub → same-request recovery → status → receipt → audit | Product architecture plus verified execution evidence | `src/release/`, `audit/final-release.jsonl` |
| 01:52.5–02:16.5 | Eight-event audit timeline; highlight two retry rows, one transaction hash, and no duplicate transfer observed in this audited release | **VERIFIED EXECUTION EVIDENCE** | `audit/final-release.jsonl` |
| 02:16.5–02:39.5 | Programmatic crop of the public Etherscan page: Sepolia, Success, hash, EIP-7702 decoded input, recipient, amount, and state difference | Public independent receipt | Final Etherscan URL |
| 02:39.5–02:47.5 | Real offline `audit verify` output: `ok: true`, `records: 8`, shortened head | Real offline command output | `node dist/cli.js audit verify audit/final-release.jsonl` |
| 02:47.5–02:55.6 | Award close, GitHub and receipt QR codes | Submission navigation | Public repository and Etherscan URL |

The public explorer is captured through ego-browser without login. Only the
public transaction page is used. Its browser chrome, navigation, cookie banner,
and unrelated page regions are cropped out of the final composition.
