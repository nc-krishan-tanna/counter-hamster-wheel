<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-26T10:17:17Z — Q1 says the worker talks to the backend over REST: read as the worker reading and writing knowledge only through /v1 under an extraction service account (Contributor), touching the database directly only for the job queue. Keeps extracted proposals on the same checked path as every other proposal.
- 2026-11-26T10:17:17Z — The chat bot acts for the matched person via an X-Acting-Chat-Identity header accepted only from the chat service account, so FR11.5 role checks apply per person, not per bot.
- 2026-11-26T10:17:17Z — user.deactivated runs through the job queue even though U2, U3 and U6 share the api container, so the unown and reroute steps are durable and retried.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-26T10:17:17Z — Q4: the person asked why a queue, why in the database, whether it scales beyond 100 people, and whether a broker's only cost is the extra container. Kept the database queue (same-transaction enqueue, nothing extra for self-hosters, load far below its limits) behind a swappable job interface so a broker can replace it, and added a dead-letter queue at their suggestion. Model outages defer jobs without using attempts, so an outage never dead-letters everything.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
