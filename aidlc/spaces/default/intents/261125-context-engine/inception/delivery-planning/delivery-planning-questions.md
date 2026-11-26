# Delivery Planning — Questions

Context: `inception/units-generation/unit-of-work.md` and `unit-of-work-dependency.md` define 20 units and the order they can be built in. `inception/contract-design/contract-summary.md` defines the 8 contracts between them, with 6 review concerns you accepted as open risk. Already settled earlier, so not asked again: the first unit (U1) is the thin end-to-end slice (Units Generation Q5), and units with no dependency between them can be built at the same time by the three tech leads (Units Generation Q4).

This stage puts the units into an order of **Bolts**. A Bolt is one build pass over a piece of the work that ends in something that runs. Each first option is my recommendation.

## Q1. [Delivery lead] After the thin end-to-end slice (U1), what should be built first?

A. Riskiest first, then value: after U1, prove the hard, uncertain parts early (the AI gateway and extraction pipeline with one real connection, checked against the 5-minute target, plus the check whether ChatGPT projects can be read automatically), then build out the approval workflow, Ask and the web screens (Recommended: the risk log rates "first version slips" and "extracted knowledge is wrong" as high impact)
B. Most valuable first: make the manual loop complete and usable (sign-in, items, approvals with impact, web explore, MCP), then add connections and extraction
C. Score every Bolt with a formal model (WSJF: value plus urgency plus risk reduction, divided by size) and follow the scores
D. Not yet defined
X. Other (please specify)

[Answer]:

## Q2. [Delivery lead] How big should one Bolt be?

Units are about 1 to 2 weeks for one tech lead, and your branches live 1 to 2 days, so each Bolt is merged as several small pull requests whatever the answer.

A. One unit per Bolt, except very small units that only make sense together are bundled (for example the AI gateway with the first piece that uses it) (Recommended: each Bolt has one clear owner and done-check)
B. Always one unit per Bolt
C. Thin slices that cut across several units (one user journey per Bolt)
D. Not yet defined
X. Other (please specify)

[Answer]:

## Q3. [Delivery lead] How should I run the build with you, unit by unit or stage by stage?

Each unit goes through design steps (functional design, NFR design and so on) and then code generation. You approve as we go.

A. One unit at a time: each unit goes through all its design steps and its code, then you check it before the next one starts (Recommended: smallest batches, and the thin slice must be finished and approved first anyway)
B. Stage by stage: do one design step for all ready units, then the next; code for independent units can then be generated in parallel batches
C. Not yet defined
X. Other (please specify)

[Answer]:

## Q4. [Delivery lead] When should the 6 open contract concerns from Contract Design be fixed?

The main one: the worker units (syncing, extraction, notification delivery) need data the public API does not yet expose. The others are missing paths, the proposal timeout, dead-letter admin paths and job-queue details.

A. In the functional design of the unit each concern touches, before that unit's code is written: worker access in U7, U8 and U9; timeouts in U6; dead-letter paths in U1/U8; the rest in U1 and U2 (Recommended: fixed where the detail is designed, no separate step)
B. All at once, as the first step of U1, before any code
C. Leave them open until they cause a problem
X. Other (please specify)

[Answer]:

## Q5. [Tech lead] Who sets up the outside accounts the build needs?

The connections and the AI model need test accounts and app registrations: a Slack workspace and app, a Google Workspace with an OAuth app, a Microsoft 365 tenant with an app registration and admin consent, an AI model API key (or a self-run model), and a ChatGPT account to check project access.

A. The tech leads create free or trial test accounts themselves, kept separate from any real organisation's data (Recommended: no waiting on others, and it follows the rule never to use real organisation content)
B. An IT or admin team provides them on request
C. Not yet defined
X. Other (please specify)

[Answer]:

## Q6. [Sponsor] Is anything outside the team going to hold up the build?

A. No: the only outside decision is the open-source licence, which the sponsor chooses before the first public release (U20) (Recommended: matches what the earlier stages recorded)
B. Yes (please list who owns it, how long it takes and what it blocks)
C. Not yet defined
X. Other (please specify)

[Answer]:

## Q7. [Delivery lead] What worries you most about this build, so we tackle it early? (select all that apply)

A. AI extraction quality and the 5-minute target (Recommended)
B. Reading the tools: ChatGPT projects access and Microsoft or Google admin consent (Recommended)
C. The 3D map staying smooth with 10,000 items
D. Non-technical people finding approvals and editing easy
X. Other (please specify)

[Answer]:
