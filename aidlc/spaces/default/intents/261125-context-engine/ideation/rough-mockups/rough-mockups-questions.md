# Rough Mockups — Questions

Context: `ideation/intent-capture/intent-statement.md`, `ideation/scope-definition/scope-document.md` and `ideation/scope-definition/intent-backlog.md` set two everyday surfaces: asking from inside existing tools (Slack or Teams assistant, ChatGPT or Claude through MCP), and a web app for browsing, editing and approving. These questions shape the rough screens and flows.

## Q1. [Product owner] What should people see first when they open the web app?

The first screen sets what the product feels like.

A. A single "ask the organisation" box with recent answers
B. A review inbox: proposed changes waiting for approval
C. Browse by type: rules, processes, org map, decisions
D. Not yet defined
X. Other (please specify)

[Answer]: X. A visual representation of the data - something like the open source project archify on github. The only problem with archify is it is a 2d representation and not 3d. We want a 3d thing of a tree like neuron style linking of data.

## Q2. [Product owner] Which flow matters most to get right first?

A. Capture to approval: content found in a tool becomes a proposal, someone approves it, and it becomes knowledge
B. Asking: someone asks in Slack or Claude and gets an answer with its sources
C. Editing: someone changes a rule and submits it for approval
D. Not yet defined
X. Other (please specify)

[Answer]: X. context structure

## Q3. [Product owner] How should "what changed" be shown to non-technical people?

The history of who changed what, when and why is central to the product, and it must make sense to people who have never used GitHub.

A. Before and after side by side, with changes highlighted
B. A timeline of changes with plain-language summaries
C. Both: timeline first, before/after on demand
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Q4. [Designer] Are there brand guidelines or a design system to follow?

A. None: a clean, neutral look suitable for an open-source product
B. Our company's brand guidelines (please say where they are)
C. Let each organisation apply its own logo and colours
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q5. [Designer] Which devices must the web app support?

A. Desktop browser only; phones use the chat assistants
B. Desktop and mobile browsers
C. Desktop, tablet and mobile browsers
D. Not yet defined
X. Other (please specify)

[Answer]: X. build a fully responsive site that works across the board. Most users will likely be desktop

## Q6. [Designer] What accessibility level is required?

A. WCAG 2.1 AA (the common standard)
B. WCAG 2.2 AA (the newer version)
C. No formal requirement
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q7. [Product owner] By "context structure", which do you mean?

Follow-up to Q2: "context structure" could mean a few different things, and each leads to a different first mockup.

A. How knowledge items are organised and linked (a rule links to the process, team, system and decision it belongs to)
B. How the web app's sections and navigation are laid out
C. How the knowledge is packaged for AI agents when they ask
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q8. [Product owner] What should people be able to do in the 3D view? (select all that apply)

Follow-up to Q1: a 3D, tree-like, neuron-style map of linked knowledge as the first screen.

A. Fly around, zoom, and click a node to open that rule, process, person or decision
B. Filter and colour by type, team or owner, and search to jump to a node
C. See change over time: replay how the map grew, and highlight recent or stale items
D. Not yet defined
X. Other (please specify)

[Answer]: A, B, C. X. ai powered querying to summarise a nodes life. Environment simulating.

## Q9. [Product owner] By "environment simulating", which do you mean?

Follow-up to Q8: this could mean a few different things.

A. "What if": change a rule in a sandbox and see which processes, teams, systems and decisions it would affect, before proposing it
B. A live view: the map animates as knowledge is used and changed, like activity moving through neurons
C. Running scenarios: AI walks through how a process would play out under the current rules
D. Not yet defined
X. Other (please specify)

[Answer]: A, B, C. X. 1,2,3 (2 is less important for now!)

## Q10. [Designer] How should people who cannot use the 3D map get the same information?

Follow-up to Q1 and Q6: a 3D map cannot be fully used by keyboard or screen reader on its own, and WCAG 2.1 AA requires every function to work that way. Something alongside it has to carry the same information.

A. A linked list or tree view beside the map, kept in sync, that works fully by keyboard and screen reader
B. A switch between the 3D map and a 2D or list view
C. Both: a synced side panel plus a switch to a full list view
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Consolidated Summary Confirmation

- Home screen: a 3D, tree-like, neuron-style map of linked knowledge, like archify but in 3D (Q1)
- Most important to get right: how knowledge is linked (a rule links to its process, team, system and decision) (Q2, Q7)
- In the map: explore and open nodes; filter, colour and search; change over time; AI-powered summary of a node's life; environment simulation (Q8)
- Environment simulation: what-if sandbox and running AI scenarios; the live activity view is less important for now (Q9)
- Change history: timeline first, before/after on demand (Q3)
- Look: clean and neutral, suited to open source (Q4)
- Devices: fully responsive across all devices; most users on desktop (Q5)
- Accessibility: WCAG 2.1 AA, with a synced list/tree side panel plus a switch to a full list view (Q6, Q10)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
