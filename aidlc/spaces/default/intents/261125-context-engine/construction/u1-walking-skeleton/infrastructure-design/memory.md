<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-26T15:57:31Z — "supabase would be good" read as Supabase for the database only; confirmed by the Q5 follow-up (containers on one EU VM) and the summary, which states sign-in stays Better Auth.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-26T15:57:31Z — kept tables in `public` on Supabase (turning the Data API off and revoking anon/authenticated) rather than a private schema, so the approved NFR design's component map stays true without reopening it.
- 2026-11-26T15:57:31Z — the VM, DNS and Supabase project are created by hand from a documented runbook, not Terraform; marked as a shortcut until a second hosted copy or region (U20).

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
