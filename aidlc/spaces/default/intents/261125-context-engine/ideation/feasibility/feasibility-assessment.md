# Feasibility Assessment: Organisational Context Engine

Input: `ideation/intent-capture/intent-statement.md` (intent-statement), plus the answers in `feasibility-questions.md`. No market research was run for this plan.

## Verdict

**Feasible, with conditions.** The engine is technically achievable by the planned team. The main threat is not technology: it is the breadth of the first version (four tool connections plus authoring, approvals, extraction and AI access) set against an "as soon as possible" time frame. The conditions below keep that risk visible.

## What makes it feasible

| Factor | Why it helps | Source |
|---|---|---|
| Team of 3 tech leads, all using AI assistants | Enough senior capacity to build several connections in parallel | Q2 |
| No expected organisational blockers; admin access to machines | Work can start without waiting on approvals for local development | Q3 |
| Each organisation runs its own copy, packaged as containers | No shared multi-organisation service to secure and operate in the first version | intent-statement Q13, Q6 |
| Simple roles only in the first version | Avoids a complex permission model early | intent-statement Q10 |
| Pluggable AI models | No dependency on one AI vendor; organisations that cannot send content out can use their own models | Q7 |
| Team's main skills are in the JavaScript/TypeScript ecosystem | The named tools all offer developer kits for that ecosystem (assumption, to verify per tool) | Q5 |

## Technical viability by capability

| Capability (from the intent statement) | Viability | Main uncertainty |
|---|---|---|
| Manual authoring with change proposals and approvals | High | Making it easy for non-technical people (the intent statement's "easy to use") |
| Capture from documents and files (Google Workspace, Microsoft 365) | High | Admin consent in each organisation's Google and Microsoft accounts |
| Capture from meeting transcripts | Medium | Transcripts exist only where meetings were transcribed; access rules differ per product |
| Capture from chat (Slack, Microsoft Teams) | Medium | Volume and noise; sensitive remarks; workspace admin approval |
| Capture from ChatGPT projects | Low (hypothesis) | It is not confirmed that ChatGPT project content can be read automatically; it may need a manual export |
| "Any store of data" easy to integrate | Medium | Needs a standard way to add new connections, otherwise each one is custom work |
| AI agents reading the knowledge (MCP and similar) | High | Keeping answers tied to their sources so agents can be trusted |
| Per-organisation privacy and sensitive-data settings | Medium | Settings must be simple enough for non-technical administrators |

## Risk analysis (summary)

The full list is in `raid-log.md`. The top three:

1. **Scope versus time.** "As soon as possible" (Q1) with all named tools in the first version (Q10). Mitigation: build the connections in parallel behind one shared way of adding connections, and agree a date for a first internal demo.
2. **Sensitive content.** Chat and transcripts hold personal and confidential remarks (product lead review finding R-03). Each organisation configures handling (Q9), so the first version must ship safe defaults.
3. **ChatGPT projects access.** May not be possible automatically (hypothesis). Mitigation: verify early; fall back to file export.

## Conditions for proceeding

- Scope Definition sets a date or milestone for the first usable internal version, because "as soon as possible" cannot be planned against. (Q1)
- ChatGPT projects access is verified before it is committed to the first version. (Q4)
- The first version ships safe defaults for sensitive content that organisations can change. (Q9)
- The metric targets accepted as open in the intent statement are set before requirements are finalised. (intent-statement)

## Assumptions & Open Questions

- [assumption] Every named tool (Google Workspace, Microsoft 365, Slack) offers an official way for an approved app to read documents, transcripts and messages, given admin consent.
- [assumption] ChatGPT projects may have no automated read access; a manual export may be the only route. This is a hypothesis to verify.
- [assumption] The CTO will grant the admin consents needed in your own organisation's tools, as you expect no blockers.
