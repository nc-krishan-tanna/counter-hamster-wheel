# Scalability Requirements — U1 walking skeleton

The product is sized for a 100-person organisation on one host, ready for a second `api` copy (NFR4 in `inception/requirements-analysis/requirements.md`). U1 builds that shape in; the load check at 100-person scale is U20's.

## Requirements

| ID | Requirement | Pass/fail check |
|---|---|---|
| NFR4.1 | `api` and `worker` keep no local state: sessions live in PostgreSQL (Better Auth), jobs in PostgreSQL (pg-boss), idempotency keys in PostgreSQL (`rules.md` BR1.7) | Test: two `api` copies behind Caddy; a session created on one works on the other |
| NFR4.2 | Jobs are taken with leases, so several `worker` copies never run the same job at once (`inception/contract-design/contract-summary.md` C3 `take`) | Test: two workers, one job; it runs once |
| NFR4.3 | The whole skeleton runs on one host with Docker Compose | The W7 end-to-end check (`functional-spec.md`) passes on one machine |

## Not in U1

- Load figures, connection-pool sizing and the 100-person load check (U20). Library defaults are used until then.

## Sources
- `functional-spec.md` (W7), `rules.md` (BR1.7).
- `inception/requirements-analysis/requirements.md` (NFR4).
- `inception/contract-design/contract-summary.md` (C3).
