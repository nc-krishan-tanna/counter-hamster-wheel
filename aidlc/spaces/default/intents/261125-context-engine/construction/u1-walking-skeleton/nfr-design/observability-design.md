# Observability Design — U1 walking skeleton

How U1 meets `../nfr-requirements/observability-requirements.md`: JSON logs and Prometheus metrics, no tracing yet. Endpoints follow C8 in `inception/contract-design/contract-summary.md`.

## Request id

Caddy sets `X-Request-Id` to its request UUID when the client sent none. Fastify's `genReqId` keeps the header only if it matches `^[A-Za-z0-9-]{1,64}$`, otherwise makes a UUID; it logs the id and returns it in the `X-Request-Id` response header and in every problem body's `instance`.

## Logs (NFR13.2)

Fastify's built-in pino logger, JSON to stdout, one line per completed request:

```json
{"time":"...","level":"info","reqId":"...","org":"<organisation id>","method":"POST","route":"/v1/proposals","status":201,"ms":42}
```

- `org` is the organisation's id, set once the address is resolved (absent on a `404` for an unknown address). The organisation's name and address are never logged (NFR6).
- `redact`: `req.headers.authorization`, `req.headers.cookie`. No bodies, query strings or item fields (security NFR6.1).
- Errors log the error code and stack, not the request body.

## Metrics (NFR13.1, NFR13.3, NFR13.4)

`prom-client` on `/metrics` of `api` and `worker` (private network only; see `security-design.md`). Caddy's metrics stay on its admin endpoint, also private.

| Metric | Type | Labels | Where |
|---|---|---|---|
| `http_requests_total` | counter | method, route, status | api |
| `http_request_duration_seconds` | histogram | method, route, status | api (performance NFR2.1) |
| `mcp_tool_duration_seconds` | histogram | tool, outcome | api |
| `proposal_decision_seconds` | histogram | outcome | api: created to decided |
| `job_queue_depth` | gauge | type | worker, from pg-boss queue sizes |
| `job_oldest_waiting_seconds` | gauge | type | worker |
| `job_attempts_total` | counter | type, result | worker |
| `dead_letter_count` | gauge | type | worker |
| plus Node.js defaults | | | both |

Labels hold route templates, tool names and job types only, never ids, content or the organisation (an organisation label would grow without bound on the hosted service; per-organisation questions are answered from the logs). A request that matches no route is labelled `route="unmatched"`, so unknown URLs cannot grow the label set.

`web` answers `/healthz` (see `reliability-design.md`); `api` and `worker` expose all three C8 endpoints on the private network.

## SLIs (measured, no targets)

| SLI | Query |
|---|---|
| Error rate | `sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))` |
| p95 latency | `histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_seconds_bucket[5m])))` |
| Dead letters | `sum(dead_letter_count) > 0` |

Alert rules and dashboards come with the operation stages; no tracing until then.

## Sources
- `../nfr-requirements/observability-requirements.md` (NFR13.1 to NFR13.4), `../nfr-requirements/performance-requirements.md` (NFR2.1), `../nfr-requirements/security-requirements.md` (NFR6.1), `../nfr-requirements/tech-stack-decisions.md`.
- `../functional-design/functional-spec.md` (W7).
- `inception/contract-design/contract-summary.md` (C3 alert policy, C8).
