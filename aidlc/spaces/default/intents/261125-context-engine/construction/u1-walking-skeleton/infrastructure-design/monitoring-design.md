# Monitoring Design — U1 walking skeleton

How the observability strategy in `../nfr-design/observability-design.md` runs on the two install shapes in `infrastructure-specification.md`. U1 measures and sets no targets (`../nfr-design/performance-design.md`); alert rules, dashboards and a metrics server come with the operation stages and U20. What U1 does guarantee is that every component has a health check and an error-rate metric, and that a failed deploy is noticed.

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|---|---|---|---|
| Liveness: `/healthz` | `api`, `worker`, `web` (Caddy answers itself) | Not `200` → Compose marks the container unhealthy (it does not restart a running container; `restart: unless-stopped` restarts only one that exits, and a fatal error makes the process exit); the deploy check fails; the uptime probe fails | Health metric for every component (operation-phase rule; NFR13.1) |
| Readiness: `/readyz` | `api` (database), `worker` (database and pg-boss) | `503` → Compose marks the container unhealthy; the deploy check fails | Catches a lost database or Supabase pooler (NFR10.6) |
| Uptime probe (hosted) | A scheduled GitHub Actions workflow, every 15 minutes, requests `https://<service address>/healthz` and calls the MCP tool `search_knowledge` at `https://e2e-a.<service address>/mcp` with the test organisation's agent token | Any failure → the workflow fails | Notices a hung or unhealthy copy between deploys, since nothing restarts an unhealthy container |
| `http_requests_total{status=~"5.."}` / `http_requests_total` | `api` `/metrics` | None in U1 (measured) | Error-rate metric (NFR13.3) |
| `http_request_duration_seconds` p95 by route | `api` `/metrics` | None in U1 (measured) | Baseline for NFR2's 5-second target, checked in U15 and U16 |
| `mcp_tool_duration_seconds` | `api` `/metrics` | None in U1 | Agent-facing latency (NFR2.1) |
| `proposal_decision_seconds` | `api` `/metrics` | None in U1 | Decision time (NFR13.4) |
| `job_queue_depth`, `job_oldest_waiting_seconds`, `job_attempts_total`, `dead_letter_count` | `worker` `/metrics` | `dead_letter_count > 0` is the first alert, added with the operation stages | Queue health (NFR13.3, C3 alert policy) |
| Supabase database health (CPU, connections, disk) | Supabase dashboard, hosted only | Supabase's own warnings to the project's email | The managed database is watched by its provider |

Metrics are reachable only on the private network (`security-design.md`). On the hosted VM a tech lead reads them with `docker compose exec api wget -qO- localhost:3000/metrics`. A Prometheus server to scrape them is not part of U1.

## Alerts

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| Deploy failed | The deploy job's health or end-to-end check fails; the previous tag is redeployed | P2 | GitHub Actions failure notification to the author and the tech leads; the run is linked from the pull request |
| Rollback failed | The previous tag does not pass `/healthz` either | P1 | Same notification, with the job marked `rollback-failed`; a tech lead follows `deploy/README.md` |
| Hosted copy unhealthy | The uptime probe fails | P2 | GitHub Actions failure notification to the tech leads |
| Container unhealthy or restarting | Compose marks a container unhealthy, or restarts one that exited | P3 | Visible in `docker compose ps` and the logs; the uptime probe catches it when it affects requests; alerting comes with the operation stages |
| Supabase project warning | Supabase's own email alerts (disk, connections) | P2 | The team mailbox registered on the Supabase project |

`shortcut: no paging and no metric-based alerts in U1; the operation stages add Prometheus alert rules (dead letters above zero, error rate) and an on-call route.`

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|---|---|---|
| Error rate: 5xx / all `api` responses | None in U1 (measured only) | 5-minute rate |
| Request latency p95 by route | None in U1 (measured only) | 5-minute rate |
| Dead letters | None in U1 (measured only) | Instant |
| Deploy health: the end-to-end check passes after each deploy | Every deploy passes or is rolled back | Per deploy |

Targets and their 30-day windows are set by the operation stages, which own the hosted service's availability target (`../nfr-requirements/reliability-requirements.md`, Not in U1).

## Logs & Tracing

| Aspect | Design |
|---|---|
| Format | JSON, one line per request with `reqId`, `org` (organisation id), route, status and duration; no content (`observability-design.md`) |
| Collection | Containers log to stdout; Docker's `json-file` driver with rotation (`max-size: 10m`, `max-file: 5`) set in `compose.yaml`, on both shapes |
| Reading | `docker compose logs api` on the host; per-organisation questions are answered by filtering on `org` |
| Retention | Self-hosted: up to the rotation limit. Hosted: the same in U1; shipping logs to a store with a retention policy comes with the operation stages |
| Tracing | None in U1 (team choice, `../nfr-requirements/observability-requirements.md`); the request id in every log line and problem body links a request end to end |
| Dashboards | None in U1; the Supabase dashboard covers the hosted database |

## Sources
- `../nfr-design/observability-design.md` (metrics, logs, SLIs), `../nfr-design/reliability-design.md` (health endpoints), `../nfr-design/performance-design.md`, `../nfr-design/security-design.md` (private metrics).
- `infrastructure-specification.md` (the two shapes); `cicd-pipeline.md` (the deploy check).
- `inception/contract-design/contract-summary.md` (C3 alert policy, C8).
