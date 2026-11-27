# Code Generation Plan — U1 walking skeleton

## Summary

- Builds: the walking skeleton end to end: two organisations kept apart by row-level security, items proposed and approved with append-only history, a basic web page, MCP read/search/propose, containers, CI and deploy-on-merge.
- Touches: new `api/`, `worker/`, `web/`, `db/`, `e2e/`, `deploy/`, `scripts/`, `.github/workflows/`, root config files; appends four lines to `.gitignore`.
- Tests: about 95 Vitest tests written first (TDD): database, repository, business-logic, API and MCP, worker and web-page tests, one isolation test per route and tool, and the W7 end-to-end check against the containers.

Upstream for every step: `../functional-design/functional-spec.md` (W1 to W7), `../functional-design/rules.md` (BR IDs), `../functional-design/entities.md`, `../nfr-design/` (security, reliability, performance, scalability, observability, logical components), `../infrastructure-design/` (specification, monitoring, CI/CD), `inception/contract-design/contract-summary.md` (C1, C2, C3, C7, C8), `inception/units-generation/unit-of-work.md` (U1), `inception/requirements-analysis/requirements.md`.

Stories built here (thin versions): US2.1 create an item, US2.4 decide on a proposal, US3.5 read an item, US4.1 an AI agent reads organisational context, US7.1 organisations kept apart.

Methodology: TDD (team Testing Contract). Every layer runs Red (failing tests written first, the failing output recorded in `code-summary.md`), then Green (the smallest code that passes), then Refactor with the tests green. Language: TypeScript, strict mode, Node.js LTS. No Rust in U1 (tech-stack decision Q5).

## Repository layout

| Path | What it holds |
|---|---|
| `package.json`, `package-lock.json` | npm workspaces: `db`, `api`, `worker`, `web`, `e2e` |
| `db/` | Kysely migrations, row-level security, grants, pg-boss setup, seed; the `migrate` image entry point |
| `api/` | Fastify app: organisation and auth hooks, `/v1` routes, Better Auth, MCP server, `JobQueue.enqueue`, metrics |
| `worker/` | pg-boss runner behind `JobQueue`, health and metrics |
| `web/` | React + Vite basic pages, built into the `web` (Caddy) images |
| `e2e/` | The W7 end-to-end script against a running stack |
| `deploy/` | `cloud-init.yaml`, `bootstrap-supabase.sql`, `README.md` (runbook), Caddyfiles |
| `scripts/` | `check-isolation.ts` (NFR14.3 CI check) |
| `.github/workflows/` | `ci.yml`, `deploy.yml`, `release.yml`, `uptime.yml` |

Dependencies added (established, proven libraries, per the project rule): `fastify`, `better-auth`, `kysely`, `pg`, `pg-boss` (10), `@modelcontextprotocol/sdk`, `zod`, `prom-client`, `react`, `react-dom`, `vite`, `@vitejs/plugin-react`; dev: `typescript`, `tsx`, `vitest`, `@vitest/coverage-v8`, `@testcontainers/postgresql`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `eslint`, `typescript-eslint`, `eslint-config-prettier`, `prettier`. Exact versions are pinned in `package-lock.json`.

## Steps

### Step 1: Project structure and production configuration skeleton (all stories; NFR11.3, NFR12.1)
- [x] Root `package.json` with the five workspaces and scripts `build`, `lint`, `format:check`, `typecheck`, `test`; `.nvmrc` with the Node.js LTS major.
- [x] `tsconfig.base.json` (`strict: true`, `noUncheckedIndexedAccess`, ES2022, NodeNext) and one `tsconfig.json` per workspace.
- [x] `.prettierrc`, `eslint.config.js` with `typescript-eslint` strict rules, a `no-restricted-syntax` ban on `sql.raw` and `sql.lit` outside `db/src/migrations/` (NFR5.8), and `no-restricted-imports` module boundaries: route and tool modules may import the database only through `api/src/db/with-organisation.ts`, never the raw pool (security design, "Every knowledge query runs with the organisation set"; C7).
- [x] `.env.example` listing every variable name with no value (NFR5.2): `DATABASE_URL_API`, `DATABASE_URL_WORKER`, `DATABASE_URL_MIGRATE`, `BETTER_AUTH_SECRET`, `PUBLIC_BASE_DOMAIN`, `PUBLIC_PORT`, `IMAGE_TAG`, the role passwords `CE_MIGRATE_PASSWORD`, `CE_API_PASSWORD`, `CE_WORKER_PASSWORD`, and the seed values `SEED_ACME_CONTRIBUTOR_PASSWORD`, `SEED_ACME_OWNER_PASSWORD`, `SEED_ACME_AGENT_TOKEN`, `SEED_GLOBEX_OWNER_PASSWORD`, `SEED_GLOBEX_AGENT_TOKEN` (and the `SEED_E2E_A_*`, `SEED_E2E_B_*` equivalents for the hosted test organisations).
- [x] Append `node_modules/`, `dist/`, `coverage/` and `.env` to `.gitignore`, below the AI-DLC block and without touching it: the work cannot keep secrets and build output out of the repository without them (project rule: never commit secrets).
- [x] A startup check in each process (`api/src/config.ts`, `worker/src/config.ts`, `db/src/config.ts`) that exits with the missing variable names, never their values (NFR5.2).

### Step 2: Bootstrap the test runner (NFR11.1, NFR11.2)
- [x] `vitest.config.ts` at the root with one project per workspace (`db`, `api`, `worker` in the `node` environment; `web` in `jsdom`), V8 coverage over `*/src/**`, and `coverage.thresholds.lines: 80` (the floor is set here and never lowered).
- [x] `test/postgres.ts` helper: starts one PostgreSQL 16 container per run with `@testcontainers/postgresql`, creates the three roles with the same SQL as `db/init/01-roles.sql`, runs the migrations as `ce_migrate`, and hands tests a connection per role (integration tests use a real database, never a mock; logical components, Build, test and run).
- [x] U1's test files are named `*.u1.test.ts(x)`; one trivial-free smoke test (`db/test/runner.u1.test.ts`: the container answers `SELECT 1` as `ce_api`) proves the command below runs before the first Red step.
- [x] Record the exact command in `unit-test-instructions.md`: `npx vitest run --coverage.enabled=false u1.test`.

### Step 3: Data model / database — Red (US2.1, US2.4, US3.5, US7.1; NFR9.2, NFR14.1, NFR10.7)
Write failing tests in `db/test/`:
- [x] `schema.u1.test.ts`: each table and column below exists with its constraints; `link` rows refuse `from_item_id = to_item_id`; a second live link with the same `(from, to, type)` is refused; `item_versions (item_id, version_number)` is unique.
- [x] `grants.u1.test.ts` (NFR9.2): as `ce_api`, `permission denied` for `UPDATE`/`DELETE` on `item_versions` and `decisions`, `DELETE` on `proposals` and `links`, `UPDATE proposals SET reason`, `UPDATE items SET type`, `UPDATE items SET organisation_id`; as `ce_worker`, any `SELECT` on `items` and on `organisations` is refused.
- [x] `rls.u1.test.ts` (NFR14.1): with organisation A set, each knowledge table returns no row of B and an `INSERT` with B's id fails; with no organisation set, every `SELECT` returns nothing, run twice on one pooled connection, before and after a `set_config(..., true)` transaction (NULLIF case); a link, decision or group member pointing at another organisation's row is refused by the composite foreign keys.
- [x] `auth-lookup.u1.test.ts`: `auth_service_account(api_key_id)` returns that one account's id, organisation, role and status as `ce_api`, and `PUBLIC` cannot execute it.
- [x] `migrate.u1.test.ts`: running `migrate` twice changes nothing (idempotent migrations, grants, policies, queues and seed); the seed creates both organisations with their accounts only when their variables are set; seeded agent tokens are stored hashed (no table holds the plain token, NFR5.6).
- [x] `supabase-lockdown.u1.test.ts` (hosted shape): with roles named `anon` and `authenticated` present, neither can select from any of our tables after `migrate`.
- [x] Run `npx vitest run --coverage.enabled=false u1.test`; record the failing output.

### Step 4: Data model / database — Green
Kysely migrations in `db/src/migrations/`, each element with the design element that asks for it:
- [x] `organisations`: `organisation_id` (uuid, primary key), `name` (text, at most 120), `address` (text, unique, lower-case letters, digits and hyphens), `status` (`active`), `created_at` — entities `Organisation`; security design, "Organisation from the address".
- [x] Better Auth tables `user`, `session`, `account`, `verification`, `apikey`, generated with the Better Auth CLI and committed as a migration; `user` gets `organisation_id` (references `organisations`), `role`, `status` as Better Auth `additionalFields` with `input: false`, and a unique `(organisation_id, id)` and unique `(organisation_id, email)` — entities `User` (email unique within its organisation); security design, "People are checked too". Better Auth's API-key plugin owns `apikey`.
- [x] `service_accounts`: `service_account_id`, `organisation_id`, `name`, `role` (`Reader`, `Contributor`), `status`, `api_key_id` (references `apikey`), `created_at` — entities `ServiceAccount` (`tokenRef` is `api_key_id`); security design, Authentication.
- [x] `groups`: `group_id`, `organisation_id`, `name` (unique per organisation), `created_at`; `group_members`: `organisation_id`, `group_id`, `user_id`, composite foreign keys to `groups` and `user` — entities `Group.memberUserIds`.
- [x] `items`: `item_id`, `organisation_id`, `type` (seven starting types), `current_version_id`, `status` (`active`), `last_reviewed_at`, `created_at` — entities `Item`.
- [x] `item_versions`: `version_id`, `organisation_id`, `item_id`, `version_number`, `title`, `content`, `why`, `owners` (jsonb list of `OwnerRef`: `kind`, `ref_id`), `sources` (jsonb list of `Source`), `proposal_id`, `approved_by`, `approved_at`, `flags` (`self-approved`) — entities `ItemVersion`, `OwnerRef`, `Source` (value objects stored inside the version).
- [x] `links`: `link_id`, `organisation_id`, `from_item_id`, `to_item_id`, `link_type` (four starting types), `added_in_version_id`, `removed_in_version_id`; check `from <> to`; partial unique index on live links — entities `Link`.
- [x] `proposals`: `proposal_id`, `organisation_id`, `kind`, `item_id` (reserved for a create), `base_version_id`, `changes` (jsonb), `reason`, `origin` (`person`, `ai-agent`), `proposer_kind`, `proposer_id`, `status`, `created_at`, `idempotency_key`, `request_hash`, unique `(organisation_id, proposer_id, idempotency_key)` — entities `Proposal`; reliability design, Idempotent proposals (the proposer kind distinguishes a User from a ServiceAccount id).
- [x] `decisions`: `decision_id`, `organisation_id`, `proposal_id` (unique), `decider_id`, `outcome`, `comment`, `is_self_approval`, `decided_at`; composite foreign key `(organisation_id, decider_id)` to `user` — entities `Decision`.
- [x] Composite `(organisation_id, …)` foreign keys between every pair of knowledge tables, and indexes leading with `organisation_id` (security and performance designs).
- [x] Row-level security policy `organisation_only` with `NULLIF(current_setting('app.organisation_id', true), '')::uuid` on `items`, `item_versions`, `links`, `proposals`, `decisions`, `groups`, `group_members`, `service_accounts` (NFR14.1).
- [x] Grants exactly as the security design's `ce_api` and `ce_worker` tables; `auth_service_account(api_key_id)` `SECURITY DEFINER`, owned by `ce_migrate`, `search_path` pinned, `EXECUTE` revoked from `PUBLIC` and granted to `ce_api` only (NFR design review note on the definer function).
- [x] Revoke all rights of `anon` and `authenticated` on `public` and `pgboss` when those roles exist (hosted shape).
- [x] pg-boss schema creation (`migrate: true` only here) and the queue helper that creates a queue with `retryLimit: 2`, `retryBackoff: true` and a `<type>.dead` dead-letter queue (reliability design, Jobs).
- [x] `db/init/01-roles.sql` (self-hosted `postgres` container init: creates `ce_migrate`, `ce_api`, `ce_worker` from the password variables, no `BYPASSRLS`) and `db/src/seed.ts` (both organisations, their users through Better Auth's sign-up API, the Owners group, the agents' keys through the API-key plugin's own hashing; skipped for an organisation that exists).
- [x] `db/src/migrate.ts`: the `migrate` image entry point; runs migrations, policies, grants, pg-boss setup, queues and seed, then exits 0.

### Step 5: Data model / database — Refactor
- [x] Tidy migration naming and shared SQL helpers while `u1.test` stays green; no behaviour change.

### Step 6: Repository / data access — Red (US2.1, US2.4, US3.5, US4.1, US7.1; NFR14.2, NFR10.3, NFR10.4)
Failing tests in `api/test/repo/` and `worker/test/`:
- [x] `with-organisation.u1.test.ts`: `withOrganisation` sets the organisation for one transaction only; the next transaction on the same connection sees no organisation.
- [x] `items-repo.u1.test.ts`: current approved version with links in both directions, owners and sources in one read; full history with proposer, decider, reason, self-approved flag; open proposals listed apart.
- [x] `proposals-repo.u1.test.ts`: insert with idempotency (same key and hash returns the first proposal; same key, different hash raises a conflict; the same key in another organisation is a different key); `SELECT … FOR UPDATE` locking order item then proposal.
- [x] `search-repo.u1.test.ts`: `ILIKE` on title and content of current versions only, at most 50 results (performance design; BR4.2).
- [x] `job-queue.u1.test.ts` (C3; NFR10.4, NFR10.5): enqueue inside a rolled-back transaction leaves no job; enqueue with no organisation set is refused; the job stores its organisation; a test-only job type failing every time ends in `<type>.dead` after 3 attempts; `defer` reschedules without counting an attempt.
- [x] `job-leases.u1.test.ts` (NFR4.2): two worker processes and one job; the handler runs once.
- [x] Run the command; record the failing output.

### Step 7: Repository / data access — Green
- [x] `api/src/db/pool.ts`, `api/src/db/with-organisation.ts` (`SELECT set_config('app.organisation_id', $1, true)` then the callback).
- [x] `api/src/repo/items.ts`, `api/src/repo/proposals.ts`, `api/src/repo/decisions.ts`, `api/src/repo/search.ts`, `api/src/repo/organisations.ts`, `api/src/repo/principals.ts` (calls `auth_service_account`).
- [x] `shared` job interface `api/src/jobs/job-queue.ts` (the C3 `JobQueue`: `enqueue`, `take`, `complete`, `fail`, `defer`, `deadLetters`, `retryDeadLetter`, `discardDeadLetter`) over pg-boss using the caller's transaction connection; the worker imports the same module through the `db` workspace's exported types.

### Step 8: Repository / data access — Refactor
- [x] Extract shared row mappers; keep tests green.

### Step 9: Business logic — Red (US2.1, US2.4, US3.5, US4.1, US7.1)
Failing tests in `api/test/domain/`:
- [x] `propose.u1.test.ts`: BR1.1 (a proposal changes nothing live), BR1.2 (each missing field named, text kept), BR1.3, BR1.4 (empty owners, agents-only owners, unknown or deactivated entry, an owner from another organisation), BR1.5 (unapproved ends, same item, duplicate live link, removing a link that is not live), BR1.6 (manual source without title or with a non-http(s) address), BR1.7, BR5.1 (a Reader agent refused; a Contributor agent's proposal has origin `ai-agent`).
- [x] `decide.u1.test.ts`: BR2.2 (an agent refused), BR2.1 (a non-owner refused; a group member accepted), BR2.6 (decided once), BR2.7 (out of date: status set and approval refused; siblings marked out of date after an approval), BR2.5 (reject needs a reason), BR2.4 (self-approval flagged on decision and version), BR3.1 and BR3.3 (version n+1 copies unchanged fields, adds the system source, moves the item pointer, sets `last_reviewed_at`), BR1.8 (a rejected create leaves no item), NFR10.1 (a fault after the version insert leaves no version and an open proposal).
- [x] `decide-concurrency.u1.test.ts` (NFR10.2): two parallel approvals of one proposal give one success and one `already-decided`; two proposals on one item approved in parallel give one success and one `proposal-out-of-date`.
- [x] `read.u1.test.ts`: BR4.1 and BR4.2; an open create proposal visible only to its proposer and its named owners (W5 step 5).
- [x] `access.u1.test.ts` (BR6.1): organisation from the host (`acme.localhost` → Acme; unknown host or non-matching shape → not found); a session or token of another organisation → not found; an invalid token → unauthenticated; the Origin rule (cookie write with missing or foreign Origin refused, port appended when `PUBLIC_PORT` is not 443, bearer calls exempt).
- [x] Run the command; record the failing output.

### Step 10: Business logic — Green
- [x] `api/src/domain/propose.ts`, `api/src/domain/decide.ts`, `api/src/domain/read.ts`, `api/src/domain/errors.ts` (problem codes from C1), `api/src/access/organisation.ts`, `api/src/access/principal.ts`, `api/src/access/origin.ts`.

### Step 11: Business logic — Refactor
- [x] Simplify validation into one schema per proposal kind; keep tests green.

### Step 12: API / endpoint — Red (US2.1, US2.4, US3.5, US4.1, US7.1; NFR5.x, NFR6.1, NFR9.1, NFR13.x, NFR14.2, NFR14.3)
Failing tests in `api/test/http/`, `api/test/mcp/`, `api/test/isolation/`, `worker/test/`:
- [x] `hooks.u1.test.ts`: hook order (organisation, then authentication, then Origin); `/healthz`, `/readyz`, `/metrics` answer with `Host: api:3000` and skip the chain; `401`, `403`, `404`, `422` as RFC 9457 problems with fixed `detail` (NFR6.1); no `Access-Control-*` header; session cookie flags `Secure`, `HttpOnly`, `SameSite=Lax`, no `Domain` (NFR5.5).
- [x] `routes.u1.test.ts`: `GET /v1/items`, `GET /v1/items/:itemId` (with `ETag`), `GET /v1/items/:itemId/versions`, `POST /v1/proposals` (`Idempotency-Key` required), `GET /v1/proposals`, `GET /v1/proposals/:proposalId`, `POST /v1/proposals/:proposalId/decisions` (`If-Match` required; `412` on a stale ETag), `GET /v1/query/search`; request bodies validated from `api/openapi/v1.yaml`; no route edits or deletes history (NFR9.1).
- [x] `mcp.u1.test.ts` (C2): `search_knowledge`, `get_item`, `propose_change` over Streamable HTTP at `/mcp` with a bearer token; a deactivated or unknown token refused; errors as `isError` with the C1 code.
- [x] `isolation/*.u1.test.ts` (NFR14.3): one test per route above and per MCP tool, named `isolation: <METHOD> <path>` or `isolation: tool <name>`: as organisation B, act on A's seeded item, proposal or link; expect `404` or an empty list and no row changed. Plus A's agent token at B's address → `404`.
- [x] `observability.u1.test.ts` (NFR13.1 to NFR13.4, NFR2.1): one JSON log line per request with `reqId`, `org`, route, status, duration and no content (a marker string in content never appears); `X-Request-Id` returned; `/metrics` lists `http_requests_total`, `http_request_duration_seconds`, `mcp_tool_duration_seconds`, `proposal_decision_seconds`; unmatched routes labelled `unmatched`.
- [x] `worker/test/worker.u1.test.ts`: the worker's `/healthz`, `/readyz` (database and pg-boss) and `/metrics` (`job_queue_depth`, `job_oldest_waiting_seconds`, `job_attempts_total`, `dead_letter_count`); graceful stop on `SIGTERM`.
- [x] `scripts/test/check-isolation.u1.test.ts`: the check fails when a route or tool has no isolation test and passes when each has one.
- [x] Run the command; record the failing output.

### Step 13: API / endpoint — Green
- [x] `api/openapi/v1.yaml`: the C1 shared parts (problem format, pagination, security schemes, idempotency) and U1's paths above.
- [x] `api/src/app.ts` (Fastify, `genReqId`, pino `redact`, error handler to problem details), `api/src/hooks/*.ts`, `api/src/routes/*.ts`, `api/src/auth.ts` (Better Auth with email and password, API-key plugin, `trustedOrigins` from the organisations, `advanced.defaultCookieAttributes`), `api/src/mcp/server.ts` (MCP TypeScript SDK, three tools as thin wrappers over the domain), `api/src/metrics.ts` (prom-client), `api/src/health.ts`, `api/src/main.ts` (graceful shutdown, 10-second cap).
- [x] `worker/src/main.ts`, `worker/src/runner.ts` (pg-boss `migrate: false`, hands each handler its job's organisation), `worker/src/health.ts`, `worker/src/metrics.ts`.
- [x] `scripts/check-isolation.ts` (lists routes from `api/openapi/v1.yaml` and tools from the MCP registry).

### Step 14: API / endpoint — Refactor
- [x] Share the problem-details builder between routes and MCP errors; keep tests green.

### Step 15: Frontend behaviour — Red (US2.1, US2.4, US3.5)
Failing tests in `web/test/` (Testing Library, jsdom, `fetch` stubbed at the API boundary):
- [x] `sign-in.u1.test.tsx`: seeded email and password sign in through Better Auth's client; a wrong password shows an error.
- [x] `new-item.u1.test.tsx` (W1; AC2.1.1, AC2.1.2): the form posts a create proposal with an idempotency key; a `422` names each field and keeps the typed text.
- [x] `item-page.u1.test.tsx` (W5; AC3.5.1, BR4.1): approved version, owners, links both ways, sources, last reviewed; full history with proposer, decider, reason and "self-approved"; open proposals marked "not yet approved"; "not found" view.
- [x] `decide.u1.test.tsx` (W4; AC2.4.1 to AC2.4.4): proposed change beside the current version; approve with optional comment; reject requires a reason; `403`, `409` and `412` shown in plain words.
- [x] Interactive elements carry `data-testid` attributes.
- [x] Run the command; record the failing output.

### Step 16: Frontend behaviour — Green
- [x] `web/index.html`, `web/src/main.tsx`, `web/src/api.ts` (calls `/v1` on the same origin), `web/src/pages/SignIn.tsx`, `ItemList.tsx`, `NewItem.tsx`, `ItemPage.tsx`, `Decide.tsx`; minimal styling only (U18 and U19 replace these pages).

### Step 17: Frontend behaviour — Refactor
- [x] Extract a shared problem-message helper; keep tests green.

### Step 18: Environment and build configuration (NFR5.1, NFR5.9, NFR12.1, NFR11.3, NFR4.1, NFR10.6, NFR10.7; infrastructure design)
- [x] Dockerfiles: `api/Dockerfile`, `worker/Dockerfile`, `db/Dockerfile` (the `migrate` image), `web/Dockerfile` with two targets, `web` (stock Caddy) and `web-hosted` (`xcaddy` with the DNS provider module chosen here: the Cloudflare module, `caddy-dns/cloudflare`, as the documented default, swappable by build argument). Multi-stage, non-root user, public base images, pinned tags.
- [x] `deploy/Caddyfile` (self-hosted and local: one site block, local CA or HTTP challenge, `/healthz` answered by Caddy, `/v1/*`, `/mcp`, `/api/auth/*` to `api`, never the health or metrics paths, security headers) and `deploy/Caddyfile.hosted` (site `<service address>, *.<service address>`, DNS challenge).
- [x] `compose.yaml` (`web`, `api`, `worker`, `migrate`, `postgres` with `profiles: [selfhosted]` only in the hosted override; health checks on `/readyz`; `restart: unless-stopped`; memory limits; `json-file` log rotation; volumes `pgdata`, `caddy_data`; only 80 and 443 published) and `compose.hosted.yaml` (`!override` on `depends_on`; Compose 2.24 or later; `web-hosted`).
- [x] `deploy/cloud-init.yaml`, `deploy/bootstrap-supabase.sql`, `deploy/README.md` (first-time setup of the VM, DNS and Supabase project; the session pooler user format `<role>.<project-ref>`; restore from a daily backup; manual redeploy of a commit).
- [x] `e2e/w7.u1.test.ts`: the W7 end-to-end script (functional spec W7 steps 1 to 6) against a base URL and host names from the environment, connecting to `127.0.0.1` with the organisation's host name.
- [x] `.github/workflows/ci.yml` (cicd-pipeline steps 1 to 10: install, Prettier, ESLint, `tsc`, gitleaks, Vitest with coverage, isolation check, OpenAPI check, image builds, end-to-end on both shapes, rollback rehearsal; Rust jobs only when a `Cargo.toml` exists), `deploy.yml` (publish, deploy, check, rollback with `--no-deps`, concurrency group, `live` environment limited to `main`), `release.yml` (version tags), `uptime.yml` (every 15 minutes).

### Step 19: Documentation and traceability
- [x] Inline TSDoc on the public module interfaces (`JobQueue`, `withOrganisation`, `Access.organisation`); `api/openapi/v1.yaml` descriptions.
- [x] `code-summary.md`, `source-manifest.json` and `traceability.json` in this folder (the stage's Step 5).

## Story to step map

| Story | Steps |
|---|---|
| US2.1 Create an item (W1, W2, W3) | 3 to 4, 6 to 7, 9 to 10, 12 to 13, 15 to 16 |
| US2.4 Decide on a proposal (W4) | 3 to 4, 6 to 7, 9 to 10, 12 to 13, 15 to 16 |
| US3.5 Read an item (W5) | 6 to 7, 9 to 10, 12 to 13, 15 to 16 |
| US4.1 An AI agent reads organisational context (W6) | 6 to 7, 9 to 10, 12 to 13 |
| US7.1 Organisations kept apart (W7 step 6) | 3 to 4, 6 to 7, 9 to 10, 12 to 13, 18 |
| Skeleton running from containers, CI and deploy (W7, team practices) | 1, 2, 18 |

## Testing Contract

```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "team",
  "ordering": "For each testable layer, write a failing test first, then write the smallest code that makes it pass, then refactor with the tests green before moving on.",
  "scope": "mvp",
  "test_strategy": "standard",
  "project_type": "greenfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop`, `classic` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "We write tests first. For every piece of work, the failing test comes before\nthe code that makes it pass.\n\n- **Methodology**: tdd\n- **Methodology evidence**: The team chose \"tests first (TDD): write the test,\n  then the code that passes it\" in the practices interview (Q3) and confirmed\n  it in the summary.\n- **Ordering**: For each testable layer, write a failing test first, then write\n  the smallest code that makes it pass, then refactor with the tests green\n  before moving on.\n- **Coverage floor**: at least 80% line coverage.\n- **CI**: the tests run in CI on every change; a failing test blocks the merge.\n- **Languages**: the rules apply equally to TypeScript and Rust code.\n- **Not allowed**: tests that pass whatever the code does.\n- **Tooling (suggestion only, not yet chosen)**: Vitest for TypeScript and\n  `cargo test` for Rust; the final choice is made with the tech stack."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Meet an 80% line-coverage floor.",
      "Run the selected tests in CI before merge."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "tdd",
    "runner_step": "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - Red: write the failing tests and record the failing command output.",
      "Data model / database behavior - Green: implement only enough behavior to pass.",
      "Data model / database behavior - Refactor: improve the implementation while tests stay green.",
      "Repository / data access - Red: write the failing tests and record the failing command output.",
      "Repository / data access - Green: implement only enough behavior to pass.",
      "Repository / data access - Refactor: improve the implementation while tests stay green.",
      "Business logic - Red: write the failing tests and record the failing command output.",
      "Business logic - Green: implement only enough behavior to pass.",
      "Business logic - Refactor: improve the implementation while tests stay green.",
      "API / endpoint - Red: write the failing tests and record the failing command output.",
      "API / endpoint - Green: implement only enough behavior to pass.",
      "API / endpoint - Refactor: improve the implementation while tests stay green.",
      "Frontend behavior - Red: write the failing tests and record the failing command output.",
      "Frontend behavior - Green: implement only enough behavior to pass.",
      "Frontend behavior - Refactor: improve the implementation while tests stay green.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:820b96624d81e21a900353f3bb9f15e6c2c73ba640d8a719f6f2477935024770",
  "contract_sha256": "sha256:a78c365615ef2e8e756bc013980845ff0bf844f1cc63455677df97adab0de188"
}
```
