<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-26T14:10:00Z — the NFR requirements review's R-01 to R-05 were resolved in this design rather than by reopening the approved requirements; R-03 (partial coverage) is recorded as a coverage-limits table in logical-components.md because the requirements files are frozen after their review.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-26T15:45:04Z — no ce_system role in U1 although C3 names it; U1 has no scheduler and pg-boss runs on its own schema, so nothing needs a cross-organisation query. It arrives with U2's Tenancy interface.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-26T14:10:00Z — idempotency keys are unique forever instead of for 24 hours; one unique index, no expiry job. Marked as a shortcut in reliability-design.md.
- 2026-11-26T14:10:00Z — row locks (SELECT FOR UPDATE) at READ COMMITTED rather than SERIALIZABLE with retries; simpler and the lock order (proposal, then item) is fixed.
- 2026-11-26T15:45:04Z — organisations: set_config('app.organisation_id', $1, true) per transaction instead of a connection per organisation or a schema per organisation; one pool, parameterised, and the setting cannot leak to the next request on a pooled connection.
- 2026-11-26T15:45:04Z — composite (organisation_id, id) foreign keys on every knowledge reference, because foreign-key checks ignore row-level security; costs a wider key, closes cross-organisation links at the database.
## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-26T15:45:04Z — Better Auth's user table has a globally unique email, so one person cannot belong to two organisations in U1; recorded as a known limit in security-design.md for U2 to settle.
