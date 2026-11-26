# Scope Definition — Questions

Context: `ideation/intent-capture/intent-statement.md` sets the goal and users; `ideation/feasibility/feasibility-assessment.md` and `constraint-register.md` confirm all named tools (Google Workspace, Microsoft 365, Slack, ChatGPT projects) are in the first version, and flag that there is no milestone yet (issue I-1). These questions set the boundary and order of the work. Already-settled choices are not asked again.

## Q1. [Sponsor] When should the first internal demo happen?

The feasibility stage found "as soon as possible" cannot be planned against (issue I-1). A demo date lets us order the work to hit it.

A. In about 2 weeks
B. In about 4 weeks
C. In about 8 weeks
D. Not yet defined
X. Other (please specify)

[Answer]: X. 1 week

## Q2. [Sponsor] How should the metric targets from the intent statement be set?

You accepted the targets as open (daily lookups, share of staff using it, freshness). This says when and how they get numbers.

A. Set them now (give the numbers)
B. Set them during Requirements Analysis
C. Measure a baseline in the first month of use, then set them
D. Not yet defined
X. Other (please specify)

[Answer]: X. this is not important at this stage. We just want a Poc / mvp

## Q3. [Product owner] In what order should the work be built?

A. Value first: one thin end-to-end slice (one source in, approved knowledge, AI and people can ask) before widening
B. Risk first: start with the hardest parts (transcripts, ChatGPT projects access) to remove uncertainty early
C. Foundations first: the knowledge store, history and approvals, then the connections
D. Not yet defined
X. Other (please specify)

[Answer]: X. Whichever bit has the most dependencies on it I think would be the best approach

## Q4. [Product owner] How should people mostly use it day to day?

Your success goal is everyday use that people barely notice. This decides where the main experience lives.

A. Inside tools they already use (a Slack or Teams assistant, ChatGPT or Claude through MCP)
B. A dedicated web app for browsing, editing and approving
C. Both: everyday asking inside existing tools, plus a web app for editing and approving
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Q5. [Product owner] Which of these could wait until after the first usable version? (select all that apply)

Everything else stays a must-have. Moving one of these out shortens the path to the first demo.

A. Freshness tracking and reminders to rule owners
B. The approval step for extracted knowledge (people edit directly at first)
C. Per-organisation privacy and sensitive-data presets (one safe default only at first)
D. None: all are must-have
X. Other (please specify)

[Answer]: D

## Q6. [Product owner] Are there hard deadlines tied to specific capabilities?

A. None
B. Our AI agent rollout needs agent access by a date (please give it)
C. An audit or compliance date needs rule history by a date (please give it)
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q7. [Sponsor] What must the 1-week demo show?

Follow-up to Q1: a demo in 1 week conflicts with the feasibility answer that all four tool connections (Google Workspace, Microsoft 365, Slack, ChatGPT projects) are in the first version, plus a web app and assistants in existing tools. One week fits a narrow slice; the rest follows after the demo.

A. The foundation plus one connection end to end (e.g. Google Drive documents in, approve, ask from Claude/ChatGPT via MCP and the web app)
B. The foundation with file upload only, asked through MCP and the web app; tool connections come after the demo
C. All four connections, shallow (a little from each), with minimal editing
D. Not yet defined
X. Other (please specify)

[Answer]: X. I will give you longer to include all of this. demos are not important.

## Consolidated Summary Confirmation

- Timeline: no fixed date; the 1-week demo is dropped, and you will allow longer so the first version includes everything; demos are not important (Q1, Q7)
- Metric targets: not important at this stage; this is a proof of concept / MVP (Q2)
- Build order: whichever part has the most other parts depending on it comes first (Q3)
- Everyday use: both, asking inside existing tools (Slack/Teams assistant, ChatGPT or Claude through MCP) plus a web app for editing and approving (Q4)
- Must-have: everything, including freshness tracking, the approval step for extracted knowledge, and per-organisation privacy presets; nothing moves out (Q5)
- Hard deadlines: none (Q6)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
