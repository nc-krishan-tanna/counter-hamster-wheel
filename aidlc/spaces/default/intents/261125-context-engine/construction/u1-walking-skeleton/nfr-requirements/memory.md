<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-26T13:37:36Z — U1 is the place the tech stack gets fixed; the B1 Definition of Done in bolt-plan.md requires the job-queue library (C3) and the authentication library (C1) to be chosen here, so tech-stack questions dominate this stage's questions even though Construction normally asks few.
- 2026-11-26T13:37:36Z — PostgreSQL treated as already decided, not asked; contract C3 puts the job queue "in the main database" behind "an established Postgres job-queue library", which only makes sense with Postgres as the main database.
- 2026-11-26T13:37:36Z — the MCP server uses the official MCP TypeScript SDK, not asked; it is the established library for C2 (Streamable HTTP) and the project rule says use proven libraries.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-26T13:37:36Z — Caddy doubles as the `web` container (static files plus HTTPS proxy) instead of a separate static server; one container fewer, and `web` and `api` share one origin, which lets CORS stay off in U1.
- 2026-11-26T13:37:36Z — NFR7 and NFR8 marked Deferred, not given U1 requirements; U1's basic pages are removed by U18 and U19, which carry WCAG 2.1 AA and 320 px layouts.
- 2026-11-26T13:37:36Z — NFR9.2 grants column-level UPDATE on proposals.status and links.removed_in_version_id only, because the functional design's lifecycle needs those two updates while versions and decisions stay fully immutable.
## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-26T13:37:36Z — Q8 answer "performance standards after MVP" could have meant moving NFR1 to NFR3 out of the MVP; a follow-up (Q10) confirmed it applies to U1 only.
