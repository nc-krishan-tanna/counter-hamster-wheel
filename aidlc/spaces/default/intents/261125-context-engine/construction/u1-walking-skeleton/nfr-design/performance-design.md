# Performance Design — U1 walking skeleton

U1 measures latency and sets no target (`../nfr-requirements/performance-requirements.md`). The design only avoids choices that would make later targets hard to reach. Stack: `../nfr-requirements/tech-stack-decisions.md`.

## Measuring (NFR2.1)

- A Fastify `onResponse` hook records `http_request_duration_seconds{method, route, status}`, where `route` is the route template (`/v1/items/:itemId`), never the URL.
- Each MCP tool handler records `mcp_tool_duration_seconds{tool, outcome}`.
- Both are histograms with buckets 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10 seconds, so later units can read p95 against NFR2's 5 seconds.

## Keeping later targets reachable

| Choice | Why |
|---|---|
| One pg connection pool per process (pg default: 10) | Enough for the skeleton; sized in U20's load check |
| Reads take the current approved version through `items.current_version_id`, one join | No history scan on the read path (`../functional-design/functional-spec.md` W5, W6) |
| Search: `ILIKE` on title and content of current versions, max 50 results | `shortcut: a scan, fine for U1's few items; U14 replaces it with indexed full-text search` |
| Lists are cursor-paged, `limit` at most 200 (C1) | No unbounded queries |
| No cache | Nothing to invalidate; no measured need |

## Sources
- `../nfr-requirements/performance-requirements.md` (NFR2.1), `../nfr-requirements/tech-stack-decisions.md`.
- `../functional-design/functional-spec.md` (W5, W6).
- `inception/contract-design/contract-summary.md` (C1 pagination, C2 tools).
