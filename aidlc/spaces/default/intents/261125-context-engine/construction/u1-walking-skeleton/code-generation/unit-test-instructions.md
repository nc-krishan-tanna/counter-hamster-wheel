# Unit Test Instructions — U1 walking skeleton

## Framework and configuration

- Vitest with V8 coverage, configured in `vitest.config.ts` at the repository root, one project per workspace: `db`, `api`, `worker` (node environment) and `web` (jsdom, Testing Library).
- Integration tests use a real PostgreSQL 16 started by `@testcontainers/postgresql` (`test/postgres.ts`); Docker must be running. No database is mocked: the grants, row-level security, locks and pg-boss behaviour are what the tests prove.
- Prerequisites: Node.js LTS (`.nvmrc`), `npm ci` at the repository root, Docker running.

## Running this unit's tests

Every U1 test file is named `*.u1.test.ts` or `*.u1.test.tsx`. Run from the repository root:

```bash
npx vitest run --coverage.enabled=false u1.test
```

This runs U1's tests only, with no coverage threshold, so its exit code is the test result. It is runnable from Step 2 of the plan (the runner smoke test) before the first Red step.

The end-to-end check (W7) needs the containers running and is a separate command, run by CI and Build and Test:

```bash
docker compose up -d --wait && E2E_BASE_HOSTS=acme.localhost,globex.localhost npx vitest run --coverage.enabled=false e2e/w7.u1.test.ts
```

## Expected coverage targets

- The project floor is 80% line coverage (team Testing Contract, NFR11.2), set as `coverage.thresholds.lines: 80` in `vitest.config.ts`. Build and Test measures it on the full suite of the assembled project; this unit's command above does not judge it. The threshold is never lowered to make a run pass.
- Test volume (Standard strategy): five to eight tests per component, plus one isolation test per route and MCP tool (NFR14.3). About 95 tests in all.

## Mocking and stubbing

- Database: never mocked; each test file gets the shared container and runs as the role it tests (`ce_api`, `ce_worker`, `ce_migrate`).
- Web page tests stub `fetch` at the `/v1` boundary only, returning the C1 problem-details shapes.
- Time: `vi.useFakeTimers()` where a test checks timestamps or the 24-hour idempotency window.
- No test passes whatever the code does (team rule): every test asserts an observable result.

## Test data

- Each integration test file seeds its own two organisations (`acme`, `globex`) with test-only passwords and tokens generated in the test, inside a transaction or a schema reset between files; nothing real is stored.
- The seed variables in `.env.example` have no values; CI generates test values per run.
