# Contract Design — Questions

Context: `inception/units-generation/unit-of-work.md` and `unit-of-work-dependency.md` (20 units in 4 containers: `api`, `worker`, `web`, `chatbot`), `inception/domain-design/components.md` and `inception/requirements-analysis/requirements.md`. Units inside the same container talk through in-process module interfaces. These questions settle the contracts that cross containers or leave the system. Each first option is my recommendation.

## Q1. [Architect] How should the web app, chat bot and worker talk to the main backend?

A. REST over HTTP with JSON, described by an OpenAPI spec (Recommended: widely supported, easy for other organisations and tools to integrate)
B. GraphQL
C. A TypeScript-only typed RPC (for example tRPC)
D. Not yet defined
X. Other (please specify)

[Answer]:

## Q2. [Architect] Should that backend API also be a documented public API for other tools?

You want "any store of data" to integrate easily, and the product is open source.

A. Yes: the same REST API is public, documented and versioned; MCP sits beside it for AI agents (Recommended)
B. No: internal only; MCP is the only outside interface
C. Not yet defined
X. Other (please specify)

[Answer]:

## Q3. [Architect] How should API changes be versioned?

A. A major version in the path (`/v1`); within a version only additive changes; a breaking change needs a new version, with the old one kept for at least one release (Recommended)
B. No versioning in the first version
C. Not yet defined
X. Other (please specify)

[Answer]:

## Q4. [Architect] How should background work (content changes, extraction jobs, notifications) be passed around?

A. A durable job queue kept in the main database: no extra service to run, which suits self-hosting (Recommended)
B. A separate message broker service
C. Not yet defined
X. Other (please specify)

[Answer]:

## Q5. [Architect] How should errors, timeouts and retries work across boundaries?

A. One standard error format (RFC 9457 "problem details"); 10-second timeouts for API calls and 30 seconds for AI calls; up to 3 retries with backoff, only for safe-to-repeat calls; creating a proposal takes an idempotency key so a retry never makes a duplicate (Recommended)
B. Decide per contract later
C. Not yet defined
X. Other (please specify)

[Answer]:
