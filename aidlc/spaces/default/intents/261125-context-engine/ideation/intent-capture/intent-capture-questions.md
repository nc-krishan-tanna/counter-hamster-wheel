# Intent Capture & Framing — Questions

## Sources

- [desc] Initial description: "Build a context engine which is useable across technical and non technical people to gather business and technical intelligence for human and AI consumption. A github for non code and business rules. This engine will gather and maintain the dna of the business or organisation"
- [scope] Workflow-selected scope: `mvp`.

## Q1. [Product owner] Which business problems hurt most today? (select all that apply)

Your description says the engine should capture the "DNA" of the organisation. Knowing which pain is sharpest tells us what the first version must fix first.

A. Knowledge is scattered across docs, chats, wikis and people's heads, so nobody can find the current truth
B. Business rules and decisions change without a record of who changed what, when, and why
C. AI assistants and agents give wrong answers because they lack trustworthy company context
D. Not yet defined
X. Other (please specify)

[Answer]: A, B, C

## Q2. [Product owner] Who is the first customer of this engine?

The first group to use it shapes the design. "Technical and non-technical people" could mean very different first users.

A. Internal teams in our own organisation (we build it for ourselves)
B. External customers: we sell this as a product to other organisations
C. Internal first, with a plan to sell it externally later
D. Not yet defined
X. Other (please specify, e.g. one named team or department)

[Answer]: X. Internal first, then open source it

## Q3. [Product owner] Which kinds of people (or systems) need to put knowledge in and get it out on day one? (select all that apply)

The "GitHub for non-code" idea implies contributors, approvers and readers. Who matters first decides how simple the editing experience must be.

A. Non-technical business people and leaders (operations, finance, HR, sales, managers) writing, approving and reading rules and processes
B. Technical people (engineers, architects) recording technical decisions and system knowledge
C. AI agents and assistants reading the knowledge automatically (for example through an API or MCP)
D. Not yet defined
X. Other (please specify)

[Answer]: A, B, C

## Q4. [Product owner] What kinds of knowledge must the first version hold? (select all that apply)

"Business and technical intelligence" is broad; this narrows what the first version stores.

A. Business rules and policies (for example pricing rules, approval limits, eligibility rules)
B. Processes, glossary and an organisational map (how work gets done; people, teams and systems and how they relate)
C. Decisions and their reasoning (why we chose something, like business or architecture decision records)
D. Not yet defined
X. Other (please specify)

[Answer]: A, B, C

## Q5. [Product owner] How should knowledge get into the engine in the first version?

You said the engine will "gather and maintain" knowledge. This decides whether people write it, or the engine pulls it from somewhere.

A. People write and edit it directly, with change proposals and approvals (like pull requests)
B. The engine imports or extracts it from existing sources (documents, wikis, Slack, code repos) and people review it
C. Both: manual authoring plus automated extraction that people approve
D. Not yet defined
X. Other (please specify)

[Answer]: X. Both and mcp integration and transcripts and all the different communication touchpoints that people have in an organisation. It needs to be easy for people to use

## Q6. [Product owner] What does success look like after the first version is in use?

Success must be measurable. Pick the measure that matters most; give a target number if you have one.

A. Time to find a trustworthy answer drops (for example from hours to minutes)
B. Share of key business rules that are captured, owned and up to date (for example 80% of a named set)
C. AI answers that use the engine are rated correct more often than without it
D. Not yet defined
X. Other (please specify, including a target number if you have one)

[Answer]: X. somethings thats used every day but people dont know that they're using it and it is capturing the dna of the organisation and becomes and reference point and evolving snapshot of the orgnisation

## Q7. [Sponsor] Why now: what triggered this initiative?

The trigger tells us what deadline or pressure the first version must meet.

A. We are rolling out AI agents and they need reliable company context
B. Knowledge loss: people leaving, slow onboarding, tribal knowledge
C. Audit, compliance or governance pressure to show who owns which rule and when it changed
D. Not identified
X. Other (please specify, e.g. a product opportunity)

[Answer]: A, B, C. X. We are wanting a project that many organisations can benefit from

## Q8. [Sponsor] Who are the key stakeholders, and who decides scope and priority?

We will not invent stakeholders. Name the roles (no personal names needed) and say who has the final say.

A. I am the sponsor and decision-maker; others influence but I decide
B. A product owner decides; engineering and business leads influence
C. A steering group or leadership team decides together (please name the roles)
D. Not yet defined
X. Other (please specify the roles and who decides)

[Answer]: A

## Q9. [Sponsor] Are there communication or reporting needs for this initiative?

A. No formal reporting: keep it informal for now
B. Regular updates to a sponsor or leadership (please say how often)
C. A demo at the end of each build increment
D. Not applicable
X. Other (please specify)

[Answer]: A

## Q10. [Product owner] What should this first version deliberately NOT do? (select all that apply)

The plan is already set to a minimum viable product. This asks what the product itself leaves out of the first version.

A. No automated extraction from external tools (Slack, email, Drive) yet: manual entry and file import only
B. No multi-organisation hosting yet: one organisation only
C. No fine-grained permissions yet: simple roles only
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Q11. [Product owner] Which communication touchpoints should the first version capture from? (select all that apply)

Follow-up to Q5: you want manual authoring, extraction, MCP integration, transcripts and "all the different communication touchpoints". Every source is a separate integration, so the first version needs a starting set; the rest follow later.

A. Documents and files (shared drives, wiki pages, PDFs, Markdown)
B. Meeting transcripts (Zoom, Teams, Google Meet recordings or transcript files)
C. Chat (Slack, Microsoft Teams channels)
D. Not yet defined
X. Other (please specify, e.g. email, ticketing tools, code repos)

[Answer]: A, B, C

## Q12. [Product owner] How will we measure that the engine is used every day and stays a current snapshot?

Follow-up to Q6: your goal is everyday use that people barely notice, and an evolving snapshot of the organisation. To check that, we need at least one number to track.

A. Daily lookups served to people and AI tools (for example at least N lookups per working day)
B. Share of staff whose everyday tools draw on the engine each week (for example 50% of an organisation)
C. Freshness: share of captured rules and processes with an owner and reviewed in the last N days (for example 80% within 90 days)
D. Not yet defined
X. Other (please specify, including a target number if you have one)

[Answer]: A, B, C

## Q13. [Product owner] How will other organisations use the first version?

Follow-up to Q2, Q7 and Q10: you want to use it internally first, then open source it so many organisations benefit, and you did not exclude multi-organisation hosting. This decides whether the first version serves one organisation per installation or many at once.

A. Each organisation runs its own copy (open source, one organisation per installation)
B. One shared hosted service that serves many organisations, kept separate from each other
C. Internal use only in the first version; how others use it is decided later
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Problems: scattered knowledge, untracked changes to rules and decisions, and AI lacking trustworthy company context (Q1)
- First customer: internal first, then open source it (Q2); each organisation runs its own copy (Q13)
- Day-one users: business people and leaders, technical people, and AI agents (Q3)
- Knowledge held: business rules and policies; processes, glossary and org map; decisions and reasoning (Q4)
- Intake: manual authoring with approvals plus automated extraction, MCP integration, transcripts and all communication touchpoints; must be easy to use (Q5); first sources are documents and files, meeting transcripts, and chat (Q11)
- Success: used every day almost invisibly, capturing the organisation's DNA as an evolving reference snapshot (Q6), measured by daily lookups, share of staff using it, and freshness of rules (Q12)
- Trigger: AI agent rollout, knowledge loss, and compliance pressure; a project many organisations can benefit from (Q7)
- Decision-maker: you (Q8); no formal reporting (Q9)
- First version leaves out fine-grained permissions: simple roles only (Q10)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

## Assumption Confirmation

The artifacts carry these open items, marked as assumptions:

- Target values for the three success metrics (daily lookups, share of staff using it, freshness window and percentage) are not yet set; they are to be agreed in a later stage. [assumption]
- The specific people or roles who influence the sponsor's decisions are not yet named. [assumption]

A. Accept assumptions
B. Convert to follow-up questions

[Answer]: A. Accept assumptions
