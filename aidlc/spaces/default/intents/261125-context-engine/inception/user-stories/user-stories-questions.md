# User Stories — Plan and Questions

Input: `inception/requirements-analysis/requirements.md` (13 functional areas, 13 NFRs) and `inception/practices-discovery/team-practices.md`.

## Story plan

- **Persona approach:** personas come from the day-one users in the intent statement (business people and leaders, technical people, AI agents) and the four roles (Reader, Contributor, Approver, Admin). Each persona gets goals, pain points and tech comfort.
- **Story format:** "As a [persona], I want [goal], so that [benefit]", INVEST-checked, with Given/When/Then acceptance criteria (3 to 6 per story), IDs `US{group}.{seq}` and `AC{group}.{seq}.{n}`.
- **Prioritisation:** MoSCoW per story. Scope says every capability is a must-have, so most stories are Must; any that are not are marked and explained.
- **Breakdown approach:** chosen in Q2.
- **Coverage:** every FR sub-requirement and NFR from `requirements.md` maps to at least one story, or is marked Deferred with the downstream stage named.

## Q1. [Product owner] Which personas should the stories be written for?

A. Five: Business contributor (non-technical; writes and reads rules and processes), Item owner (accountable for items; approves changes), Technical contributor (engineer recording decisions and systems), Admin (sets up connections, privacy, people), plus the AI agent as a system actor
B. Three: Business user, Technical user, Admin (owners and agents folded in)
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. [Product owner] How should the stories be grouped?

A. By user journey: capture, propose and approve, explore the map, ask, keep it fresh, set up and administer
B. By persona
C. By requirement area (one group per FR1 to FR13)
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q3. [Product owner] How big should each story be?

A. Small: each story is 1 to 3 days of work for one person with AI assistance (more stories, easier to build in parallel)
B. Larger: one story per feature (fewer stories, each bigger)
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q4. [Product owner] The requirements review flagged gaps in the accountability rules. Should the stories close them with these defaults?

The gaps: who approves when an owner is not an Approver, self-approval, an owner leaving, matching Slack and Teams users to accounts, and removing items.

A. Yes: an owner approves their own items whatever their role; owners may approve their own proposals but this is flagged in history; Admins can override an owner with a recorded reason; a departed owner's items become unowned and go to Approvers; Slack and Teams users are matched to accounts by work email and unmatched users get nothing; items are archived, not deleted, and archiving is a proposal
B. Yes, but with different defaults (please specify)
C. No, leave them for the design stages
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Personas: five, namely Business contributor, Item owner, Technical contributor, Admin, and the AI agent as a system actor (Q1)
- Grouping: by user journey, covering capture, propose and approve, explore the map, ask, keep it fresh, and set up and administer (Q2)
- Size: small stories, 1 to 3 days each for one person with AI assistance (Q3)
- Accountability defaults covered by stories: owners approve their own items whatever their role; self-approval allowed but flagged in history; Admins can override an owner with a recorded reason; a departed owner's items become unowned and go to Approvers; Slack and Teams users matched to accounts by work email, unmatched users get nothing; items are archived through a proposal, not deleted (Q4)
- Hosted service (from the updated requirements FR14, NFR14, NFR15, 2026-11-26): a sixth persona, Olu the Operator, outside every organisation; a seventh group, "Organisations and the hosted service", with stories for keeping organisations apart, sign-up, signing in to one organisation, suspend and reactivate, logged support access, self-hosted as one organisation, and the hosting region; separation, sign-up, sign-in, suspension and self-hosting are Must, support access and the region notice are Should

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
