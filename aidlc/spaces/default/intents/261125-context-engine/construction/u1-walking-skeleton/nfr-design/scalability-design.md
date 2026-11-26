# Scalability Design — U1 walking skeleton

How U1 meets `../nfr-requirements/scalability-requirements.md`. Stack: `../nfr-requirements/tech-stack-decisions.md`.

## No local state (NFR4.1)

| State | Where |
|---|---|
| Sessions and API keys | PostgreSQL (Better Auth) |
| Jobs | PostgreSQL `pgboss` schema |
| Idempotency keys | `proposals` table |
| Web files | Baked into the Caddy image |

Nothing is kept in process memory between requests. Test: a Compose override adds `api2`; Caddy's `reverse_proxy api:3000 api2:3000` sends requests round-robin; a session created through one copy is accepted by the other, and the W7 check passes.

## Several workers (NFR4.2)

pg-boss fetches jobs with `FOR UPDATE SKIP LOCKED`, so two workers never take the same job. Test: two worker processes and one test job; the handler runs once.

## One host (NFR4.3)

Docker Compose on one machine: `web` (Caddy), `api`, `worker`, `postgres`, and the one-shot `migrate`. See `logical-components.md`.

## Not in U1

Capacity figures, pool sizing and the 100-person load check (U20).

## Sources
- `../nfr-requirements/scalability-requirements.md` (NFR4.1 to NFR4.3), `../nfr-requirements/tech-stack-decisions.md`.
- `../functional-design/functional-spec.md` (W7).
- `inception/contract-design/contract-summary.md` (C3 leases).
