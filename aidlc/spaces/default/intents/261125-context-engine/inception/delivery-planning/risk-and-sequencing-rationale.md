# Risk and Sequencing Rationale

A **Bolt** is one build pass over a piece of the work that ends in something that runs (see `bolt-plan.md`). A **walking skeleton** is the smallest working slice through every layer, built and approved first.

## The heuristic

**Walking skeleton first, then riskiest first, then value** [Q1]. This is the risk-first argument from Cohn's agile planning: build the parts most likely to change the plan before the parts that only add value on top. A formal score (WSJF, weighted shortest job first: value plus urgency plus risk reduction, divided by size) was offered and not chosen.

Why risk first: the risk log rates "the first version slips" (R-1) and "extracted knowledge is wrong" (R-4) as high impact, and "ChatGPT projects cannot be read" (R-3) as worth checking early (`ideation/feasibility/raid-log.md`). The team's own biggest worry is that non-technical people find approving and editing hard (R-5) [Q7].

## How each risk shapes the order

| Risk | Where it is tackled | How |
|---|---|---|
| R-1 first version slips | B1, then B9 | The skeleton proves the layers connect; extraction (the most uncertain capability) is proven by B9, half-way through, not at the end |
| R-3 ChatGPT projects cannot be read | B5 | U13 is bundled with the ingestion framework so the question is answered with the first connector |
| R-4 extracted knowledge is wrong | B3, B9 | The AI gateway and assessment come early (B3); B9 measures extraction against the 5-minute target with a real Google connection |
| R-5 non-technical people find it hard | B10 | The change and approval screens come straight after extraction, with a usability check by non-technical colleagues [Q7] |
| A-1 tool permissions with admin consent | B6, B11, B12 | Each connector's Definition of Done includes consent on a test account |
| One organisation sees another's data on the hosted service (new, 2026-11-26; NFR14) | B1, B4, every Bolt, B18 | Separation is built into U1's first tables and proved in the skeleton's check; U2 extends it; every unit adds isolation tests; hosted sign-up opens only at B18 once they all pass [Q8] |

## Why this order is valid

The order respects every dependency in `inception/units-generation/unit-of-work-dependency.md`:

| Bolt | Units | Needs | Already built by |
|---|---|---|---|
| B1 | U1 | none | |
| B2 | U3 | U1 | B1 |
| B3 | U4, U5 | U1; U3, U4 | B1, B2, same Bolt |
| B4 | U2 | U1 | B1 |
| B5 | U8, U13 | U2; U8 | B4, same Bolt |
| B6 | U10 | U8 | B5 |
| B7 | U7 | U2, U3 | B4, B2 |
| B8 | U6 | U2, U3, U5, U7 | B4, B2, B3, B7 |
| B9 | U9 | U3, U4, U6, U8 | B2, B3, B8, B5 |
| B10 | U19 | U2, U4, U5, U6, U7, U8 | B4, B3, B8, B7, B5 |
| B11 | U11 | U8 | B5 |
| B12 | U12 | U8 | B5 |
| B13 | U14 | U2, U3, U4, U5, U6 | B4, B2, B3, B8 |
| B14 | U15 | U2, U6, U14 | B4, B8, B13 |
| B15 | U16 | U2, U14 | B4, B13 |
| B16 | U17 | U3, U4, U5 | B2, B3 |
| B17 | U18 | U3, U7, U14, U17 | B2, B7, B13, B16 |
| B18 | U20 | U9 to U13, U15, U16, U18, U19 | all earlier Bolts |

No Bolt is built before something it needs. This is one of several valid orders; the workflow walks the dependency graph itself, so this plan records intent and does not force a different order.

## Choices and their trade-offs

- **Extraction cannot come straight after the skeleton.** U9 needs the proposal workflow (U6), which needs identity, the knowledge graph, assessment and notifications. "Riskiest first" therefore means the AI parts come as early as their dependencies allow: the AI gateway in B3, the ChatGPT check in B5, one real connection in B6, extraction in B9. Alternative considered: a throwaway extraction spike right after U1. Rejected because it would bypass the approval flow the team wants every extracted item to go through, and the team's practice is to extend the skeleton's code, not throw it away.
- **The Microsoft and Slack connectors (B11, B12) come after the approval screens (B10).** The team named approval usability as its worry, not connector consent [Q7], and one real connection (Google, B6) is enough to prove extraction. Alternative considered: all four connectors before extraction. Rejected because it delays the extraction check and the usability check by several weeks.
- **Bundles are limited to two** [Q2]: U4 with its first user U5, and U8 with its first connector U13. Every other Bolt is one unit, so each has one owner and one done-check.
- **The hosted service does not change the order** [Q8]. Separation is cheapest built in from the first table (B1), Tenancy rides with identity in U2 (B4), and its screens with the other admin screens (B10). Alternative considered: opening invite-only pilots straight after B4. Rejected because isolation would be proven only for the units built so far.
- **The explore screens (B17) come late.** They need Ask (U14) and simulation (U17), and their main risk, map performance (NFR3), was not named as a worry [Q7].

## Sources
- Risks and assumptions: `ideation/feasibility/raid-log.md`.
- Dependencies: `inception/units-generation/unit-of-work-dependency.md`.
- Decisions: `delivery-planning-questions.md` Q1, Q2, Q7, Q8.
