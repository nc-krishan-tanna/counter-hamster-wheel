# Observability Requirements — U1 walking skeleton

NFR13 in `inception/requirements-analysis/requirements.md`: each service has a health check, and error rate, sync status and proposal latency are measurable. The team chose structured logs and Prometheus metrics now, tracing later (`nfr-requirements-questions.md` Q9). Endpoints follow `inception/contract-design/contract-summary.md` C8.

## Requirements

| ID | Requirement | Pass/fail check |
|---|---|---|
| NFR13.1 | `api` and `worker` expose `/healthz`, `/readyz` and `/metrics`; `web` (Caddy) exposes `/healthz` and its own metrics | Compose health checks pass after `docker compose up` |
| NFR13.2 | Logs are JSON, one line per request, with time, level, request id, route, status and duration; the request id is returned in a response header. Content never appears (security NFR6.1) | Test: one request produces one parseable line with these fields |
| NFR13.3 | `/metrics` publishes request count and errors by route and status, the latency histogram (performance NFR2.1), job-queue depth and oldest waiting job age per type, job attempts, and dead-letter count per type | Test: each metric name is present after the W7 check (`functional-spec.md`) |
| NFR13.4 | Proposal decision time is measurable: a histogram of time from proposal created to decided, by outcome (`rules.md` BR2.3, BR2.5) | Test: after W7 the histogram has a sample |

## SLIs (measured, no targets in U1)

| SLI | From |
|---|---|
| Error rate: 5xx responses / all responses | NFR13.3 |
| Request latency, p95 | NFR13.3 |
| Dead letters above zero | NFR13.3 (the alert itself comes with the operation stages) |

## Not in U1

- Tracing (OpenTelemetry), dashboards and alert rules (operation stages and U20).
- Sync status per connection (U8; U1 has no connections).

## Sources
- `functional-spec.md` (W7), `rules.md` (BR2.3, BR2.5).
- `inception/requirements-analysis/requirements.md` (NFR6, NFR13).
- `inception/contract-design/contract-summary.md` (C3 alert policy, C8).
- `nfr-requirements-questions.md` Q9.
