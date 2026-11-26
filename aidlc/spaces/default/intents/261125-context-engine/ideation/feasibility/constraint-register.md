# Constraint Register: Organisational Context Engine

Input: `ideation/intent-capture/intent-statement.md` (intent-statement) and `feasibility-questions.md`.

## Technical constraints

| ID | Constraint | Type | Source |
|---|---|---|---|
| TC-1 | Each organisation runs its own copy; one organisation per installation | Fixed | intent-statement Q13 |
| TC-2 | Must run anywhere, packaged as containers (any cloud or on-premises) | Fixed | Q6 |
| TC-3 | AI models are pluggable; each organisation chooses hosted or self-run | Fixed | Q7 |
| TC-4 | First version connects to Google Workspace, Microsoft 365, Slack and ChatGPT projects | Fixed (subject to RAID A-2) | Q4, Q10 |
| TC-5 | Any store of data must be easy to integrate | Fixed | Q4 |
| TC-6 | Knowledge must be readable by AI agents (MCP integration named in the intent) | Fixed | intent-statement Q5 |
| TC-7 | Main stack is the JavaScript/TypeScript ecosystem; others allowed where better | Preference | Q5 |
| TC-8 | Simple roles only; no fine-grained permissions in the first version | Fixed | intent-statement Q10 |

## Organisational constraints

| ID | Constraint | Type | Source |
|---|---|---|---|
| OC-1 | Built by 3 tech leads, all using AI assistants | Fixed | Q2 |
| OC-2 | Time frame: as soon as possible, accepting a longer time to include all named tools | Flexible | Q1, Q10 |
| OC-3 | Access to company tools is controlled by the CTO | Fixed | Q3 |
| OC-4 | The sponsor decides scope and priority | Fixed | intent-statement Q8 |
| OC-5 | Released as open source after internal use | Fixed | intent-statement Q2 |

## Regulatory and data constraints

| ID | Constraint | Type | Source |
|---|---|---|---|
| RC-1 | Each organisation chooses which privacy laws and security classifications apply | Fixed | Q8 |
| RC-2 | Each organisation configures how sensitive content in chat and transcripts is handled | Fixed | Q9 |

## Assumptions & Open Questions

- [assumption] No regulation is mandated for the first internal deployment beyond what your own organisation chooses under RC-1.
