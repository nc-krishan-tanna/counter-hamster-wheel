# Reliability Requirements — U1 walking skeleton

NFR10 in `inception/requirements-analysis/requirements.md`: no approved change is lost if a service stops mid-write. U1 sets no availability target; the deployed copy's uptime target comes with the operation stages.

## Requirements

| ID | Requirement | Pass/fail check |
|---|---|---|
| NFR10.1 | An approval runs in one database transaction: decision, item, version, link change, proposal status and out-of-date marking all apply or none do (`rules.md` BR3.1, BR2.7; `functional-spec.md` W4) | Test: a failure injected after the version insert leaves the proposal open and no new version |
| NFR10.2 | Two decisions on one proposal at once: the first wins, the second gets `409 already-decided` (BR2.6). Two approvals on one item at once: the second gets `409 proposal-out-of-date` (BR2.7) | Concurrent tests for both cases |
| NFR10.3 | A repeated proposal with the same idempotency key within 24 hours returns the first proposal; the same key with a different request gets `409 conflict` (BR1.7, `inception/contract-design/contract-summary.md` C1) | Tests on `/v1/proposals` and MCP `propose_change` |
| NFR10.4 | A job is enqueued in the same transaction as the change that caused it (C3) | Test: a rolled-back change leaves no job |
| NFR10.5 | Failed jobs retry up to 3 times with backoff, then move to the dead-letter queue with their error code (C3 policy) | Test: a handler that always fails ends in the dead-letter queue after 3 attempts |
| NFR10.6 | `/readyz` checks only the database (and, for `worker`, the job queue); `/healthz` checks only that the process runs (C8) | Test: database down gives `503` on `/readyz` and `200` on `/healthz` |
| NFR10.7 | PostgreSQL data lives on a named Compose volume, so restarting containers keeps every approved change | Test: restart the stack; the item from W7 is still there |

## Not in U1

- Backups and restore, availability target, failover (U20 and the operation stages).

## Sources
- `functional-spec.md` (W4, errors and edge cases), `rules.md` (BR1.7, BR2.6, BR2.7, BR3.1).
- `inception/requirements-analysis/requirements.md` (NFR10).
- `inception/contract-design/contract-summary.md` (C1 idempotency, C3, C8).
