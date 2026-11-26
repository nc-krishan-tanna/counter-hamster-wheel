# RAID Log: Organisational Context Engine

Input: `ideation/intent-capture/intent-statement.md` (intent-statement), `feasibility-assessment.md` and `feasibility-questions.md`.

## Risks

| ID | Risk | Likelihood | Impact | Mitigation | Source |
|---|---|---|---|---|---|
| R-1 | First version slips because it includes four tool connections plus authoring, approvals, extraction and AI access | High | High | One shared way to add connections; build connections in parallel; set a first-demo date in Scope Definition | Q1, Q10, intent-statement |
| R-2 | Sensitive or personal remarks from chat and transcripts become widely visible | Medium | High | Safe defaults that organisations can change; opt-in and masking options | Q9, intent-statement review R-03 |
| R-3 | ChatGPT projects content cannot be read automatically | Medium | Medium | Verify early; fall back to file export | Q4 |
| R-4 | Extracted knowledge is wrong or out of date, so people and AI stop trusting it | Medium | High | People approve extracted knowledge; show sources and freshness | intent-statement Q5, Q12 |
| R-5 | Non-technical people find it too hard and stop contributing | Medium | High | Design the editing and approval flow for non-technical users first | intent-statement Q3, Q5 |
| R-6 | Configuring privacy and sensitive-data settings is too hard for administrators | Medium | Medium | Ready-made presets per common regulation | Q8, Q9 |

## Assumptions

| ID | Assumption | Owner | Status | Source |
|---|---|---|---|---|
| A-1 | Google Workspace, Microsoft 365 and Slack let an approved app read documents, transcripts and messages, given admin consent | Tech leads | Unvalidated | Q4 |
| A-2 | ChatGPT projects may have no automated read access (hypothesis) | Tech leads | Unvalidated | Q4 |
| A-3 | The CTO grants the needed admin consents in your organisation | Sponsor | Unvalidated | Q3 |
| A-4 | Metric targets are set before requirements are finalised | Sponsor | Unvalidated | intent-statement |

## Issues

| ID | Issue | Owner | Source |
|---|---|---|---|
| I-1 | No date or milestone for the first usable version; "as soon as possible" cannot be planned against | Sponsor | Q1 |

## Dependencies

| ID | Dependency | On whom | Source |
|---|---|---|---|
| D-1 | Admin consent for Google Workspace, Microsoft 365 and Slack in your organisation | CTO | Q3, Q4 |
| D-2 | Access to at least one AI model (hosted or self-run) for extraction and answering | Each organisation | Q7 |
| D-3 | A container platform to run the engine on | Each organisation | Q6 |

## Assumptions & Open Questions

- [assumption] See assumptions A-1 to A-4 above; none has been validated yet.
