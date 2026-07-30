# Organizer clarifications — 2026-07-30

This addendum records later organizer answers that resolve the open rule questions in the dated compliance freeze. It does not rewrite or replace the historical evidence in `compliance-2026-07-28.md`.

## Resolved decisions

| Question | Official clarification | Project decision |
| --- | --- | --- |
| Can pre-event work count? | The organizer explicitly allowed repository exploration and prototyping before the event, while directing entrants to submit the work and open any upstream PR during the official window. | The private `pre-event-rehearsal` baseline remains disclosed. Submission work is on `hackathon/submission`, and no upstream PR was opened before the event. The baseline is not an eligibility blocker. |
| Must the onboarding contribution already be merged? | The organizer stated that a merged PR is not required. A starter/boilerplate or concrete onboarding teardown is independently eligible, and a public, well-documented version shared during the event is the target outcome. | Publish this repository during the event before the main submission and separate bounty `Apply`. The prepared upstream patch is bonus evidence, not a prerequisite or a claimed merge. |
| Which deadline is authoritative? | The event body says all times are UTC+2 and gives `2026-08-13 12:00` as the deadline. In the authenticated Asia/Shanghai session, the timeline widget shows `2026-08-13 18:00`. | These are the same instant: `2026-08-13 10:00 UTC` / `18:00 UTC+8`. Use that instant as the hard platform deadline and finish the consequential actions earlier. |
| Is Sepolia acceptable? | The organizer confirmed that testnets, including Sepolia, are accepted without a judging penalty; mainnet is a reliability strengthener, not a requirement. | Use Sepolia `11155111` for the final transaction. Do not switch to mainnet. |
| What strengthens the Grand Prize case? | The organizer emphasized reliability and observability beyond a bare transaction hash: varied states, retry/Gas behavior, and an audit trail covering decision through confirmation. | The final recording will show one real final execution and its independent receipt plus the real audit sequence. Retry, 409, ambiguity, cancellation, and Gas/error handling remain clearly labeled deterministic tests; the project will not manufacture a failing live transfer or misrepresent fixtures as onchain events. |

## Remaining consequential checkpoints

The rule questions above are resolved. The remaining blockers are operational, not eligibility ambiguities:

1. the user supplies and approves a distinct final recipient;
2. the formal one-take recording starts before the sole final `simulate: true`;
3. the user independently authorizes the exact simulated summary before execution;
4. repository publication, video upload, DoraHacks `Submit`, and bounty `Apply` each receive their own immediate confirmation.

The existing pre-event transaction remains onboarding evidence only. It is not combined with, substituted for, or entered as the final transaction.

## Sources

- [Pre-event prototyping and PR timing](https://dorahacks.io/discussion/1562033)
- [Onboarding eligibility and Grand Prize evidence guidance](https://dorahacks.io/discussion/1562024)
- [Sepolia acceptance](https://dorahacks.io/discussion/1562060)
- [Event timeline and submission requirements](https://dorahacks.io/hackathon/agents-onchain/detail)
- [Best Onboarding UX Improvement bounty](https://dorahacks.io/hackathon/bounty/1363)
