<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-11-26T10:58:28Z — "Riskiest first" read as "AI parts as early as their dependencies allow": extraction (U9) needs U6, so the AI gateway comes in B3, the ChatGPT check in B5, Google in B6 and extraction in B9.
- 2026-11-26T10:58:28Z — Q4 answer (2) "solve on interface unit" read as: each missing interface is designed in the unit that owns it (U6, U14, U7).

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-26T10:58:28Z — Microsoft and Slack connectors placed after the approval screens (B10): the person named approval usability, not connector consent, as the worry (Q7).
- 2026-11-26T10:58:28Z — Rejected a throwaway extraction spike after U1: it would bypass approvals and the team extends skeleton code rather than discarding it.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-26T10:58:28Z — Who the non-technical colleagues for the B10 usability check are is not yet decided (marked as an assumption).
