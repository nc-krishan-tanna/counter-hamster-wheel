# Security Design — U1 walking skeleton

How U1 meets the security requirements in `../nfr-requirements/security-requirements.md` with the stack in `../nfr-requirements/tech-stack-decisions.md` (Fastify, Kysely, Better Auth, Caddy). Rule IDs refer to `../functional-design/rules.md`; contracts to `inception/contract-design/contract-summary.md`. Answers: `nfr-design-questions.md` Q1, and the organisations points in its confirmed summary.

## Layers

```
browser / agent --HTTPS--> Caddy (web) --private network--> api --> PostgreSQL
                            |  TLS, headers, routes only /v1, /mcp, /api/auth, static files
                            api: organisation from address -> authenticate -> credential matches organisation
                                 -> Origin check -> schema validation -> authorise
                                 -> transaction with the organisation set -> row-level security
```

Every request passes these steps in this order. A step that fails stops the request; nothing later runs.

`/healthz`, `/readyz` and `/metrics` are registered outside this chain: they skip the organisation, authentication and Origin hooks, because Compose health checks and metric scrapes reach `api` and `worker` on the private network with a host such as `api:3000`. Caddy never routes them (next section), so they are not reachable from outside. Test: `/readyz` answers `200` with `Host: api:3000`.

## Transport and edge (NFR5.1, NFR5.9)

- Caddy terminates TLS: its local CA on a developer machine (`tls internal`; run `caddy trust` once to stop browser warnings), an ACME certificate on a deployed copy. Port 80 redirects to 443.
- Compose publishes only Caddy's 80 and 443. `api`, `worker` and `postgres` publish no port.
- One Caddy site block serves every organisation's address (in U1 `acme.localhost` and `globex.localhost`) and passes the `Host` header through unchanged, so the `api` sees which organisation was asked for.
- Caddy routes `/v1/*`, `/mcp`, `/api/auth/*` to `api`, and everything else to the built web files. It does not route `/healthz`, `/readyz` or `/metrics` of `api` or `worker`, so those stay on the private network (NFR requirements review R-04). Test: each returns 404 through Caddy, at both addresses.
- Caddy adds `Strict-Transport-Security` (deployed copies only), `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, and `Content-Security-Policy: default-src 'self'; frame-ancestors 'none'`.

## Organisation from the address (NFR14.2)

The first `onRequest` hook, before authentication (every route except the three health and metrics endpoints):

1. Takes the host name from the `Host` header, drops the port, and strips the configured base domain (`PUBLIC_BASE_DOMAIN`, `localhost` in U1) to get the organisation's address (`acme`).
2. Reads `organisations` by address as `ce_api` (the table is outside row-level security, so the address can be resolved before anything else is known; `ce_worker` has no access to it).
3. No match, or a host that is not `<address>.<base domain>`: `404 not-found`, and no knowledge query runs.

This is the first, seeded version of the C7 `Access.organisation` operation; U2 adds suspension (`403 organisation-suspended`) and sign-up. Both U1 organisations are active.

## Authentication (NFR5.3, NFR5.6, NFR14.2)

| Caller | Credential | Check |
|---|---|---|
| Person on the web page | Better Auth session cookie | Better Auth `getSession`; deactivated user refused |
| AI agent on `/mcp` | `Authorization: Bearer <token>` | Better Auth API-key plugin verifies the hash; key disabled when the service account is deactivated |

- The second `onRequest` hook resolves the principal for every route except `/healthz`, `/readyz`, `/metrics` and `/api/auth/*`. No principal: `401 unauthenticated` (C1 problem details).
- **The credential must belong to the organisation of the address.** Each `user` row and each `service_accounts` row carries `organisation_id`. When it differs from the organisation found from the address, the answer is `404 not-found`, not `401` or `403`, so the response reveals nothing about the other organisation (C1, C2). Test: organisation A's agent token at organisation B's address answers `not-found` and touches no knowledge table.

**Where roles, status and organisation live.**

| Principal | Stored in | Role, status and organisation |
|---|---|---|
| Person | Better Auth `user` table | Extra columns `role`, `status` and `organisation_id` declared as Better Auth `additionalFields` with `input: false`, so no sign-up or profile call can set them; only the seed (and U2's admin routes) write them |
| AI agent | Our `service_accounts` table: `service_account_id`, `organisation_id`, `name`, `role` (Reader or Contributor), `status`, `api_key_id` (the Better Auth `apikey` row) | Written only by the seed in U1 (U2 adds admin routes) |

Resolution:

- **Session.** A session gives a `user` row (the Better Auth tables are outside row-level security, so it is read directly). Refused with `401` unless `status = active`; `404 not-found` when its `organisation_id` is not the address's organisation.
- **Bearer token.** The API-key plugin verifies the token and returns its `apikey` row; an unknown or disabled key is `401`. `service_accounts` is under row-level security and no organisation is set yet, so the hook does not query it directly. It calls one narrow function, `auth_service_account(api_key_id)`, declared `SECURITY DEFINER`, owned by `ce_migrate`, with `EXECUTE` granted only to `ce_api`; it returns that single account's `service_account_id`, `organisation_id`, `role` and `status`, and nothing else. No row: `401`. `status` not `active`: `401`. `organisation_id` not the address's organisation: `404 not-found`. Test: A's agent token at B's address answers `404`; an invalid token at either address answers `401`.

The principal carried to handlers is `{ kind: user | service-account, id, role, organisationId }`. Deactivating a service account sets `status = deactivated` and disables its key, and the next call gets `401`.

- Cookie: `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and no `Domain` attribute, so the browser keeps it for that one organisation's address and never sends it to another organisation's address (Better Auth `advanced.defaultCookieAttributes`; no cross-subdomain cookie option is turned on).
- **Seeding (NFR requirements review R-05).** A one-shot seed step creates both organisations and, for each, its accounts from the environment: `SEED_ACME_CONTRIBUTOR_PASSWORD`, `SEED_ACME_OWNER_PASSWORD`, `SEED_ACME_AGENT_TOKEN`, `SEED_GLOBEX_OWNER_PASSWORD`, `SEED_GLOBEX_AGENT_TOKEN`. People are created through Better Auth's own sign-up API, so passwords are hashed by the library. Each agent key is stored using the API-key plugin's own hashing function, never as plain text. Test: each environment token authenticates on `/mcp` at its own organisation's address only, and no table holds it in plain text. The seed is skipped for an organisation that already exists.

## Cross-site writes (NFR5.5, Q1)

- `web` and `api` share one origin per organisation through Caddy, so CORS stays off: no `Access-Control-*` headers are ever sent.
- A Fastify `onRequest` hook (after authentication) refuses any `POST`, `PUT`, `PATCH` or `DELETE` authenticated by the session cookie whose `Origin` header is missing or is not exactly `https://<address>.<base domain>` for the organisation of this request, with `:<PUBLIC_PORT>` appended when Caddy is published on a port other than 443 (`403 forbidden`). U1 runs on 443. Bearer-token requests skip it. Better Auth's own routes use its `trustedOrigins`, built from the seeded organisations' addresses.
- U2 adds the remaining CSRF work with real sign-in.

## Authorisation (NFR5.4)

Checked in the proposal service, inside the transaction, before any write:

| Action | Rule | Refusal |
|---|---|---|
| Propose (web or MCP) | Caller role is Contributor or higher (BR5.1) | `403 forbidden` |
| Decide | Caller is a User, not a service account (BR2.2), and a human owner of the item: listed directly or a member of a listed group (BR2.1) | `403 not-an-approver` |

An item, owner, group or link end of another organisation is never visible inside the transaction (next section), so it is reported as unknown (`404 not-found` or `422` naming the field), never as forbidden (BR6.1 to BR6.3).

## Organisations kept apart in the database (NFR14.1, NFR14.2)

**Every knowledge query runs with the organisation set.** A request helper `withOrganisation(organisationId, fn)` opens a Kysely transaction, runs `SELECT set_config('app.organisation_id', $1, true)` (the parameterised form of `SET LOCAL`, scoped to the transaction), then runs `fn`. Route handlers and MCP tools get their database handle only from this helper; the module-boundary lint rule (C7) forbids importing the raw pool outside it.

**Row-level security on every knowledge table.** `items`, `item_versions`, `links`, `proposals`, `decisions`, `groups`, `group_members` and `service_accounts` each have `organisation_id` and:

```sql
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY organisation_only ON items
  USING (organisation_id = NULLIF(current_setting('app.organisation_id', true), '')::uuid)
  WITH CHECK (organisation_id = NULLIF(current_setting('app.organisation_id', true), '')::uuid);
```

- With no organisation set, `current_setting(..., true)` is null on a fresh connection and an empty string on a pooled connection that ran an earlier `withOrganisation`; `NULLIF` turns both into null, and the policy matches no row. A forgotten `withOrganisation` returns nothing rather than everything, and never raises a cast error. Test: the no-organisation query runs twice on one pooled connection, before and after a `withOrganisation` call, and both return nothing.
- `ce_api` and `ce_worker` own no table and have no `BYPASSRLS`, so the policy always applies to them. `ce_migrate` owns the tables and is used only by migrations and the seed.
- **Foreign keys cannot cross organisations.** Policies do not apply to foreign-key checks, so every reference between knowledge tables is composite: for example `links (organisation_id, from_item_id) REFERENCES items (organisation_id, item_id)`. A row can only point at a row of its own organisation.
- **People are checked too.** The Better Auth `user` table gets a unique `(organisation_id, id)`. References that always name a person are composite against it: `decisions (organisation_id, decider_user_id)` and `group_members (organisation_id, user_id)`. References that may name a person, a group or a service account (a proposal's proposer, an item version's owner entries) cannot carry one foreign key, so the proposal service checks each inside the transaction: a group or service account of another organisation is invisible under row-level security, and a person is accepted only when `user.organisation_id` is the current organisation. Either case is `422` naming the field as unknown. Isolation test: naming organisation B's person as an owner in A answers `422` and saves nothing.
- Tests as `ce_api` with organisation A set: `SELECT` from each knowledge table returns no row of organisation B; an `INSERT` carrying B's id fails the policy; with no organisation set, every `SELECT` returns nothing.

**Tables deliberately outside row-level security** (NFR14.1 states why for each):

| Table | Why | What keeps organisations apart instead |
|---|---|---|
| `organisations` | Read to resolve the address before anything else is known | Holds names and addresses only; no knowledge |
| Better Auth tables (`user`, `session`, `account`, `verification`, `apikey`) | Sessions and keys are looked up before the organisation is known | Each `user` and `service_accounts` row carries the organisation; the credential check above answers `not-found` at the wrong address |
| `pgboss` schema | U1 has no production jobs | Every job records its organisation (`reliability-design.md`, Jobs) |

**No privileged role in U1.** C3 names a `ce_system` role for cross-organisation lookups (the job queue's `take`, listing organisations for a scheduler). U1 needs none: pg-boss runs as `ce_worker` on its own schema, and there is no scheduler yet. The role arrives with U2's Tenancy interface.

## Every route and tool has an isolation test (NFR14.3)

- `api/test/isolation/` holds one test per `/v1` route, per page data call, and per MCP tool. Each signs in as organisation B, acts on organisation A's seeded item, proposal or link, and expects `404 not-found` (or an empty result for search and lists) and no row changed in A's data.
- A CI step lists every route from `api/openapi/v1.yaml` and every tool from the MCP server's tool registry, and fails when any of them has no test named `isolation: <method> <path>` or `isolation: tool <name>`. A new route or tool therefore cannot merge without its isolation test.

## Input validation and SQL (NFR5.7, NFR5.8)

- Every `/v1` route carries the JSON schema from `api/openapi/v1.yaml`; Fastify rejects invalid bodies before the handler runs. The error handler turns them into `422 validation-failed` with one `errors[]` entry per field (BR1.2 to BR1.6). MCP tool inputs use the SDK's schema validation the same way.
- No request schema has an `organisationId` field: the organisation comes only from the address and the credential (C1).
- Business checks that need the database (unknown owner, unapproved link target) also return `422` with the field named.
- All queries go through Kysely with bound parameters. An ESLint rule forbids `sql.raw` and `sql.lit` outside migrations.

## Secrets (NFR5.2)

- Environment variables only: `DATABASE_URL_API`, `DATABASE_URL_WORKER`, `DATABASE_URL_MIGRATE`, `BETTER_AUTH_SECRET`, `PUBLIC_BASE_DOMAIN`, and the five seed values above. `.env.example` lists names with no values; `.env` is git-ignored.
- On startup, each container checks that its variables are present and exits with the missing names (not their values) if any are absent.
- CI runs a secret scanner on every pull request; the tool (for example gitleaks) is picked when the code is generated.

## Content never leaves in logs or errors (NFR6.1)

- The Fastify logger logs only method, route template, status, duration, request id and the organisation's id; `redact` removes `authorization` and `cookie` headers. Bodies are never logged, and the organisation's name is never logged.
- Problem `detail` text is fixed per error code, never built from request content.
- Job payloads hold ids only (C3).

## History cannot change (NFR9.1, NFR9.2)

No route or MCP tool updates or deletes versions, decisions, proposals or links. The database enforces it too, with three roles (NFR requirements review R-01):

| Role | Used by | Rights |
|---|---|---|
| `ce_migrate` | the one-shot `migrate` step only | Owns every table and the `pgboss` schema; runs Kysely and pg-boss migrations, the row-level security policies, the grants and the seed |
| `ce_api` | `api` | See below; no `BYPASSRLS` |
| `ce_worker` | `worker` | `pgboss` schema: SELECT, INSERT, UPDATE, DELETE, no DDL. No knowledge tables and no `organisations` (C1: the worker reaches knowledge only through `/v1`); no `BYPASSRLS` |

pg-boss (version 10, pinned at code generation) creates its schema and every queue, including each `<type>.dead` queue, only in the `migrate` step as `ce_migrate`. `api` and `worker` start pg-boss with `migrate: false` and never create a queue at runtime, so neither needs DDL rights.

`ce_api` rights per table:

| Table | Rights |
|---|---|
| `item_versions`, `decisions` | SELECT, INSERT |
| `items` | SELECT, INSERT, UPDATE (`current_version_id`, `last_reviewed_at`) |
| `proposals` | SELECT, INSERT, UPDATE (`status`) |
| `links` | SELECT, INSERT, UPDATE (`removed_in_version_id`) |
| `organisations`, `groups`, `group_members`, `service_accounts` | SELECT |
| function `auth_service_account(api_key_id)` | EXECUTE |
| Better Auth tables (`user`, `session`, `account`, `verification`, `apikey`) | SELECT, INSERT, UPDATE, DELETE (the library manages sessions and keys; `user.role`, `user.status` and `user.organisation_id` are protected by `input: false`, not by grants, until U2) |
| `pgboss` schema | SELECT, INSERT, UPDATE, DELETE (to enqueue inside the caller's transaction) |

Tests run as `ce_api` and expect `permission denied` for: `UPDATE item_versions`, `DELETE FROM item_versions`, `UPDATE decisions`, `DELETE FROM decisions`, `DELETE FROM proposals`, `DELETE FROM links`, `UPDATE proposals SET reason = ...`, `UPDATE items SET type = ...`, `UPDATE items SET organisation_id = ...`. As `ce_worker`, any `SELECT` on `items` is refused.

## Known limits

- Better Auth keeps one `user` table with a unique email, so in U1 one email address can belong to one organisation only. The seeded accounts use distinct addresses. U2 decides how one person belongs to several organisations.
- Not every resolver maps `*.localhost` to the local machine for non-browser clients. The end-to-end check and the agent tests connect to Caddy on `127.0.0.1` and send the organisation's host name (for example `curl --resolve acme.localhost:443:127.0.0.1`).

## Sources
- `../nfr-requirements/security-requirements.md` (NFR5.1 to NFR5.9, NFR6.1, NFR9.1, NFR9.2, NFR14.1 to NFR14.3), `../nfr-requirements/tech-stack-decisions.md`, `../nfr-requirements/observability-requirements.md` (log fields).
- `../functional-design/functional-spec.md` (seeded actors and the two organisations, W3, W4, W6, W7), `../functional-design/rules.md` (BR1.2 to BR1.6, BR2.1, BR2.2, BR5.1, BR6.1 to BR6.3).
- `inception/contract-design/contract-summary.md` (organisations in every contract; C1 auth, errors and worker access; C2; C3; C7 `Access.organisation`; C8).
- `nfr-design-questions.md` Q1 and the confirmed summary; NFR requirements review findings R-01, R-02, R-04, R-05.
