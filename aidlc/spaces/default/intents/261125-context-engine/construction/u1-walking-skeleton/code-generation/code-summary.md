# Code Summary — U1 walking skeleton

Built from the approved `code-generation-plan.md` (19 steps), tests first (team Testing Contract: TDD). Application code is at the repository root; the full list of paths is in `source-manifest.json`.

## Files created or modified

| Area | Paths |
|---|---|
| Root configuration | `package.json` (npm workspaces `db`, `api`, `worker`, `web`, `e2e`), `package-lock.json`, `.nvmrc`, `tsconfig.base.json`, `tsconfig.json`, `.prettierrc`, `.prettierignore`, `eslint.config.js`, `vitest.config.ts`, `.env.example`; `.gitignore` gained `node_modules/`, `dist/`, `coverage/`, `.env` below the AI-DLC block |
| Database (`db/`) | `init/01-roles.sql`, `better-auth.config.ts`, `src/` (`config`, `schema`, `auth`, `grants`, `queues`, `seed`, `migrate`, migrations `0001_organisations` to `0004_row_level_security`), `Dockerfile` (the `migrate` image) |
| API (`api/`) | `openapi/v1.yaml`; `src/` app, config, auth, OpenAPI loader, health, metrics, access hooks (`access/organisation`, `principal`, `origin`, `hooks/access`), `db/pool` and `db/with-organisation`, repositories, `jobs/job-queue` (C3), domain (`propose`, `proposal-schema`, `decide`, `read`, `errors`, `etag`), `routes/v1`, `mcp/server`; `Dockerfile` |
| Worker (`worker/`) | `src/` (`config`, `main`, `runner`, `health`, `metrics`), `Dockerfile` |
| Web (`web/`) | `index.html`, `vite.config.ts`, `src/` (`main`, `App`, `api`, `problem-message`, pages `SignIn`, `ItemList`, `NewItem`, `ItemPage`, `Decide`), `Dockerfile` with targets `web` and `web-hosted` |
| Tests | 31 files, 202 tests: `db/test/`, `api/test/{repo,domain,http,mcp,isolation}/`, `worker/test/`, `scripts/test/`, `web/test/`; helpers `test/postgres.ts`, `test/fixtures.ts`; end-to-end `e2e/w7.u1.test.ts` |
| Run and deploy | `compose.yaml`, `compose.hosted.yaml`, `deploy/` (`Caddyfile`, `Caddyfile.hosted`, `caddy-routes.caddy`, `cloud-init.yaml`, `bootstrap-supabase.sql`, `README.md` runbook), `scripts/check-isolation.ts`, `.github/workflows/` (`ci`, `deploy`, `release`, `uptime`) |

## Key implementation decisions

- **Node.js 26 runs the TypeScript sources directly** (built-in type stripping): no compile step or `dist` for `api`, `worker` and `migrate`; `tsc --noEmit` type-checks; only `web` is built, with Vite.
- **TypeScript ~6.0.3**, because `typescript-eslint` supports below 6.1 only. **pg-boss 10.4.2.** **Better Auth 1.7**, whose API-key plugin is the separate package `@better-auth/api-key`.
- **Better Auth tables** were generated with the Better Auth CLI and committed verbatim as migration `0002`.
- **Public sign-up is closed in U1:** a user is created only while the seed sets its context (a `databaseHooks.user.create.before` guard), so organisation, role and status never come from a request. Agent keys use the plugin's own key hasher; its default rate limit is off.
- **Seeded Owners group ids are derived from the organisation address**, so the W7 script can name the group as owner without a group-listing route (none is in the plan); a value in an existing column, with a test.
- **`api/openapi/v1.yaml` is written in JSON form** (valid YAML 1.2), so no YAML parser is needed; Fastify route schemas are built from it, and a test checks served routes equal documented routes.
- **U1 shapes follow the functional design** (`entities.md`): proposal kinds `create | change | add-link | remove-link`, the seven item types, a single `baseVersionId`; `precondition-failed` (412) added to the C1 problem codes as an additive enum value.
- **MCP is stateless:** one server per request on the web-standard transport, so the logging and metrics hooks cover `/mcp`; auth failures are HTTP 401/404, tool problems `isError` with the C1 code.
- **No channel column on proposals:** the system source's channel comes from the origin (people use the web page, agents MCP); marked `shortcut:` in `api/src/domain/propose.ts`.
- **Coverage thresholds per package** (`api`, `worker`, `web` at 80% lines) on top of the global 80% floor.
- **Tools named for CI:** gitleaks (secret scan), oasdiff (OpenAPI breaking-change check), Cloudflare as the default DNS module for `web-hosted`.
- **Data model:** `item_versions.proposal_id` is unique (one version per proposal, a key the requested element needs); `proposals.item_id` has no foreign key because a create proposal reserves an id for an item not created yet (organisation scope comes from row-level security). No element outside the plan was added.
- **Packages added beyond the plan's list** because the named libraries need them: `@better-auth/api-key`, `@types/node`, `@types/pg`, `@types/react`, `@types/react-dom`, `@testing-library/dom`.

## Test coverage summary

- Command: `npx vitest run --coverage.enabled=false u1.test` (U1's tests only). All 202 tests pass against a real PostgreSQL 16 container; the suite ran green three times in a row.
- Full-suite line coverage with V8: 93.4% overall; `api` 86.5%, `worker` 83.8%, `web` 87.8%, `db` 81.3% (floor 80%; Build and Test measures it on the assembled project).
- Prettier check, ESLint, `tsc` on every workspace and the isolation check also pass.

### TDD record (Red runs)

| Step | Result of the Red run (`npx vitest run --coverage.enabled=false u1.test`) |
|---|---|
| 3 Database | 6 files failed, 1 passed; only the runner smoke test ran. `Cannot find module '../src/migrate.ts'` |
| 6 Repository | 6 files failed, 7 passed; 48 tests passed. `Cannot find module '../../src/db/pool.ts'`; `Cannot find package '@ce/api/db/pool'` |
| 9 Business logic | 5 files failed, 13 passed; 71 tests passed. `Cannot find module '../../src/domain/decide.ts'` (and `propose.ts`, `access/organisation.ts`) |
| 12 API, MCP, worker | 7 files failed, 18 passed; 127 tests passed. `Cannot find module '../../src/app.ts'`, `'../check-isolation.ts'`, `'../src/health.ts'` |
| 15 Web | 4 files failed, 25 passed; 174 tests passed. `Failed to resolve import "../src/pages/Decide.tsx"` (and `ItemPage`, `NewItem`, `SignIn`) |

Written after Green rather than before: coverage tests for the entry points (`api/test/http/main.u1.test.ts`, `web/test/app.u1.test.tsx`, the worker's start and config tests, after startup moved into `startApi`/`startWorker` and `App.tsx` split from `main.tsx`), the `ownersGroupId` seed change, and the fix for a shutdown crash the SIGTERM test caught (Better Auth's background trusted-origins lookup ran after the pool closed; it now fails closed and logs).

## Tests written but not executed in this stage

| Test or check | Reason |
|---|---|
| Docker image builds (`api`, `worker`, `db`, `web`, `web-hosted`) | This machine could not pull base images (`docker pull` stalls at the Docker credential helper); `docker compose config` passes for both shapes |
| `docker compose up` and the W7 end-to-end check (`e2e/w7.u1.test.ts`) | Needs the images above; the test runs only when `E2E_BASE_HOSTS` is set. This is the skeleton's recorded verification; it runs in CI and in Build and Test |
| Caddy configuration | Never parsed by Caddy here (no image); directive order checked by reading |
| GitHub Actions workflows (`ci`, `deploy`, `release`, `uptime`) | Run on the first pull request; the gitleaks and oasdiff tags (v8.28.0, v1.11.7) are not yet checked against their registries |

## Deviations from the plan

- Integration tests use the `postgres:16` image already on this machine and set `TESTCONTAINERS_RYUK_DISABLED=true` so no second image is pulled; each container is still stopped in teardown (`shortcut:` in `test/postgres.ts`).
- Docker base images are pinned to major/minor tags (`node:26`, `caddy:2.10`, `postgres:16`), not digests.
- The web page's owner field is free text (`group:<id>`), because U1 has no route listing people or groups; U18 replaces these pages.
- The Step 19 item for this summary, the source manifest and traceability is completed by this file and its two siblings.
