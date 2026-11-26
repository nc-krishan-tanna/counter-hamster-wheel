# Reliability Design — U1 walking skeleton

How U1 meets `../nfr-requirements/reliability-requirements.md`. The approval flow is W4 in `../functional-design/functional-spec.md`; contracts are in `inception/contract-design/contract-summary.md`.

## Approval in one transaction (NFR10.1, NFR10.2)

One Kysely transaction at READ COMMITTED. Every decision on an existing item locks in the same order, item first, so decisions on one item queue behind each other and never deadlock:

```
BEGIN
  read proposal (no lock) to learn item_id and kind
  IF kind <> create: SELECT item FOR UPDATE      -- all decisions on this item queue here
  SELECT proposal FOR UPDATE
  IF status <> 'open'           -> 409 already-decided   (BR2.6)
  IF If-Match <> proposal ETag  -> 412
  IF kind <> create AND base_version_id <> item.current_version_id
      -> set status 'out-of-date', COMMIT, 409 proposal-out-of-date (BR2.7)
  INSERT decision; INSERT item (create); INSERT item_version
  INSERT/UPDATE link (link change); UPDATE item pointer and last_reviewed_at
  UPDATE proposal status; UPDATE other open proposals on the item -> 'out-of-date'
COMMIT                                   -- any error before this rolls back everything
```

- Sibling proposals are updated only while the item lock is held, so no other transaction holds a sibling's lock while waiting for the item.
- A create proposal has a reserved item id that no other proposal uses, so it locks only its own proposal row; `INSERT item` fails on the primary key if it somehow ran twice.

- The proposal ETag is `"<proposalId>:<status>"`; it changes when the proposal is decided or goes out of date (C1 `If-Match`).
- Reject runs the same locking, then inserts the decision and sets `rejected`.
- Tests: a fault injected after the version insert leaves no version and an open proposal; two parallel approvals of one proposal give one `201` and one `409 already-decided`; two proposals on one item approved in parallel give one `201` and one `409 proposal-out-of-date`.

## Idempotent proposals (NFR10.3)

- `proposals` has a unique index on `(proposer_id, idempotency_key)` and stores a hash of the normalised request body.
- On insert conflict: same hash returns the existing proposal (`201` with the original body); a different hash returns `409 conflict`.
- Within 24 hours this is exactly C1's promise. After 24 hours C1 promises nothing, and the key simply stays taken: the same request still returns the original, a different one gets `409 conflict`. `shortcut: keys never expire, so no clean-up job exists; add expiry if a client ever needs to reuse keys (clients send UUIDs, so none does today).`

## Jobs (NFR10.4, NFR10.5; Q2)

- The `JobQueue` interface (C3) wraps pg-boss. `enqueue` accepts the caller's Kysely transaction and inserts through the same connection, so a rolled-back change leaves no job.
- Each job type is created with `retryLimit: 2` (3 attempts in all), `retryBackoff: true`, and a dead-letter queue named `<type>.dead`.
- U1 ships no production job type. A test-only type proves: enqueue inside a rolled-back transaction leaves no job; a handler failing every time ends in `<type>.dead` after 3 attempts; `defer` re-schedules without counting an attempt.
- The worker runs, takes jobs for its registered types (none in U1), and reports health.

## Health and restart (NFR10.6, NFR10.7)

| Endpoint | `api` | `worker` |
|---|---|---|
| `/healthz` | process up: always `200` | same |
| `/readyz` | `SELECT 1` within 2 s, else `503` | `SELECT 1` and pg-boss started, else `503` |

`web` (Caddy) answers `/healthz` itself with `respond /healthz 200`; it reveals nothing and the deploy check needs it. Caddy never forwards `/healthz`, `/readyz` or `/metrics` to `api` or `worker`.

- Compose health checks use `/readyz`; `restart: unless-stopped` on every service; `api` and `worker` wait for `postgres` healthy and `migrate` completed.
- On `SIGTERM`, Fastify stops accepting requests and finishes those in flight (10 s cap); the worker calls pg-boss `stop({ graceful: true })`. An interrupted transaction rolls back, so no half-applied approval exists.
- PostgreSQL data is on the named volume `pgdata`. Test: restart the stack and read the W7 item.

## Not in U1

- Backups, restore, replicas, circuit breakers (U1 calls no external service; the AI model arrives with U4).

## Sources
- `../nfr-requirements/reliability-requirements.md` (NFR10.1 to NFR10.7), `../nfr-requirements/tech-stack-decisions.md` (Kysely, pg-boss).
- `../functional-design/functional-spec.md` (W4, errors and edge cases).
- `inception/contract-design/contract-summary.md` (C1 idempotency and one-decision rule, C3, C8).
- `nfr-design-questions.md` Q2.
