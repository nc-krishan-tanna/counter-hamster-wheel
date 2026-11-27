## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-26T15:47:43Z
**Iteration:** 2
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-design/security-design.md > Organisation from the address (first onRequest hook) | The organisation hook answers 404 for any host that is not `<address>.<base domain>` and runs on every request, but only the second hook exempts `/healthz`, `/readyz`, `/metrics`. The Compose health checks and metric scrapes reach `api` and `worker` on the private network with a host such as `api:3000` or `127.0.0.1`, so they would get 404. `api` and `worker` would then never become healthy, and `migrate`-gated startup and the deploy health check would fail. | Exempt `/healthz`, `/readyz` and `/metrics` from the organisation hook as well, or state that they are served before it. Add a test that `/readyz` answers 200 with `Host: api:3000`. | Resolved (reviewer) |
| R-02 | Major | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-design/security-design.md > Organisations kept apart in the database (row-level security policy and "no organisation set" bullet) | The policy casts `current_setting('app.organisation_id', true)::uuid`. In PostgreSQL, once `set_config(..., true)` has been used on a connection, the setting reverts to an empty string, not null, after the transaction ends. A pooled connection that has served any earlier request would then raise `invalid input syntax for type uuid` instead of returning no rows. The stated behaviour ("matches no row") and the test "with no organisation set, every SELECT returns nothing" would fail or depend on connection history. It still fails closed, but it throws errors and the test is unreliable. | Write the policy as `organisation_id = NULLIF(current_setting('app.organisation_id', true), '')::uuid` (in both USING and WITH CHECK). Make the no-organisation test run twice on the same pooled connection, once before and once after a `withOrganisation` call. | Resolved (reviewer) |
| R-03 | Major | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-design/security-design.md > Authentication ("Resolution") and Organisations kept apart in the database | `service_accounts` has row-level security, yet the auth hook loads its row by `api_key_id` in the hook, before `withOrganisation` runs. With no organisation set, `ce_api` sees zero rows. With the address's organisation set, another organisation's account is invisible, so a cross-organisation agent token would resolve to "no service account", which reads as `401`, not the specified `404 not-found`. The design never says how the hook reads this table or how it tells "wrong organisation" apart from "unknown". The required test (A's agent token at B's address answers `not-found`) is not achievable as written. | Define the lookup. For example, run it in a transaction with the address's organisation set, and treat a valid API key whose `service_accounts` row is invisible as `404 not-found` (an invalid key stays `401`). Alternatively use a narrow `SECURITY DEFINER` lookup that returns the row's organisation. Update the test and the principal-resolution text to match. | Resolved (reviewer) |
| R-04 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-design/reliability-design.md > Jobs; security-design.md > role table | `ce_worker` has DML only on `pgboss`, and the design creates each job type with a retry policy and a `<type>.dead` queue. Depending on the pg-boss version, creating queues and running maintenance needs DDL, and pg-boss tries to migrate or create its schema at start-up. As written, the worker could fail at start. | Name the pg-boss version and state that queue creation and schema migration run in `migrate` as `ce_migrate`. State that `api` and `worker` start pg-boss with its schema migration and creation turned off. | Resolved (reviewer) |
| R-05 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-design/security-design.md > Foreign keys cannot cross organisations | Composite foreign keys are specified only between knowledge tables. References to the Better Auth `user` table (proposer, decider, owner, group member) are not composite, and `user` has no unique `(organisation_id, id)`. A row could point at another organisation's person, and the isolation tests would not catch it. | Add a unique `(organisation_id, id)` on `user` and make those references composite, or say the check is made in the proposal service and test it. | Resolved (reviewer) |
| R-06 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-design/security-design.md > Organisation from the address, step 2; role table | The text says `organisations` is "the one table every role may read", but `ce_worker`'s rights list only `pgboss`. The Origin check requires exactly `https://<address>.<base domain>` with no port, so it breaks if Caddy is published on a non-standard port. | Either grant `ce_worker` SELECT on `organisations` or reword to `ce_api` only. State that the Origin check includes any non-default public port, or that U1 runs on 443 only. | Resolved (reviewer) |
| R-07 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/nfr-design/security-design.md > Authentication, Bearer token (`auth_service_account`) | The `SECURITY DEFINER` function is described without a pinned `search_path`; a definer function that resolves unqualified names at call time is a known privilege-escalation route, and it is the one function that reads across organisations. | State that the function is created with `SET search_path = pg_catalog, public`, uses schema-qualified names, and has `EXECUTE` revoked from `PUBLIC`; add a migration test that `ce_worker` cannot call it. | New |

> R-01 Reviewer note: The health and metrics endpoints are now registered outside the whole chain and the organisation hook lists the three exemptions; the `Host: api:3000` test is stated.

> R-02 Reviewer note: The policy now uses `NULLIF(current_setting(...), '')::uuid` in USING and WITH CHECK, and the double-run pooled-connection test is specified.

> R-03 Reviewer note: A `SECURITY DEFINER` function `auth_service_account(api_key_id)` owned by `ce_migrate` is defined, granted to `ce_api` only, with the 401/404 outcomes and tests.

> R-04 Reviewer note: pg-boss v10 queues and schema are created in `migrate` as `ce_migrate`; `api` and `worker` start with `migrate: false`.

> R-05 Reviewer note: `user` gets unique `(organisation_id, id)`; person-only references are composite, and the mixed references are checked in the proposal service with a `422` test.

> R-06 Reviewer note: `organisations` is stated as outside the policy and unreadable by `ce_worker`; the Origin check covers a non-default port and U1 runs on 443.

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| traceability (read by hand) | All 34 upstream IDs in `traceability.json` have an OK entry whose target section exists in the design files | No orphan or dangling reference found |
| required-sections, upstream-coverage, linter, type-check | Not run (no shell in this pass) | For the person to weigh; not grounds for NOT-READY |

### Summary

All six earlier findings are fixed in the artifact, and the isolation chain (address, credential match, `withOrganisation`, row-level security, composite keys, roles) now traces end to end without a gap a developer would have to guess at. One Minor hardening point remains on the definer function.
