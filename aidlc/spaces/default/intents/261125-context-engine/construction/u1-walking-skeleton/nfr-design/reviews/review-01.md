## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-26T14:12:03Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-design/reliability-design.md > Approval in one transaction (pseudo-flow) | The approval flow locks the proposal row first (`SELECT proposal FOR UPDATE`), then the item row, and at the end updates all other open proposals on the item to `out-of-date`. Two proposals on one item decided in parallel deadlock: A holds item and wants B's proposal row; B holds its own proposal row and waits for the item. PostgreSQL aborts one with a deadlock error (40P01), so the stated test (one `201` and one `409 proposal-out-of-date`) cannot pass reliably and a caller gets a 500. | Fix one lock order for every decision path, for example lock the item row first (looked up via the proposal's `itemId`, which is reserved for create), then the proposal row, then the sibling proposals. Say how a create proposal (no item row yet) is serialised. Add a deadlock-free parallel test and map any residual 40P01 to a retry. | New |
| R-02 | Major | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-design/security-design.md > Authentication table and Input validation / History cannot change (ce_api grants table) | The ServiceAccount entity (status, role, tokenRef) and the User role and status fields have no storage or grant in the design. The `ce_api` grant table lists no service-account table, yet the design says the API key is "disabled when the service account is deactivated" and that BR5.1 and BR2.2 distinguish service accounts from users. Better Auth's API-key plugin ties keys to its own user record, so how a bearer token resolves to a role, a service-account principal and a deactivation check is not designed. | State where service accounts and user roles live (own table or Better Auth fields), how the `onRequest` hook turns an API key into a service-account principal with its role, how deactivation is enforced, and add the rights to the `ce_api` and `ce_migrate` grant tables and a denial or refusal test. | New |
| R-03 | Major | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-design/traceability.json > upstream_ids and coverage | The file omits NFR11.1, NFR11.2, NFR11.3 (test-first, 80% coverage, CI blocking), NFR12.1 (everything runs as containers) and NFR13.1 to NFR13.4, all listed as OK in the NFR Requirements traceability. observability-design.md cites NFR13.x in its text, but no coverage row exists. No design section covers NFR11 (CI gates, coverage threshold) or NFR12.1 (container-only run). | Add all missing IDs with a status and target. Design NFR11 (CI jobs for format, lint, type check, tests with the 80% gate, blocking merge) and NFR12.1 (compose-only run proving W7), or mark them deferred to Infrastructure Design with the reason. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-design/reliability-design.md > Idempotent proposals (shortcut line) | Keys are reserved forever, while contract C1 and the Proposal entity say the same key within 24 hours returns the first result. A retry after 24 hours returns the old proposal or a `409` instead of a new one. The deviation is declared but not checked against the contract. | Either add the 24-hour window (a created-at check on conflict) or record the deviation as an agreed change to C1 and the entity. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-design/security-design.md > Transport and edge; observability-requirements NFR13.1 | NFR13.1 says `web` (Caddy) exposes `/healthz` and its own metrics, but the design routes everything except `/v1`, `/mcp`, `/api/auth` to static files and names no Caddy health endpoint or Compose health check for `web`. | Define Caddy's `/healthz` (static respond) and the web health check, and confirm it is not mistaken for the api's endpoint. | New |
| R-06 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-design/observability-design.md > Request id and Metrics | A client-sent `X-Request-Id` is accepted unvalidated into logs and responses, and the `route` label for unmatched URLs (404) is not defined, so raw URLs could become label values. | Validate the request id format (for example UUID, else regenerate) and label unmatched routes as a fixed value such as `unmatched`. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| traceability sensor (`aidlc engine sensor fire traceability --stage nfr-design`) | Not run: the command exits with "fire requires --output-path <path>", and I may write no file beyond this review | Checked by hand instead: traceability.json lacks NFR11.x, NFR12.1, NFR13.x (see Major finding) |
| required-sections, upstream-coverage, linter, type-check | Not run (same reason; no output path allowed) | For the person to weigh; the manual upstream comparison above stands in for upstream-coverage |

### Summary

The design is mostly coherent and traceable to the requirements, but three Major gaps block it: a lock-order deadlock in the approval transaction, an undesigned service-account and bearer-token identity path with no grants, and a traceability file that leaves out NFR11, NFR12.1 and NFR13.
