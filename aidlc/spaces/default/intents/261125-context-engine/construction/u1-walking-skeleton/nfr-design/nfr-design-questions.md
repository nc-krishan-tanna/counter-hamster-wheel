# NFR Design — U1 walking skeleton — Questions

Context: the NFR requirements for U1 are set (`../nfr-requirements/`). Most of the design follows from them and from the stack you chose (Fastify, Kysely, pg-boss, Better Auth, Caddy). Two points are genuinely open. The architecture check on the requirements raised the first one: a cross-origin check can't be met with CORS off alone. The second is what the `worker` container actually does in U1. The other review points (exact database grants, a separate migration role, health and metrics endpoints kept off the public proxy, how the seeded agent token is stored) are fixed in this design without needing a decision from you. Each first option is my recommendation.

## Q1. [Security] Should U1 refuse cross-site writes from a browser?

Sign-in uses a session cookie with `SameSite=Lax`, which already stops most cross-site form posts. The full CSRF and origin rules were planned for U2. Without a check on the server, a request sent from another site with the person's cookie would still be run in some edge cases (for example a same-site subdomain).

A. Yes: one small server check refuses any cookie-authenticated `POST`, `PUT`, `PATCH` or `DELETE` whose `Origin` header is not our own address (`403 forbidden`); agent calls with a bearer token are unaffected; U2 keeps the rest of the CSRF work (Recommended: a few lines, closes the gap now, nothing to undo later)
B. No: rely on `SameSite=Lax` in U1 and record the gap as a known U1 limit closed by U2
X. Other (please specify)

[Answer]: A

## Q2. [Developer] What does the `worker` container do in U1?

U1 owns the job interface (contract C3) and starts the `worker` container, but none of U1's workflows needs background work; the first real job types arrive with U7, U8 and U9.

A. The worker starts, connects to the queue and reports healthy; the job interface is proven by automated tests with a test-only job type (enqueue in a transaction, retry, dead letter). No production job type in U1 (Recommended: no placeholder job to maintain or remove later)
B. Add one real job now: when a proposal is decided, enqueue a "proposal decided" job that the worker records, as a placeholder for U7's notifications
C. Leave the worker container out of U1 until the first unit needs it
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Q1 Cross-site writes: a server check refuses cookie-signed POST, PUT, PATCH and DELETE requests whose Origin is not our own address (403); bearer-token agent calls are unaffected; U2 keeps the rest of the CSRF work.
- Q2 Worker: the worker starts, connects to the job queue and reports healthy; tests with a test-only job type prove enqueue-in-transaction, retry and dead letters; no production job type in U1.
- Fixed in the design without a question (from the requirements review): a full per-table database grant list with a separate migration role; health and metrics endpoints of api and worker not routed through Caddy; the seeded agent token hashed with Better Auth's own method at seed time; traceability marked partial where U1 covers only part of a requirement.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
