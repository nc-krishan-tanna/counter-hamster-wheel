# Security Design — U1 walking skeleton

How U1 meets the security requirements in `../nfr-requirements/security-requirements.md` with the stack in `../nfr-requirements/tech-stack-decisions.md` (Fastify, Kysely, Better Auth, Caddy). Rule IDs refer to `../functional-design/rules.md`; contracts to `inception/contract-design/contract-summary.md`. Answers: `nfr-design-questions.md` Q1.

## Layers

```
browser / agent --HTTPS--> Caddy (web) --private network--> api --> PostgreSQL
                            |  TLS, headers, routes only /v1, /mcp, /api/auth, static files
                            api: authenticate -> Origin check -> schema validation -> authorise -> transaction
```

## Transport and edge (NFR5.1)

- Caddy terminates TLS: its local CA on a developer machine (`tls internal`; run `caddy trust` once to stop browser warnings), an ACME certificate on a deployed copy. Port 80 redirects to 443.
- Compose publishes only Caddy's 80 and 443. `api`, `worker` and `postgres` publish no port.
- Caddy routes `/v1/*`, `/mcp`, `/api/auth/*` to `api`, and everything else to the built web files. It does not route `/healthz`, `/readyz` or `/metrics` of `api` or `worker`, so those stay on the private network (review R-04). Test: each returns 404 through Caddy.
- Caddy adds `Strict-Transport-Security` (deployed copies only), `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, and `Content-Security-Policy: default-src 'self'; frame-ancestors 'none'`.

## Authentication (NFR5.3, NFR5.6)

| Caller | Credential | Check |
|---|---|---|
| Person on the web page | Better Auth session cookie | Better Auth `getSession`; deactivated user refused |
| AI agent on `/mcp` | `Authorization: Bearer <token>` | Better Auth API-key plugin verifies the hash; key disabled when the service account is deactivated |

- One Fastify `onRequest` hook resolves the principal for every route except `/healthz`, `/readyz`, `/metrics` and `/api/auth/*`. No principal: `401 unauthenticated` (C1 problem details).

**Where roles and status live (review finding on principals).**

| Principal | Stored in | Role and status |
|---|---|---|
| Person | Better Auth `user` table | Extra columns `role` and `status` declared as Better Auth `additionalFields` with `input: false`, so no sign-up or profile call can set them; only the seed (and U2's admin routes) write them |
| AI agent | Our `service_accounts` table: `service_account_id`, `name`, `role` (Reader or Contributor), `status`, `api_key_id` (the Better Auth `apikey` row) | Written only by the seed in U1 (U2 adds admin routes) |

Resolution: a session gives a `user` row; refused unless `status = active`. A bearer token is verified by the API-key plugin, which returns its `apikey` row; the hook then loads the `service_accounts` row by `api_key_id` and refuses unless it exists and `status = active`. The principal carried to handlers is `{ kind: user | service-account, id, role }`. Deactivating a service account sets `status = deactivated` and disables its key, and the next call gets `401`.
- Cookie: `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/` (Better Auth `advanced.defaultCookieAttributes`).
- **Seeding (review R-05).** A one-shot seed step reads `SEED_CONTRIBUTOR_PASSWORD`, `SEED_OWNER_PASSWORD` and `SEED_AGENT_TOKEN` from the environment. People are created through Better Auth's own sign-up API, so passwords are hashed by the library. The agent key is stored using the API-key plugin's own hashing function, never as plain text. Test: the environment token authenticates on `/mcp`, and no table holds it in plain text. The seed is skipped when an account exists.

## Cross-site writes (NFR5.5, Q1)

- `web` and `api` share one origin through Caddy, so CORS stays off: no `Access-Control-*` headers are ever sent.
- A Fastify `onRequest` hook refuses any `POST`, `PUT`, `PATCH` or `DELETE` authenticated by the session cookie whose `Origin` header is missing or differs from `PUBLIC_ORIGIN` (`403 forbidden`). Bearer-token requests skip it. Better Auth's own routes use its `trustedOrigins` set to the same value.
- U2 adds the remaining CSRF work with real sign-in.

## Authorisation (NFR5.4)

Checked in the proposal service, inside the transaction, before any write:

| Action | Rule | Refusal |
|---|---|---|
| Propose (web or MCP) | Caller role is Contributor or higher (BR5.1) | `403 forbidden` |
| Decide | Caller is a User, not a service account (BR2.2), and a human owner of the item: listed directly or a member of a listed group (BR2.1) | `403 not-an-approver` |

## Input validation and SQL (NFR5.7, NFR5.8)

- Every `/v1` route carries the JSON schema from `api/openapi/v1.yaml`; Fastify rejects invalid bodies before the handler runs. The error handler turns them into `422 validation-failed` with one `errors[]` entry per field (BR1.2 to BR1.6). MCP tool inputs use the SDK's schema validation the same way.
- Business checks that need the database (unknown owner, unapproved link target) also return `422` with the field named.
- All queries go through Kysely with bound parameters. An ESLint rule forbids `sql.raw` and `sql.lit` outside migrations.

## Secrets (NFR5.2)

- Environment variables only: `DATABASE_URL_API`, `DATABASE_URL_WORKER`, `DATABASE_URL_MIGRATE`, `BETTER_AUTH_SECRET`, `PUBLIC_ORIGIN`, and the three seed values. `.env.example` lists names with no values; `.env` is git-ignored.
- On startup, each container checks that its variables are present and exits with the missing names (not their values) if any are absent.
- CI runs a secret scanner on every pull request; the tool (for example gitleaks) is picked when the code is generated.

## Content never leaves in logs or errors (NFR6.1)

- The Fastify logger logs only method, route template, status, duration and request id; `redact` removes `authorization` and `cookie` headers. Bodies are never logged.
- Problem `detail` text is fixed per error code, never built from request content.
- Job payloads hold ids only (C3).

## History cannot change (NFR9.1, NFR9.2)

No route or MCP tool updates or deletes versions, decisions, proposals or links. The database enforces it too, with three roles (review R-01):

| Role | Used by | Rights |
|---|---|---|
| `ce_migrate` | the one-shot `migrate` step only | Owns every table and the `pgboss` schema; runs Kysely and pg-boss migrations and the seed |
| `ce_api` | `api` | See below |
| `ce_worker` | `worker` | `pgboss` schema: SELECT, INSERT, UPDATE, DELETE. No knowledge tables (C1: the worker reaches knowledge only through `/v1`) |

`ce_api` rights per table:

| Table | Rights |
|---|---|
| `item_versions`, `decisions` | SELECT, INSERT |
| `items` | SELECT, INSERT, UPDATE (`current_version_id`, `last_reviewed_at`) |
| `proposals` | SELECT, INSERT, UPDATE (`status`) |
| `links` | SELECT, INSERT, UPDATE (`removed_in_version_id`) |
| `groups`, `group_members`, `service_accounts` | SELECT |
| Better Auth tables (`user`, `session`, `account`, `verification`, `apikey`) | SELECT, INSERT, UPDATE, DELETE (the library manages sessions and keys; `user.role` and `user.status` are protected by `input: false`, not by grants, until U2) |
| `pgboss` schema | SELECT, INSERT, UPDATE, DELETE (to enqueue inside the caller's transaction) |

Tests run as `ce_api` and expect `permission denied` for: `UPDATE item_versions`, `DELETE FROM item_versions`, `UPDATE decisions`, `DELETE FROM decisions`, `DELETE FROM proposals`, `DELETE FROM links`, `UPDATE proposals SET reason = ...`, `UPDATE items SET type = ...`.

## Sources
- `../nfr-requirements/security-requirements.md` (NFR5.1 to NFR5.8, NFR6.1, NFR9.1, NFR9.2), `../nfr-requirements/tech-stack-decisions.md`, `../nfr-requirements/observability-requirements.md` (log fields).
- `../functional-design/functional-spec.md` (seeded actors, W3, W4, W6), `../functional-design/rules.md`.
- `inception/contract-design/contract-summary.md` (C1 auth, errors and worker access; C2; C3; C8).
- `nfr-design-questions.md` Q1; requirements review findings R-01, R-02, R-04, R-05.
