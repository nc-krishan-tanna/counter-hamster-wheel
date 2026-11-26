# Performance Requirements — U1 walking skeleton

The team decided U1 sets no speed targets: it measures latency and sets no limit (`nfr-requirements-questions.md` Q8, Q10). The product's speed targets in `inception/requirements-analysis/requirements.md` stay in the MVP and are checked in their own units.

## Requirements

| ID | Requirement | Pass/fail check |
|---|---|---|
| NFR2.1 | Request latency is recorded for every `/v1` route and every MCP tool (`search_knowledge`, `get_item`, `propose_change`) as a histogram; no limit is enforced in U1 | `/metrics` shows a latency histogram labelled by route or tool after the W7 end-to-end check |

## Where the product targets are checked

| Target | Unit |
|---|---|
| NFR1: 95% of proposals within 5 minutes of the source change | U9 (U1 has no connected sources) |
| NFR2: 95% of MCP, Slack and Teams answers within 5 seconds | U15, U16 |
| NFR3: map at 30 fps with 10,000 items; list view under 2 seconds | U18 (U1's basic pages are removed then) |

## Design notes that keep later targets reachable

- Search (`functional-spec.md` W6) runs in PostgreSQL over approved versions only (`rules.md` BR4.2); list endpoints are cursor-paged with at most 200 per page (`inception/contract-design/contract-summary.md` C1).

## Sources
- `functional-spec.md` (W5, W6), `rules.md` (BR4.2).
- `inception/requirements-analysis/requirements.md` (NFR1, NFR2, NFR3).
- `inception/contract-design/contract-summary.md` (C1 pagination, C2 tools).
- `nfr-requirements-questions.md` Q8, Q10.
