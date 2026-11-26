# Security Requirements — U1 walking skeleton

U1 has seeded sign-in only; real sign-in, roles and the permission matrix come in U2 (`functional-spec.md`, "What U1 leaves to later units"). The rules below still hold from the first commit, because U1's code is extended rather than replaced. Rule IDs refer to `rules.md`; contract IDs to `inception/contract-design/contract-summary.md`.

## Requirements

| ID | Requirement | Pass/fail check |
|---|---|---|
| NFR5.1 | Browsers and agents reach `web`, `api` and `/mcp` only over HTTPS through Caddy; plain HTTP redirects to HTTPS. Container-to-container traffic stays on the private Compose network, which publishes no port except Caddy's | Test: an HTTP request gets a redirect; `api` and `postgres` ports are not published |
| NFR5.2 | Secrets (database password, Better Auth secret, seed account passwords, the seeded agent token) come from environment variables; none is in the repository, an image or a log | CI secret scan finds nothing; startup refuses to run when a required secret is missing |
| NFR5.3 | Every request is authenticated on the server: a Better Auth session cookie for people, a service-account bearer token for MCP (C1, C2). Unknown, expired or deactivated credentials get `401 unauthenticated` | Tests for each case on `/v1` and `/mcp` |
| NFR5.4 | Every write checks authorisation on the server: only a Contributor proposes (BR5.1); only a human owner decides (BR2.1); a service account never decides (BR2.2). Refusals return `403 forbidden` and change nothing | Tests: an agent's decision, a non-owner's decision and a Reader's proposal are refused |
| NFR5.5 | Session cookies are `Secure`, `HttpOnly` and `SameSite=Lax`; `web` and `api` share one origin through Caddy, so no cross-origin requests are allowed (CORS off). Full CSRF and origin rules come in U2 | Test: response cookie flags; a cross-origin request is refused |
| NFR5.6 | Service-account tokens are stored hashed (Better Auth API-key plugin); the plain token is shown only once at creation | Database check: no plain token column |
| NFR5.7 | All input is validated at the boundary against the OpenAPI and MCP schemas before any business logic; invalid input returns `422 validation-failed` naming the field (BR1.2 to BR1.6) | Tests for missing fields, wrong types, oversize text, non-http(s) source URLs |
| NFR5.8 | Every SQL statement uses parameters (Kysely); no string-built SQL | Lint rule bans `sql.raw` with untrusted input; review |
| NFR6.1 | Logs, metrics labels, error `detail` fields and job payloads never contain item content, reasons, comments or source text (NFR6, C1 errors, C3 jobs) | Test: a request with a marker string in content; the marker appears in no log line or error body |
| NFR9.1 | No route or MCP tool edits or deletes an item version, decision, proposal or link record (BR3.2) | OpenAPI and MCP tool lists contain no such operation |
| NFR9.2 | The database role `api` uses has no `UPDATE` or `DELETE` on `item_versions` and `decisions`, and may update only `proposals.status` and `links.removed_in_version_id` | Test: a direct `UPDATE item_versions` as the `api` role fails |

## Threats considered

| Threat | Covered by |
|---|---|
| Someone approves without being an owner, or an agent approves | NFR5.4 (BR2.1, BR2.2) |
| History is rewritten to hide a change | NFR9.1, NFR9.2 |
| A leaked repository exposes credentials | NFR5.2 |
| Stolen agent token | NFR5.3 (deactivation refuses it), NFR5.6 (hashed at rest) |
| Organisation content leaks through logs or errors | NFR6.1 |
| Injection through item fields | NFR5.7, NFR5.8 |

## Not in U1

- Rate limits on the public API (C1 open question, U20).
- Google and Microsoft sign-in, email sign-up, role management (U2).
- Raw source content visibility (NFR6 Admin-only rule): U1 has no connected sources (U8).

## Sources
- `functional-spec.md` (seeded actors, W3, W4, W6), `rules.md` (BR1.2 to BR1.6, BR2.1, BR2.2, BR3.2, BR5.1).
- `inception/requirements-analysis/requirements.md` (NFR5, NFR6, NFR9; project rules).
- `inception/contract-design/contract-summary.md` (C1 authentication and errors, C2 auth, C3 payloads).
- `nfr-requirements-questions.md` Q6, Q7.
