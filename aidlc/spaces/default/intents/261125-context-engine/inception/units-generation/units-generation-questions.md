# Units Generation — Questions

Context: `inception/domain-design/components.md` defines 15 building blocks, and `decisions.md` records 8 decisions. `inception/user-stories/stories.md` has 52 stories, and `inception/refined-mockups/mockups.md` has 13 screens. The team practice is a thin end-to-end slice first. These questions decide how the building blocks are grouped into units of work that three tech leads can build. The order of the work is decided later, in Delivery Planning.

## Q1. [Architect] How should the work be cut into units?

A. Mostly by building block, with each tool connection (Google, Microsoft 365, Slack, ChatGPT) and each big web area as its own unit, so pieces can be built in parallel (Recommended)
B. By feature slice: each unit cuts through every layer for one journey (capture, approve, explore, ask, freshness, admin)
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. [Architect] How big should units be?

A. Fine-grained: about 18 units, each roughly 1 to 2 weeks for one tech lead with AI assistance (Recommended: three leads can work in parallel)
B. Coarse-grained: about 8 larger units
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q3. [Architect] How should the pieces run when an organisation installs it?

For an organisation of up to 100 people, fewer moving parts makes self-hosting easier.

A. Modular monolith: one main backend service, one background worker (syncing, extraction, reminders), the web app and the chat bot, each in its own container, with clear internal boundaries so parts can be split out later (Recommended)
B. Microservices: each building block in its own container
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q4. [Architect] Can units with no dependency between them be built at the same time?

A. Yes: the three tech leads build independent units in parallel (Recommended)
B. No: one unit at a time
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q5. [Tech lead] What should the first, thin end-to-end slice include?

Your team practice requires it: knowledge goes in, is approved, is stored with its history, and is read back by a person and by an AI agent through MCP, all running from containers.

A. A person writes an item in a basic web page and its owner approves it. It is stored as a version, and is read back in the web page and through MCP. A seeded sign-in is used, and it all runs from containers with CI (Recommended: smallest slice that proves every layer connects)
B. As A, plus one real connection (for example file upload or Slack) feeding an extracted proposal
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Cut: mostly by building block, with each tool connection and each big web area as its own unit, so pieces can be built in parallel (Q1)
- Size: fine-grained, about 18 units of roughly 1 to 2 weeks each for one tech lead with AI assistance (Q2)
- Deployment: modular monolith, meaning one main backend service, one background worker, the web app and the chat bot, each in its own container, with clear internal boundaries (Q3)
- Parallel: units with no dependency between them can be built at the same time by the three tech leads (Q4)
- First slice: write an item in a basic web page, the owner approves it, it is stored as a version and read back in the web page and through MCP, with a seeded sign-in, all from containers with CI (Q5)
- Tenancy: folded into U2, which now holds IdentityAccess, OrgSettings and Tenancy (organisations, addresses, sign-up, suspension, operators, support access log) and grows from M to L; the new screens S14 to S18 are added to U19 (Q6)
- Skeleton separation: U1 seeds two organisations, stamps its tables with the organisation, turns on row-level security, and its end-to-end check proves the second organisation cannot see the first one's item (Q7)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

## Q6. [Architect] Which unit builds the new Tenancy building block?

New on 2026-11-26 with the hosted service: Domain Design added Tenancy (organisations, their addresses, suspension, operators and the support access log; ADR-009), and the refined mockups added sign-up, organisation sign-in, the suspended notice, the support access log and the operator console (S14 to S18).

A. A new unit, U21 u21-tenancy (service, M, in `api`): organisations and their addresses, finding the organisation for each request, sign-up, suspension and reactivation, operator accounts and the support access log; the screens S14 to S18 are added to U19, which already builds the change and admin screens (Recommended: one owner for the organisation lifecycle, the same way every other building block has its own unit)
B. Fold Tenancy into U2 (identity and admin), which grows from M to L
X. Other (please specify)

[Answer]: B

## Q7. [Tech lead] Does the walking skeleton (U1) already keep organisations apart?

Every table in every unit now carries the organisation, and the database refuses cross-organisation access (ADR-009). U1 creates the first tables.

A. Yes: U1 seeds two organisations, stamps its tables with the organisation, switches on row-level security, and its end-to-end check also proves that the second organisation cannot see the first one's item; the rest of Tenancy (sign-up, operators, suspension) comes in U21 (Recommended: adding separation to every table after the fact is slower and riskier than building it in from the first table)
B. No: U1 stays single-organisation, and U21 adds the organisation to every table later
X. Other (please specify)

[Answer]: A
