# Team Allocation

A **Bolt** is one build pass over a piece of the work that ends in something that runs (see `bolt-plan.md`). A **mob** is the group that builds a Bolt together.

This workflow skipped Team Formation (mvp plan), so there are no named teams to assign. Every Bolt is planned the same way:

- **Builds the code:** the AI developer agent (`aidlc-developer-agent`), working tests first.
- **Owns and steers the Bolt:** one of the three tech leads, who approves the unit's design steps and its finished check before the next unit starts [Q3].
- **Reviews every pull request:** one of the other two tech leads, as for hand-written code (`team-practices.md`).

Which tech lead owns which Bolt is decided as each Bolt starts; this stage does not assign people.

## Allocation

| Bolt | Units | Built by | Owner | Reviewer |
|---|---|---|---|---|
| B1 | U1 | AI developer agent | a tech lead | another tech lead |
| B2 | U3 | AI developer agent | a tech lead | another tech lead |
| B3 | U4, U5 | AI developer agent | a tech lead | another tech lead |
| B4 | U2 | AI developer agent | a tech lead | another tech lead |
| B5 | U8, U13 | AI developer agent | a tech lead | another tech lead |
| B6 | U10 | AI developer agent | a tech lead | another tech lead |
| B7 | U7 | AI developer agent | a tech lead | another tech lead |
| B8 | U6 | AI developer agent | a tech lead | another tech lead |
| B9 | U9 | AI developer agent | a tech lead | another tech lead |
| B10 | U19 | AI developer agent | a tech lead, plus non-technical colleagues for the usability check [Q7] | another tech lead |
| B11 | U11 | AI developer agent | a tech lead | another tech lead |
| B12 | U12 | AI developer agent | a tech lead | another tech lead |
| B13 | U14 | AI developer agent | a tech lead | another tech lead |
| B14 | U15 | AI developer agent | a tech lead | another tech lead |
| B15 | U16 | AI developer agent | a tech lead | another tech lead |
| B16 | U17 | AI developer agent | a tech lead | another tech lead |
| B17 | U18 | AI developer agent | a tech lead | another tech lead |
| B18 | U20 | AI developer agent | a tech lead; the sponsor chooses the licence | another tech lead |

## Working in parallel

The build runs one unit at a time [Q3], so the plan assumes one Bolt in flight. Units Generation recorded that independent units could be built at the same time (Units Generation Q4); that remains possible later if the team switches to stage-by-stage, but it is not this plan.

## Sources
- Decisions: `delivery-planning-questions.md` Q3, Q5, Q7.
- Team practices: `inception/practices-discovery/team-practices.md`.
- Bolt order: `bolt-plan.md`.
