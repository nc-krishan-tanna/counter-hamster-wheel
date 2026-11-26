# Feasibility & Constraints — Questions

Context: the intent statement (`ideation/intent-capture/intent-statement.md`) describes a self-hosted, open-source context engine that captures documents, meeting transcripts and chat, supports manual authoring with approvals, and serves people and AI agents. The product lead's review flagged that this is broad for a minimum viable product and that chat and transcripts carry data-sensitivity risk. These questions find the real constraints.

## Q1. [Sponsor] What time frame do you have for a first usable version?

The breadth of the first version has to fit the time available.

A. A few weeks (first usable version within about a month)
B. About three months
C. Six months or more
D. Not yet defined
X. Other (please specify)

[Answer]: X. asap really

## Q2. [Sponsor] Who is building it?

Team size decides how much of the first version is realistic.

A. Just me, working with AI coding assistants
B. A small team (2 to 5 people)
C. A larger team (6 or more)
D. Not yet defined
X. Other (please specify)

[Answer]: X. 3 tech leads and everyone is using AI

## Q3. [Sponsor] Are there organisational blockers to connecting company tools?

Pulling from chat, meetings and drives usually needs admin consent.

A. None that I know of; I can approve connections myself
B. IT or security must approve each connection to company tools
C. Competing priorities may slow the work
D. Not yet defined
X. Other (please specify)

[Answer]: X. I dont think so, we have sudo access to our machines. There is a CTO who control "access" but i do not anticipate any blockers

## Q4. [Engineering] Which existing tools must the first version connect to? (select all that apply)

You chose documents, meeting transcripts and chat as first sources; this names the actual products.

A. Google Workspace (Drive, Docs, Meet)
B. Microsoft 365 (SharePoint, OneDrive, Teams)
C. Slack
D. Not yet defined
X. Other (please specify, e.g. Confluence, Notion, Zoom)

[Answer]: A, B, C. X. ChatGPT projects, any store of data needs to easily integrate.

## Q5. [Engineering] What tech stack and skills does the team have?

A. TypeScript / Node.js
B. Python
C. Java, Kotlin or .NET
D. Not yet defined
X. Other (please specify)

[Answer]: X. The main stack probs the js ecosystem but we can use other technologies too if it is better?

## Q6. [Engineering] Where should an organisation's own copy run?

Each organisation runs its own copy, so hosting must suit many organisations.

A. On AWS (we already use AWS accounts)
B. Anywhere: packaged as containers for any cloud or on-premises
C. Locally on a laptop or a single small server first
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q7. [Engineering] Which AI models may process organisation content?

Extraction and answering need a language model; where it runs decides what data leaves the organisation.

A. Hosted model APIs (for example Claude or OpenAI) are fine
B. Only models the organisation runs itself, so content never leaves
C. Pluggable: each organisation chooses hosted or self-run
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Q8. [Compliance] Which regulations or standards apply? (select all that apply)

A. Privacy law for personal data (for example GDPR or the Australian Privacy Act)
B. Security certifications the organisation holds (for example SOC 2 or ISO 27001)
C. None known
D. Not yet defined
X. Other (please specify)

[Answer]: X. allow people to decide between the privacy laws and security classfications

## Q9. [Compliance] How should sensitive content in chat and meeting transcripts be handled?

Chat and transcripts often contain personal or confidential remarks that should not become organisation-wide knowledge.

A. Capture only channels and meetings that are explicitly opted in
B. Remove or mask personal and sensitive data before anything is stored
C. Capture everything; restrict who can see it by role
D. Not yet defined
X. Other (please specify)

[Answer]: X. let people decide how they configure their organisation

## Q10. [Sponsor] With "asap" in mind, how should the connections arrive?

Follow-up to Q1 and Q4: you want the first version as soon as possible, and you want Google Workspace, Microsoft 365, Slack, ChatGPT projects and "any store of data" to integrate easily. Each tool is a separate connection to build and test, so delivering all of them at once conflicts with "asap".

A. First version ships a simple way to add new connections, plus one or two connections; the rest follow one by one
B. First version ships file upload and the MCP interface only; tool connections come next
C. All the named tools in the first version, even if it takes longer
D. Not yet defined
X. Other (please specify which connections come first)

[Answer]: C

## Consolidated Summary Confirmation

- Timeline: as soon as possible (Q1), but all named tools come in the first version even if that takes longer (Q10)
- Team: 3 tech leads, everyone using AI assistants (Q2)
- Blockers: none expected; you have admin access to your machines, and a CTO controls access to company tools (Q3)
- Connections in the first version: Google Workspace, Microsoft 365, Slack and ChatGPT projects; any store of data must be easy to integrate (Q4, Q10)
- Stack: mainly the JavaScript/TypeScript ecosystem, open to other technologies where better (Q5)
- Hosting: each organisation runs its own copy anywhere, packaged as containers (Q6)
- AI models: pluggable; each organisation chooses hosted or self-run models (Q7)
- Regulations: each organisation chooses which privacy laws and security classifications apply (Q8)
- Sensitive content in chat and transcripts: each organisation configures how it is handled (Q9)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
