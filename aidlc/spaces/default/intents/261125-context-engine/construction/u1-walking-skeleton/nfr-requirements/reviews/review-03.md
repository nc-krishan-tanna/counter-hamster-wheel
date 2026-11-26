## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-26T15:32:26Z
**Iteration:** 2
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-requirements/security-requirements.md > NFR9.2 | The grant list says `api` may update only `proposals.status` and `links.removed_in_version_id`. The approval in `functional-spec.md` W4 also points the item at its new version, sets `lastReviewedAt`, and writes decisions, versions and links. Taken literally, the `UPDATE` on the item row fails and approval cannot work. Which role runs migrations, and which role owns the pg-boss tables, is also unstated. A developer would have to guess, and would likely widen the grant, which defeats NFR9. | Write the full per-table grant list for the `api` and `worker` roles: INSERT-only tables, the exact updatable columns on `items` (current version pointer, `lastReviewedAt`) and on `proposals`, and the pg-boss schema. Name a separate migration role. Add a test for each denied statement. | Resolved (reviewer) |
| R-02 | Major | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-requirements/security-requirements.md > NFR5.5 | The pass/fail check says "a cross-origin request is refused". The same row says CORS is off and that origin and CSRF rules wait for U2. Turning CORS off does not refuse anything. The browser still sends the request, and the server runs it unless it checks the `Origin` header. The check cannot be met as written, or it silently pulls U2's origin check into U1. | Pick one. Either add a minimal server-side `Origin` check for cookie-authenticated writes to U1 and keep the test, or reword the check to "no CORS headers are returned and `SameSite=Lax` cookies are not sent on cross-site POST". Say plainly that the CSRF gap is a known U1 limit. | Resolved (reviewer) |
| R-03 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-requirements/traceability.json > coverage NFR2, NFR4, NFR6, NFR13 | These are marked `OK`, but U1 covers only part of each. NFR2 only measures latency and enforces no 95%-in-5s target. NFR4 has no 100-person check (U20). NFR6 has no Admin-only raw-source rule (U8). NFR13 has no sync status per connection (U8). The sensor passes ("result":"passed"), but the file overstates coverage. | Mark these `Partial` or `Deferred` and name the unit that closes the rest, as is already done for NFR1, NFR3, NFR7 and NFR8. | Resolved (reviewer) |
| R-04 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-requirements/security-requirements.md > NFR5.1 and NFR13.1 | Caddy proxies only `/v1` and `/mcp`. It is not stated whether `/metrics`, `/healthz` and `/readyz` of `api` and `worker` are reachable from outside the Compose network. `/metrics` is unauthenticated and its labels expose route and job-type names. | State that these endpoints are reachable only on the private network (or Caddy does not route them). Add a test that they return 404 through Caddy. | Resolved (reviewer) |
| R-05 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-requirements/security-requirements.md > NFR5.6 and NFR5.2 | The seeded agent token comes from an environment variable, but the Better Auth API-key plugin stores only hashes and shows the key once. How seeding writes a known token as a hash is not said. NFR5.2 says "CI secret scan" without naming a tool. | Add a line saying the seed hashes the environment-supplied token with the plugin's own method. Name the secret-scan tool, or leave the choice to code generation and say so. | Resolved (reviewer) |
| R-06 | Major | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-requirements/security-requirements.md > Organisations, NFR14.1 and NFR14.2 | Isolation is stated only for the `api` role and the per-request organisation. The `worker` container also reads and writes organisation data (jobs, proposals, items). Nothing says which database role it uses, that it is not the table owner or `BYPASSRLS`, or how it gets the organisation. Job payloads must not carry content (NFR6.1), so the organisation id would have to travel in the job. The pg-boss tables and Better Auth tables (users, sessions, API keys) are neither named as covered by row-level security nor excluded. A worker running as owner, or a job with no organisation, is a gap across the isolation boundary. | Extend NFR14.1 and NFR14.2 to the `worker` role: no ownership, no `BYPASSRLS`. Require the organisation id in each job and set it per job transaction, and a job with none must fail. State explicitly whether the pg-boss and Better Auth tables are under row-level security or exempt, and why. Add an isolation test for a worker job. | Resolved (reviewer) |
| R-07 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-requirements/security-requirements.md > NFR14.2 | "The address" is not defined for U1, which runs locally at one address. The requirement does not say how U1 provides a second organisation to test against (seed data, a second hostname through Caddy). | Say that the seed creates two organisations and how each is addressed in Compose, so the NFR14.2 and NFR14.3 tests can run in U1. | Resolved (reviewer) |
| R-08 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-requirements/security-requirements.md > NFR9.2 and NFR14.1 | The idempotency-key store (BR1.7, scalability NFR4.1 says keys live in PostgreSQL) appears in neither the `api` grant list nor the row-level-security list. A developer cannot tell which role writes it or whether it is isolated per organisation. | Name the idempotency table, give the `api` role its grants, and state that it has row-level security keyed on the organisation (or an exemption with a reason). | New |
| R-09 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-requirements/security-requirements.md > NFR9.2 (worker role) vs NFR14.2 | The worker has no access to knowledge tables, yet a job's handler "runs with that organisation set". This is harmless in U1, which has no handlers that read knowledge. Later units that add them will need a grant change. | Add one line saying that later units which add knowledge-reading job handlers must extend the worker grants and add an isolation test. | New |

> R-01 Reviewer note: NFR9.2 now lists per-table grants with updatable columns, a separate migration role, the job-queue schema, and denial tests for api and worker.

> R-02 Reviewer note: NFR5.5 now has a server-side Origin check for cookie-authenticated writes, with a test for a foreign or missing Origin.

> R-03 Reviewer note: Partial coverage is now stated in the target text with the closing units (U15, U16, U20, U8). Statuses still read OK, which is acceptable.

> R-04 Reviewer note: NFR5.9 states the health and metrics endpoints are private-network only and tests for 404 through Caddy.

> R-05 Reviewer note: NFR5.6 says the seed hashes the agent token with the plugin's method. The scanner is left to code generation, with gitleaks as an example, in NFR5.2.

> R-06 Reviewer note: NFR14.1 covers the worker role (no ownership, no BYPASSRLS). It states the sign-in tables and the job-queue schema are outside row-level security, with reasons, and NFR14.2 sets the organisation per job. A dedicated isolation test for a worker job is not spelled out, but this is not blocking because U1 has no production jobs.

> R-07 Reviewer note: NFR14.2 names two seeded organisations at their own local addresses (acme.localhost, globex.localhost).

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| traceability | passed | Upstream NFR IDs are all covered, deferred or marked N/A. |
| required-sections, upstream-coverage, linter, type-check | not run | Not needed for the review subject; no finding rests on them. |

### Summary

All prior findings are addressed. The security design is implementable: grants, row-level security, the Origin check and the private endpoints are concrete and testable. Two minor gaps remain, both about tables outside the stated grant and row-level-security lists (the idempotency store and future worker handlers).
