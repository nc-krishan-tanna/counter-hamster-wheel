# Contract Design — Questions

Context: `inception/units-generation/unit-of-work.md` and `unit-of-work-dependency.md` (20 units in 4 containers: `api`, `worker`, `web`, `chatbot`), `inception/domain-design/components.md` and `inception/requirements-analysis/requirements.md`. Units inside the same container talk through in-process module interfaces. These questions settle the contracts that cross containers or leave the system. Each first option is my recommendation.

## Q1. [Architect] How should the web app, chat bot and worker talk to the main backend?

A. REST over HTTP with JSON, described by an OpenAPI spec (Recommended: widely supported, easy for other organisations and tools to integrate)
B. GraphQL
C. A TypeScript-only typed RPC (for example tRPC)
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. [Architect] Should that backend API also be a documented public API for other tools?

You want "any store of data" to integrate easily, and the product is open source.

A. Yes: the same REST API is public, documented and versioned; MCP sits beside it for AI agents (Recommended)
B. No: internal only; MCP is the only outside interface
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q3. [Architect] How should API changes be versioned?

A. A major version in the path (`/v1`); within a version only additive changes; a breaking change needs a new version, with the old one kept for at least one release (Recommended)
B. No versioning in the first version
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q4. [Architect] How should background work (content changes, extraction jobs, notifications) be passed around?

A. A durable job queue kept in the main database: no extra service to run, which suits self-hosting (Recommended)
B. A separate message broker service
C. Not yet defined
X. Other (please specify)

[Answer]: A. Durable job queue in the main database, behind a swappable job interface (enqueue, take, complete, retry) so a broker can replace it later without changing the rest; plus a dead-letter queue for jobs that exhaust their retries (payload, error and attempt count kept; alert when above zero; admin can retry or discard; time-limited retention). AI model outages pause and retry without using up a job's attempts; only jobs that are themselves bad are dead-lettered.

## Q5. [Architect] How should errors, timeouts and retries work across boundaries?

A. One standard error format (RFC 9457 "problem details"); 10-second timeouts for API calls and 30 seconds for AI calls; up to 3 retries with backoff, only for safe-to-repeat calls; creating a proposal takes an idempotency key so a retry never makes a duplicate (Recommended)
B. Decide per contract later
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Q1: the web app, chat bot and worker talk to the main backend over REST/HTTP with JSON, described by an OpenAPI spec.
- Q2: the same REST API is public, documented and versioned for other tools; MCP sits beside it for AI agents.
- Q3: a major version in the path (`/v1`); only additive changes within a version; a breaking change needs a new version, and the old one is kept for at least one release.
- Q4: background work goes through a durable job queue in the main database, behind a swappable job interface (enqueue, take, complete, retry) so a broker can replace it later; a dead-letter queue holds jobs that exhaust their retries (payload, error and attempt count kept, alert when above zero, admin can retry or discard, time-limited retention); AI model outages pause and retry without using up a job's attempts.
- Q5: one error format (RFC 9457 problem details); 10-second timeouts for API calls and 30 seconds for AI calls; up to 3 retries with backoff, only for safe-to-repeat calls; creating a proposal takes an idempotency key.
- Organisations (from requirements FR14 and NFR14, domain design ADR-009 and ADR-010, and the mockups' Q6, 2026-11-26; no new question needed): every organisation's API is served at its own address (`https://{org}.<service>/v1`, and `/mcp`); a session or token belongs to one organisation, and a call whose address and credential name different organisations is refused; a suspended organisation gets a new `organisation-suspended` error; every job payload carries its organisation; the operator console uses a separate, non-public operator API that is not part of `/v1`; a self-hosted install has a single address and one organisation.
- Q6: operators read an organisation's knowledge for support only through the read-only operator API; each read writes its support log entry (operator, time, what was opened, reason) before returning anything, and operators never get a session on an organisation's address.

- Looks correct
- Request changes

[Answer]: Looks correct

## Q6. [Architect] How does an operator read an organisation's knowledge for support?

From the contract review (R-08): the operator console can open support access, but no contract returns knowledge to an operator, and the support log entry must be written before anything is read (requirements FR14.5).

A. Through the operator API itself: read-only operations that return items, their history and sources for one organisation, each call writing its support log entry (operator, time, what was opened, reason) before returning anything; operators never get a session on the organisation's address (Recommended: the public API stays one-organisation-only, and the log can't be skipped because it lives in the only read path)
B. A short-lived, read-only operator credential accepted by the public API on the organisation's address, issued after the reason is given and logged
X. Other (please specify)

[Answer]: A
