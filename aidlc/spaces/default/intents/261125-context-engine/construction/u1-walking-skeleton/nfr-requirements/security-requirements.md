# Security Requirements — U1 walking skeleton

U1 has seeded sign-in only; real sign-in, roles and the permission matrix come in U2 (`functional-spec.md`, "What U1 leaves to later units"). The rules below still hold from the first commit, because U1's code is extended rather than replaced. Rule IDs refer to `rules.md`; contract IDs to `inception/contract-design/contract-summary.md`.

## Requirements

| ID | Requirement | Pass/fail check |
|---|---|---|
| NFR5.1 | Browsers and agents reach `web`, `api` and `/mcp` only over HTTPS through Caddy; plain HTTP redirects to HTTPS. Container-to-container traffic stays on the private Compose network, which publishes no port except Caddy's | Test: an HTTP request gets a redirect; `api` and `postgres` ports are not published |
| NFR5.2 | Secrets (database passwords, Better Auth secret, seed account passwords, the seeded agent tokens) come from environment variables; none is in the repository, an image or a log | A CI secret scanner (the tool is picked in code generation, for example gitleaks) finds nothing; startup refuses to run when a required secret is missing |
| NFR5.3 | Every request is authenticated on the server: a Better Auth session cookie for people, a service-account bearer token for MCP (C1, C2). Unknown, expired or deactivated credentials get `401 unauthenticated` | Tests for each case on `/v1` and `/mcp` |
| NFR5.4 | Every write checks authorisation on the server: only a Contributor proposes (BR5.1); only a human owner decides (BR2.1); a service account never decides (BR2.2). Refusals return `403 forbidden` and change nothing | Tests: an agent's decision, a non-owner's decision and a Reader's proposal are refused |
| NFR5.5 | Session cookies are `Secure`, `HttpOnly` and `SameSite=Lax`; `web` and `api` share one origin per organisation through Caddy, and no CORS headers are ever returned. The server refuses any cookie-authenticated `POST`, `PUT`, `PATCH` or `DELETE` whose `Origin` header is missing or is not the organisation's own address (`403 forbidden`); bearer-token calls are not affected. The rest of the CSRF work comes in U2 | Tests: response cookie flags; no `Access-Control-*` header on any response; a cookie-authenticated write with a foreign or missing `Origin` gets 403 and changes nothing |
| NFR5.6 | Service-account tokens are stored hashed (Better Auth API-key plugin); the plain token is shown only once at creation. The seed stores each environment-supplied agent token using the plugin's own hashing, never in plain text, and each token belongs to exactly one organisation | Database check: no plain token column; the seeded token authenticates at its own organisation's address only |
| NFR5.9 | `/healthz`, `/readyz` and `/metrics` of `api` and `worker` are reachable only on the private container network; Caddy does not route them | Test: each returns 404 through Caddy |
| NFR5.7 | All input is validated at the boundary against the OpenAPI and MCP schemas before any business logic; invalid input returns `422 validation-failed` naming the field (BR1.2 to BR1.6) | Tests for missing fields, wrong types, oversize text, non-http(s) source URLs |
| NFR5.8 | Every SQL statement uses parameters (Kysely); no string-built SQL | Lint rule bans `sql.raw` with untrusted input; review |
| NFR6.1 | Logs, metrics labels, error `detail` fields and job payloads never contain item content, reasons, comments or source text (NFR6, C1 errors, C3 jobs) | Test: a request with a marker string in content; the marker appears in no log line or error body |
| NFR9.1 | No route or MCP tool edits or deletes an item version, decision, proposal or link record (BR3.2) | OpenAPI and MCP tool lists contain no such operation |
| NFR9.2 | Three database roles. A migration role owns every table and runs only migrations and the seed. The `api` role has: `SELECT, INSERT` on `item_versions` and `decisions`; `SELECT, INSERT, UPDATE (current_version_id, last_reviewed_at)` on `items`; `SELECT, INSERT, UPDATE (status)` on `proposals`; `SELECT, INSERT, UPDATE (removed_in_version_id)` on `links`; `SELECT` on `organisations`, `groups`, `group_members` and `service_accounts`; full DML on the sign-in library's tables and on the job-queue schema; no `DELETE` on any history table. The `worker` role has DML on the job-queue schema only and no access to knowledge tables | Tests as the `api` role expect "permission denied" for: `UPDATE`/`DELETE` on `item_versions` and `decisions`, `DELETE` on `proposals` and `links`, `UPDATE proposals SET reason`, `UPDATE items SET type`; as the `worker` role, any `SELECT` on `items` |

## Organisations (added 2026-11-26; requirements NFR14; functional design BR6.1 to BR6.3)

| ID | Requirement | Pass/fail check |
|---|---|---|
| NFR14.1 | Every U1 knowledge table (`items`, `item_versions`, `links`, `proposals`, `decisions`, `groups`, `group_members`, `service_accounts`) has PostgreSQL row-level security keyed on the organisation. Neither the `api` nor the `worker` role owns a table or has `BYPASSRLS`, so neither can read or write another organisation's rows even if a query forgets the filter. Two kinds of table are deliberately outside row-level security, each with its reason: the sign-in library's tables (sessions and keys are looked up before the organisation is known; each row carries the organisation and NFR14.2 refuses a credential at the wrong address) and the job-queue schema (U1 has no production jobs; every job carries its organisation and its handler runs with that organisation set, per contract C3). `organisations` is readable to resolve an address | Test: as the `api` role with organisation A set, `SELECT` from each knowledge table returns no row of organisation B, and an `INSERT` with B's id is refused |
| NFR14.2 | The organisation is set once per request (and per transaction) from the address and the credential, before any knowledge query; a request where they disagree, or that has no organisation, runs no knowledge query and answers "not found". U1 serves its two seeded organisations at their own local addresses through Caddy (for example `acme.localhost` and `globex.localhost`); the worker sets a job's organisation from the job before running it | Test: A's agent token at B's address, and a request at an unknown address, both answer "not found" and touch no knowledge table |
| NFR14.3 | Every U1 route, page and MCP tool has an isolation test that acts as organisation B on organisation A's data and expects nothing back and nothing changed; CI fails when a route or tool is added without one | CI lists every route and tool and checks each has an isolation test |

## Threats considered

| Threat | Covered by |
|---|---|
| Someone approves without being an owner, or an agent approves | NFR5.4 (BR2.1, BR2.2) |
| History is rewritten to hide a change | NFR9.1, NFR9.2 |
| A leaked repository exposes credentials | NFR5.2 |
| Stolen agent token | NFR5.3 (deactivation refuses it), NFR5.6 (hashed at rest) |
| Organisation content leaks through logs or errors | NFR6.1 |
| Injection through item fields | NFR5.7, NFR5.8 |
| One organisation reads or changes another's knowledge | NFR14.1 to NFR14.3 |

## Not in U1

- Rate limits on the public API (C1 open question, U20).
- Google and Microsoft sign-in, email sign-up, role management (U2).
- Raw source content visibility (NFR6 Admin-only rule): U1 has no connected sources (U8).

## Sources
- `functional-spec.md` (seeded actors, W3, W4, W6), `rules.md` (BR1.2 to BR1.6, BR2.1, BR2.2, BR3.2, BR5.1).
- `inception/requirements-analysis/requirements.md` (NFR5, NFR6, NFR9, NFR14; project rules).
- `../functional-design/rules.md` BR6.1 to BR6.3 (organisations).
- `inception/contract-design/contract-summary.md` (C1 authentication and errors, C2 auth, C3 payloads).
- `nfr-requirements-questions.md` Q6, Q7.
