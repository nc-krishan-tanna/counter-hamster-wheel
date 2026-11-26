<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-26T11:48:00Z — "Source can be self-generated" read as a system source on every version naming the proposer and channel (web or MCP); manual sources are a title plus optional address.
- 2026-11-26T11:48:00Z — "Owners are always an array" read as at least one entry, with at least one person or group, so a human can always decide.
- 2026-11-26T11:48:00Z — FR2.1 requires a reason on every approved change, so the proposal's reason is required; the approver's comment stays optional unless rejecting.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-26T11:48:00Z — Domain design had zero or one owner User per item; the team replaced it with a list of people, groups and agents (Q11), stored on each version.
- 2026-11-26T11:48:00Z — Requirements say every owner must approve (FR3.3); the team decided one owner approval is enough (Q11). Recorded as a new requirement for U6.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-26T11:48:00Z — Owners stored on the version, not the item, so ownership changes are part of history; reads cost a join to the current version.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-26T11:48:00Z — Whether a context's owner overrides an item's owners is deferred to U3 by the team.
- 2026-11-26T11:48:00Z — Whether "unowned" items still exist at all now that owners are always a list (AC2.1.3, AC3.5.2) is for U3 and U6 to settle.
