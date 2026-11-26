# Tech Stack Decisions — U1 walking skeleton

U1 fixes the stack every later unit builds on (`inception/delivery-planning/bolt-plan.md`, B1 Definition of Done). Choices follow the project rule to use established, proven libraries (`project.md`, Corrections) and the team's TypeScript and Rust practice. Answers are in `nfr-requirements-questions.md` (Q1 to Q10). Exact versions are pinned when the code is generated.

## Choices

| Area | Choice | Why | Alternatives rejected | Source |
|---|---|---|---|---|
| Runtime | Node.js, current LTS | Mature runtime for a product other organisations self-host | Bun: younger runtime | Q1 |
| API and worker framework | Fastify | JSON-schema request and response validation fits the OpenAPI-first API (`contract-summary.md` C1); async errors handled; pino logging built in | Express: no schema validation, async errors need wrapping; NestJS: more framework than needed; Hono: younger ecosystem | Q1 |
| Database | PostgreSQL, current major | Main database and job queue in one place (`contract-summary.md` C3) | (settled by C3) | C3 |
| Database access | Kysely with its migrator (SQL migrations) | Queries are the SQL that runs, so the one-transaction approval (`rules.md` BR3.1) and append-only history (BR3.2) are visible and testable | Drizzle: schema owned by TypeScript, append-only rules still need custom SQL; Prisma: less control over locks and raw SQL | Q2 |
| Job queue | pg-boss behind the C3 `JobQueue` interface | Retries with backoff, delayed jobs, dead-letter queue, enqueue on the caller's connection | graphile-worker: dead letters to build ourselves; own `SKIP LOCKED` queue: against the project rule | Q3 |
| Sign-in | Better Auth: email and password for the seeded users; its API-key plugin for service-account tokens | Users, sessions and hashed keys in our PostgreSQL; U2 adds Google and Microsoft sign-in to the same library; no extra container | Keycloak or Ory: a separate Java or Go service to run per install; Auth.js: weak email and password support | Q6 |
| MCP server | Official MCP TypeScript SDK, Streamable HTTP at `/mcp` | The reference implementation for `contract-summary.md` C2 | (settled by C2) | C2 |
| Web pages | React with Vite, built to static files | Same React stack U18 and U19 use with shadcn/ui; no second server | Next.js, React Router framework: a Node server in `web` for basic pages | Q4 |
| `web` container and HTTPS | Caddy: serves the built web files and proxies `/v1`, `/mcp` to `api` over HTTPS | One container is both the static server and the HTTPS edge (Q7); automatic local and real certificates | nginx: manual certificates; a separate static server plus proxy: one more container | Q4, Q7 |
| Metrics | prom-client on `/metrics` | Prometheus text format required by `contract-summary.md` C8 | OpenTelemetry metrics: more to run, tracing deferred (Q9) | Q9 |
| Tests | Vitest with V8 coverage | Team suggestion for TypeScript; tests first, 80% line floor | Jest: slower with ESM and TypeScript | team practice |
| Lint and format | ESLint (with a module-boundary rule, C7), Prettier; `rustfmt`, `clippy` jobs ready | Team practice | — | team practice, Q5 |
| Local run | Docker Compose: `web` (Caddy), `api`, `worker`, `postgres` | The end-to-end check runs from containers (`functional-spec.md` W7) | — | unit-of-work |
| CI | GitHub Actions | Team practice | — | team practice |
| Rust | None in U1; CI Rust jobs present and skipped until a crate exists | No placeholder code (Q5) | A placeholder crate; no Rust CI | Q5 |

## Requirements carried here

| ID | Requirement | Pass/fail check |
|---|---|---|
| NFR11.1 | Tests are written before the code that makes them pass | Review: each change's tests precede or accompany its code |
| NFR11.2 | Line coverage at least 80% for `api`, `worker` and `web` code | Vitest coverage report in CI below 80% fails the job |
| NFR11.3 | CI runs format, lint, type check and tests on every pull request; any failure blocks the merge | A failing job blocks the pull request |
| NFR12.1 | Every part runs as a container; nothing depends on one cloud provider | `docker compose up` on a clean machine runs the W7 end-to-end check |

## Sources
- `functional-spec.md` (W7 end-to-end check), `rules.md` (BR3.1, BR3.2).
- `inception/requirements-analysis/requirements.md` (NFR11, NFR12, constraints).
- `inception/contract-design/contract-summary.md` (C1, C2, C3, C7, C8 and their open questions).
- `nfr-requirements-questions.md` Q1 to Q10.
