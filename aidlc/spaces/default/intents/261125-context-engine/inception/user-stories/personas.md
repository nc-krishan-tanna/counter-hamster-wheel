# Personas

Input: `inception/requirements-analysis/requirements.md` (roles FR11.3, day-one users) and the intent statement's day-one users.

| ID | Persona | Typical role in the engine | Priority |
|---|---|---|---|
| P1 | Sam, Business contributor | Contributor | 1 |
| P2 | Priya, Item owner | Contributor, Approver or Admin who owns items | 1 |
| P3 | Theo, Technical contributor | Contributor (sometimes owner) | 2 |
| P4 | Alex, Admin | Admin | 2 |
| P5 | The AI agent | Service account (Contributor) used by ChatGPT, Claude or another agent through MCP | 2 |

## P1 Sam, Business contributor

- **Who:** works in operations, finance, HR or sales; non-technical.
- **Goals:** find the current rule or process quickly; record a change without learning new tools.
- **Pain points:** rules live in old documents and people's heads; never sure which version is current.
- **Tech comfort:** low to medium. Lives in Slack or Teams and Google or Microsoft documents.
- **Uses:** asks in Slack or Teams most days; opens the web app occasionally.

## P2 Priya, Item owner

- **Goals:** keep the rules she is accountable for correct; approve changes quickly with enough context to judge their impact.
- **Pain points:** changes happen in chat without her knowing; no record of why a rule changed.
- **Tech comfort:** medium.
- **Uses:** reviews her inbox a few times a week, acts on stale reminders, and sometimes runs a what-if before changing a rule.

## P3 Theo, Technical contributor

- **Goals:** record architecture decisions and system knowledge next to the business rules they affect; connect new data sources.
- **Pain points:** decisions are scattered across tickets and chats; no link from systems to the rules they implement.
- **Tech comfort:** high.
- **Uses:** web app and MCP from his coding assistant; occasionally builds a new connection.

## P4 Alex, Admin

- **Goals:** set the engine up once, connect tools safely, and keep sensitive content protected.
- **Pain points:** worries about chat and transcript content leaking; needs to show who changed what.
- **Tech comfort:** high.
- **Uses:** web app settings; runs the containers.

## P5 The AI agent

- **Goals:** get trustworthy, sourced organisational context to answer people and act; suggest changes it notices.
- **Constraints:** acts under an account and role; can read and propose, never change knowledge directly.
- **Uses:** MCP.

## Relationships

- Sam and Theo (and the AI agent) raise proposals; Priya approves those for items she owns; Alex sets up and can override an owner with a recorded reason.
- Unowned items fall to Approvers and Admins.
