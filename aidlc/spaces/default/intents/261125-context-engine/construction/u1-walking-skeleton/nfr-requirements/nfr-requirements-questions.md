# NFR Requirements — U1 walking skeleton — Questions

Context: U1 is the thin end-to-end slice that proves every layer connects (`inception/units-generation/unit-of-work.md`): an item is proposed, approved by its owner, stored with its history, and read back on a basic web page and through MCP, all from containers. Its Definition of Done (`inception/delivery-planning/bolt-plan.md`, B1) says the job-queue library (contract C3) and the authentication library (contract C1) are chosen here, because U1 and U2 build on them. So most questions below fix the technology the rest of the product builds on; the code U1 writes is extended later, not thrown away. Already settled and not asked: PostgreSQL as the main database (contract C3 keeps the job queue in it), the official MCP TypeScript SDK for the MCP server (contract C2), and TypeScript strict mode with Prettier and ESLint (team practice). Each first option is my recommendation.

## Q1. [Developer] Which web framework runs the `api` and `worker` containers?

Both containers are TypeScript (team practice). The `api` serves the public REST API `/v1` checked against an OpenAPI file (contract C1), the MCP endpoint (C2) and the health endpoints (C8).

A. Node.js with Fastify: mature, fast, built-in JSON schema validation that fits an OpenAPI-first API, and a large plugin set (Recommended: proven and well supported, matches the "use established libraries" rule)
B. Node.js with NestJS: more structure (modules, dependency injection) at the cost of more framework to learn
C. Node.js with Hono: very small and fast, runs anywhere, younger ecosystem
D. Bun with Hono: fastest start-up, but a younger runtime for a self-hosted product others will run
X. Other (please specify)

[Answer]: A

## Q2. [Developer] How does the code talk to PostgreSQL?

Every approval writes several rows in one all-or-nothing transaction (BR3.1), and history rows are never updated or deleted (BR3.2, NFR9).

A. Kysely: a typed SQL query builder with plain SQL migrations; full control over transactions and append-only tables, no hidden queries (Recommended: the history and locking rules are easier to see and test in plain SQL)
B. Drizzle ORM: typed schema in TypeScript, SQL-like queries, generated migrations
C. Prisma: the most popular ORM, schema file and generated client; less direct control over locking and raw SQL
D. node-postgres (`pg`) with hand-written SQL only
X. Other (please specify)

[Answer]: A

## Q3. [Developer] Which Postgres job-queue library backs the job interface (contract C3)?

The contract needs leases safe with several worker copies, delayed runs, retries with backoff, a dead-letter queue, and enqueueing inside the caller's transaction (contract C3, open question).

A. pg-boss: retries with backoff, delayed jobs, a built-in dead-letter queue, and it can enqueue on the caller's database connection (Recommended: covers every C3 operation with the least built on top)
B. graphile-worker: very fast and transactional, but dead letters must be built on top (failed jobs stay in the table)
C. A small queue of our own on `SELECT ... FOR UPDATE SKIP LOCKED` (against the project rule to use proven libraries)
X. Other (please specify)

[Answer]: A

## Q4. [Developer] What stack builds the `web` container's basic pages?

U1's pages are basic and replaced later, but U18 and U19 build the real screens with shadcn/ui (React) on top of the same container.

A. React with Vite, a single-page app served as static files, calling `/v1` with the session cookie (Recommended: the same React stack U18 and U19 need, and no second server to run)
B. Next.js (React with server rendering), its own Node server in the `web` container
C. React Router framework mode (formerly Remix), server-rendered
X. Other (please specify)

[Answer]: A

## Q5. [Developer] Does U1 contain any Rust?

U1's CI must run Rust format and lint checks as well as TypeScript (unit-of-work.md), but no unit has been given Rust yet; U3's graph traversal and U5's assessment are the candidates.

A. No Rust code in U1; the CI has Rust format, lint and test jobs ready that run as soon as a Rust crate exists (Recommended: no placeholder code to maintain; the first Rust unit switches the jobs on)
B. A tiny Rust crate in U1 (for example a content hash helper used by the api) so the Rust toolchain is proven end to end from day one
C. No Rust and no Rust CI jobs until a unit needs Rust
X. Other (please specify)

[Answer]: A

## Q6. [Security] Which authentication library does U1 use for the seeded sign-in, which U2 then extends?

U1 signs in two seeded accounts (a contributor and an owner); U2 adds Google and Microsoft single sign-on and email and password (FR11.1, FR11.2). The choice fixes the session cookie and token format (contract C1, open question). Seed passwords and the agent's token come from the environment, never the repository (project rule).

A. Better Auth: TypeScript library that keeps users and sessions in our PostgreSQL, with email and password, Google and Microsoft sign-in, and secure session cookies (Recommended: one library covers U1 and U2 with no extra container)
B. Auth.js (NextAuth): widely used, strongest with Next.js; email and password support is limited
C. Keycloak or Ory: a separate identity server container; most complete, most to run and configure for a self-hosted install
X. Other (please specify)

[Answer]: A

## Q7. [Security] How is traffic encrypted in transit in U1 (NFR5)?

NFR5 says all traffic is encrypted in transit. U1 runs on a developer machine from a local container setup; the live copy deployed on every merge (team practice) comes with the pipeline stages.

A. A reverse proxy (Caddy) in front of `web` and `api` serves HTTPS, with a local certificate on a developer machine and a real one on a deployed copy; container-to-container traffic stays inside the private container network (Recommended: same setup locally and deployed, so cookies are marked secure from day one)
B. Plain HTTP locally; HTTPS added only for deployed copies
C. HTTPS end to end, including between containers
X. Other (please specify)

[Answer]: A

## Q8. [Operations] What response-time targets does U1 hold to?

The product targets are 5 seconds for 95% of MCP answers (NFR2) and under 2 seconds for list views (NFR3); they are proven later (U15, U18, U20). U1 runs with a handful of seeded items.

A. 95% of API requests (propose, decide, read, MCP search and read) under 500 ms on a developer machine with up to 1,000 items, checked by a simple timed test in CI (Recommended: catches a slow design early without a load test)
B. No targets in U1; measure request latency only, targets start in U15 and U20
C. The product targets only: 95% of MCP calls under 5 seconds, pages under 2 seconds
X. Other (please specify)

[Answer]: X. Other: Performance standards will be established after MVP

## Q9. [Operations] What logs, metrics and tracing does U1 set up?

Every container exposes `/healthz`, `/readyz` and `/metrics` (contract C8), and logs never contain item or source content (NFR6).

A. Structured JSON logs (one line per request with a request id, never content) and Prometheus metrics for request rate, errors, latency, job-queue depth and dead letters; tracing comes later (Recommended: everything NFR13 needs to measure, with the least to run)
B. The same, plus OpenTelemetry tracing across `web`, `api` and `worker` from day one
C. Health endpoints and plain logs only; metrics come in U20
X. Other (please specify)

[Answer]: A

## Q10. [Product owner] Does "performance standards after the MVP" also move the product's agreed speed targets out of the MVP?

Your answer to Q8 says performance standards come after the MVP. For U1 that simply means no targets. But the approved requirements set two speed targets inside the MVP, and the delivery plan checks them before those units are done: 95% of MCP, Slack and Teams answers within 5 seconds (NFR2, checked in U15 and U16), and the 3D map at 30 frames per second with 10,000 items, with the list view under 2 seconds (NFR3, checked in U18). The 5-minute proposal target (NFR1, U9) is a speed target too.

A. Only U1 has no targets: it measures request latency and sets no limit; NFR1, NFR2 and NFR3 stay in the MVP and are checked in their own units as planned (Recommended: the skeleton isn't slowed down, and the agreed requirements stay as they are)
B. Move NFR1, NFR2 and NFR3 out of the MVP: the requirements and the delivery plan record them as post-MVP, and no unit checks them before the MVP ships
C. Keep NFR1 (proposal latency) in the MVP and move only the answer and map speed targets (NFR2, NFR3) after it
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Q1 API framework: Fastify on Node.js for `api` and `worker`.
- Q2 Database access: Kysely with plain SQL migrations on PostgreSQL.
- Q3 Job queue: pg-boss behind the C3 job interface.
- Q4 Web pages: React with Vite, a single-page app served as static files.
- Q5 Rust: no Rust code in U1; CI has Rust format, lint and test jobs ready for the first crate.
- Q6 Sign-in: Better Auth, users and sessions in PostgreSQL; U2 extends it with Google, Microsoft and email sign-in.
- Q7 HTTPS: Caddy serves HTTPS in front of `web` and `api` (local certificate on a developer machine); container-to-container traffic stays on the private network.
- Q8 and Q10 Speed: U1 sets no speed targets and only measures request latency; NFR1, NFR2 and NFR3 stay in the MVP and are checked in their own units.
- Q9 Observability: structured JSON logs with a request id and no content, plus Prometheus metrics (requests, errors, latency, queue depth, dead letters); tracing later.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
