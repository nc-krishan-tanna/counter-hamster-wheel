# Requirements: Organisational Context Engine

Inputs: `ideation/intent-capture/intent-statement.md` (intent-statement), `ideation/scope-definition/scope-document.md` (scope-document), `inception/practices-discovery/team-practices.md` (team-practices), the rough mockups (`ideation/rough-mockups/wireframes.md`, `user-flow.md`), feasibility (`ideation/feasibility/constraint-register.md`) and the answers in `requirements-analysis-questions.md` (Q1 to Q10).

## Intent analysis

The organisation's knowledge is scattered, its rules change without a record, and AI tools answer without trustworthy company context (intent-statement). The goal is a self-hosted, open-source engine that becomes the organisation's living reference: it captures business rules, processes, the organisational map and decisions from people and from the tools they already use; it makes every change accountable through owner approval and a full history; and it serves that knowledge every day to people and AI agents, often without them noticing (intent-statement, scope-document). The experience must be as frictionless as possible while keeping accountability built in (Q9).

- **Type:** new product (greenfield)
- **Scope:** system-wide; many components
- **Complexity:** complex (several integrations, AI extraction, 3D visualisation)
- **Depth:** Standard

## Glossary

| Term | Meaning |
|---|---|
| Item | One piece of knowledge: a business rule or policy, process, glossary term, person, team, system or decision |
| Link | A typed relationship between two items (for example "rule governs process", "team owns system") |
| Proposal | A suggested change to one or more items that must be approved before it takes effect, like a pull request |
| Owner | The person accountable for an item; approves proposals that change it |
| Source | Where content came from: a connected tool (Drive, SharePoint, Slack, Teams, Meet, ChatGPT projects), a file upload, a person, or an AI agent |
| Blast radius | The set of items a proposal would affect, directly or through links |

## Functional requirements

### FR1 Knowledge items and links

- **FR1.1** The system shall store items of these types: business rule or policy, process, glossary term, person, team, system, decision. (intent-statement)
- **FR1.2** Each item shall have a title, content, type, owner (optional), review period, and the sources it came from. (intent-statement, Q7)
- **FR1.3** The system shall store typed links between items, and every item page and every answer shall show an item's links. (Q7 of rough mockups: "how knowledge is linked" is what matters most)
- **FR1.4** An item with no owner shall be visibly marked "unowned" and its proposals routed per FR3.3. (Q9)

**Acceptance criteria**
- Given a Contributor creates a business rule linked to a process and a team, when it is approved, then the rule page lists both links and each linked item lists the rule.
- Given an item has no owner, when anyone views it, then it is marked "unowned".

### FR2 History and accountability

- **FR2.1** Every approved change shall record who proposed it, who approved it, when, why (a reason is required), and the before and after content. (intent-statement)
- **FR2.2** Each item shall show a timeline of its changes in plain language, with before and after on demand. (rough mockups Q3)
- **FR2.3** Rejected proposals and requests for changes shall keep the approver's reason in the history. (user-flow)

**Acceptance criteria**
- Given an approved change, when a Reader opens the item's history, then they see the proposer, approver, time, reason and a before/after view.
- Given an approver rejects a proposal without a reason, when they submit, then the system refuses and asks for a reason.

### FR3 Proposals and approval

- **FR3.1** All changes to items shall go through a proposal; nothing changes approved knowledge without approval. (scope-document, Q4)
- **FR3.2** Proposals shall be raised from three origins: a person editing in the web app, extraction from a connected source (FR6), and an AI agent through MCP (FR7). Each proposal shows its origin. (scope-document, Q4)
- **FR3.3** A proposal shall be approved by the owner of each affected item. For an unowned item, any Approver or Admin may approve. (Q3, Q9)
- **FR3.4** The approver shall be able to Approve, Request changes, or Reject. (wireframes S4)
- **FR3.5** If an item changed after a proposal was raised against it, the proposal shall be marked out of date and the approver shall see both versions before deciding. (user-flow Flow 2)
- **FR3.6** Proposals shall appear in a Reviews inbox, filterable to "mine" (proposals waiting for my approval). (wireframes S4)

**Acceptance criteria**
- Given a proposal changes an item owned by the Finance lead, when a different Approver tries to approve it, then the system refuses.
- Given a proposal changes an unowned item, when an Approver approves it, then the change is applied and the history names that Approver.
- Given an item changed after a proposal was raised, when the owner opens the proposal, then it is marked out of date and shows both versions.

### FR4 Risk and blast-radius assessment

- **FR4.1** Every proposal shall show, before approval, the items it would affect directly and through one further link. (Q10)
- **FR4.2** Every proposal shall show a risk level (Low, Medium, High) with the reasons, based at least on: the type of item changed, the number of affected items, and whether it conflicts with another approved item. (Q10)
- **FR4.3** The assessment shall flag any approved item that the proposed change appears to contradict. (Q10)
- **FR4.4** The what-if sandbox (FR9.6) shall use the same assessment. (rough mockups Q9)

**Acceptance criteria**
- Given a proposal to change a rule linked to 2 processes, 1 system and 1 decision, when the owner opens it, then all 4 items are listed as affected with a risk level and reasons.
- Given a proposal that contradicts an approved rule, when the assessment runs, then the contradiction is flagged and the risk level is at least Medium.
- Given the assessment cannot run (for example the AI model is unavailable), when the owner opens the proposal, then it says "assessment unavailable" and still lists the directly linked items.

### FR5 Connections to sources

- **FR5.1** The system shall provide a standard way to add a new source connection without changing the core. (scope-document)
- **FR5.2** Google Workspace connection: documents and files in Drive, and Meet transcripts. (scope-document)
- **FR5.3** Microsoft 365 connection: documents and files in SharePoint and OneDrive, Teams chat, and Teams meeting transcripts. (scope-document)
- **FR5.4** Slack connection: messages in channels the organisation chooses. (scope-document)
- **FR5.5** ChatGPT projects connection: read project content automatically if access exists; otherwise import an exported file. (scope-document, feasibility)
- **FR5.6** File upload: people can upload documents directly. (scope-document)
- **FR5.7** Settings shall show each connection's status and last successful sync, and a failure shall name the connection and the reason. (wireframes S1, corner checklist)
- **FR5.8** A failing connection shall not stop the others from syncing. (corner checklist)

**Acceptance criteria**
- Given Slack is connected, when the Slack connection fails, then Google and Microsoft keep syncing and Settings shows Slack's error and last good sync time.
- Given a new connection is added through the standard way, when it is enabled, then its content flows into extraction with no change to the core.

### FR6 Extraction into proposals

- **FR6.1** The system shall turn new or changed content from connected sources into proposals that create or change items, with suggested links. (scope-document)
- **FR6.2** Each extracted proposal shall carry the excerpt it was built from and a link to the original. (intent-statement, Q8)
- **FR6.3** Content already captured shall not produce a duplicate proposal. (corner checklist)
- **FR6.4** The AI model used for extraction shall be chosen by the organisation: hosted or self-run. (constraint-register)

**Acceptance criteria**
- Given someone posts a rule change in a connected Slack channel, when extraction runs, then a proposal appears in the owner's inbox within the NFR1 time, with the message excerpt and a link to it.
- Given the same message is synced twice, when extraction runs, then only one proposal exists.

### FR7 AI access through MCP

- **FR7.1** The system shall expose an MCP server that lets AI agents search and read items, their links, owners, freshness and sources. (scope-document)
- **FR7.2** Answers through MCP shall distinguish approved knowledge from pending proposals. (Q4)
- **FR7.3** AI agents shall be able to raise proposals through MCP, which a person must approve. (Q4)
- **FR7.4** An agent's access shall be tied to a user or service account and limited by that account's role. (corner checklist)

**Acceptance criteria**
- Given Claude is connected through MCP, when it asks "what is our discount limit?", then it receives the approved rule with its owner and source.
- Given an agent raises a proposal through MCP, when it is submitted, then it appears in the owner's inbox marked as from an AI agent and nothing changes until approved.

### FR8 Asking from Slack and Teams

- **FR8.1** People shall be able to ask questions in Slack and in Microsoft Teams and receive an answer from approved knowledge with its source and approval details. (scope-document, wireframes S8)
- **FR8.2** When nothing approved matches, the assistant shall say so and offer to raise the gap for an owner. (user-flow Flow 3)
- **FR8.3** When the source item is stale, the answer shall say when it was last reviewed. (user-flow Flow 3)

**Acceptance criteria**
- Given an approved rule exists, when someone asks about it in Slack, then the reply quotes it, names its owner and links to it in the web app.
- Given nothing matches, when someone asks, then the reply says so and offers to raise a gap.

### FR9 Web app

- **FR9.1** The home screen shall be a 3D, tree-like, neuron-style map of items and links. People can rotate, zoom, and select a node to open it. (rough mockups Q1, Q8)
- **FR9.2** The map shall support filtering and colouring by type, team and owner, and search that jumps to a node. (rough mockups Q8)
- **FR9.3** A timeline shall replay how the map changed over time and highlight recent and stale items. The replay can be paused. (rough mockups Q8)
- **FR9.4** A side panel kept in sync with the map, plus a full list or tree view, shall give all the same information and actions without the 3D view. (rough mockups Q10)
- **FR9.5** The item page shall show content, why, sources, links, owner, freshness, and an AI-generated summary of the item's life. (rough mockups Q8)
- **FR9.6** A simulate screen shall let a person try a change in a sandbox, see its blast radius (FR4), and run AI scenarios through a process; nothing changes until they turn it into a proposal. (rough mockups Q9)
- **FR9.7** People shall create and edit items, choose links, and submit proposals from the web app. (scope-document)
- **FR9.8** The web app shall look clean and neutral. (rough mockups Q4)

**Acceptance criteria**
- Given 2,000 items, when a person filters by Team = Finance, then only Finance items stay highlighted on the map and in the side panel.
- Given a keyboard-only user, when they use the list view, then they can find, open and propose a change to any item.
- Given a person runs a what-if change, when they exit without converting it, then no item or proposal is created.

### FR10 Freshness

- **FR10.1** Each item shall have its own review period, set when it is created. (Q7)
- **FR10.2** When an item passes its review period, it shall be marked stale and its owner reminded. Unowned stale items go to Approvers and Admins. (Q7, Q9)
- **FR10.3** Owners shall see a list of their items that are stale or due soon. (scope-document, freshness tracking)
- **FR10.4** Re-confirming an item without changing it shall reset its review date and be recorded in the history. (assumption: see Assumptions)

**Acceptance criteria**
- Given an item with a 30-day review period last reviewed 31 days ago, when the daily check runs, then the item is marked stale and its owner is reminded.

### FR11 Sign-in and roles

- **FR11.1** People shall sign in with Google Workspace or Microsoft 365 single sign-on, or with email and password. (Q1)
- **FR11.2** Email and password sign-in shall use an established authentication library or service, not custom-built authentication. (Q1)
- **FR11.3** The system shall have four roles. (Q2, Q9)

| Role | Can do |
|---|---|
| Reader | View, search, ask |
| Contributor | Reader, plus propose changes |
| Approver | Contributor, plus approve proposals for unowned items, and be made an owner |
| Admin | Everything, plus manage connections, privacy, AI model, people and roles |

- **FR11.4** Any role may be made an item's owner except Reader. (assumption: see Assumptions)
- **FR11.5** Role checks shall apply to every read and write, including search, MCP and the chat assistants. (corner checklist)

**Acceptance criteria**
- Given a Reader, when they try to raise a proposal through the web app or MCP, then the system refuses.

### FR12 Organisation settings

- **FR12.1** Admins shall choose which privacy laws and security classifications apply, from presets. (constraint-register RC-1)
- **FR12.2** Admins shall configure how sensitive content from chat and transcripts is handled. The default keeps all raw content, visible only to Admins; excerpts behind items follow the item's visibility. (constraint-register RC-2, Q8)
- **FR12.3** Admins shall configure the AI model: a hosted provider or a self-run endpoint. (constraint-register TC-3)
- **FR12.4** Admins shall choose which channels, folders and meetings each connection reads. (feasibility R-2)

### FR13 Self-hosting

- **FR13.1** The engine shall be delivered as container images that run on any container host. One installation serves one organisation. (constraint-register TC-1, TC-2)
- **FR13.2** A first run with no data shall guide an Admin through sign-in setup, the AI model and the first connection. (corner checklist)

## Non-functional requirements

| ID | Requirement | Measure | Source |
|---|---|---|---|
| NFR1 | New or changed content in a connected source becomes a proposal quickly | 95% of proposals appear within 5 minutes of the content being saved in the source | Q6 |
| NFR2 | Answers through MCP, Slack and Teams are quick | 95% of answers return within 5 seconds | intent-statement (everyday use), assumption |
| NFR3 | The 3D map stays usable | At least 30 frames per second on a standard desktop browser with 10,000 items; list view loads in under 2 seconds | rough mockups, assumption |
| NFR4 | Sized for small organisations, ready to grow | Runs for an organisation of 100 people on one host; the web and API services hold no local state, so a second copy can run alongside without code changes | Q5 |
| NFR5 | Security | All traffic encrypted in transit; secrets read from the environment or a secret store, never from the repository; role checks enforced on the server for every request | constraint-register, project rules |
| NFR6 | Privacy | Raw source content visible only to Admins by default; logs never contain item or source content | Q8 |
| NFR7 | Accessibility | Web app meets WCAG 2.1 AA; every map function is available in the list or side panel | rough mockups Q6, Q10 |
| NFR8 | Responsive | Web app works on screens from 320 px wide to large desktop | rough mockups Q5 |
| NFR9 | Accountability | History cannot be edited or deleted by any role through the product | intent-statement, Q9 |
| NFR10 | Reliability | No approved change is lost if a service stops mid-write; a failing connection or AI model does not stop approvals, browsing or answering from approved knowledge | corner checklist |
| NFR11 | Quality | Tests written first; at least 80% line coverage; CI runs tests on every change and a failure blocks the merge | team-practices |
| NFR12 | Portability | All parts run as containers; no dependency on one cloud provider | constraint-register TC-2 |
| NFR13 | Observability | Each service has a health check; error rate, sync status per connection and proposal latency are measurable | team-practices (done means healthy) |

## Constraints

- One organisation per installation; open-source; self-hosted as containers. (constraint-register)
- TypeScript and Rust; GitHub, GitHub Actions and GitHub Container Registry. (team-practices)
- Pluggable AI models: hosted or self-run. (constraint-register)
- Simple roles only; no fine-grained permissions. (intent-statement)
- Project rules: NEVER commit secrets, keys or real organisation content; NEVER commit straight to main. (project rules)

## Assumptions

| ID | Assumption | Reason |
|---|---|---|
| A1 | "Fairly quick, like raising a PR" means within 5 minutes for 95% of proposals (NFR1) | A testable threshold is required; 5 minutes matches "a few minutes" |
| A2 | Answer and map performance targets (NFR2, NFR3) are reasonable defaults, not stated by you | Inception requires measurable targets |
| A3 | Re-confirming an unchanged item resets its review date (FR10.4) | Owners need a quick way to say "still true" without a fake edit |
| A4 | Contributors, Approvers and Admins can be owners; Readers cannot (FR11.4) | An owner must be able to propose; follows the role model you left to me |
| A5 | Metric targets from the intent statement stay unset for this MVP | You said they are not important at this stage |
| A6 | ChatGPT projects automated access is unconfirmed; file import is the fallback (FR5.5) | Feasibility hypothesis |

## Out of scope

- Fine-grained permissions beyond the four roles. (intent-statement)
- One shared hosted service for many organisations. (intent-statement)
- Fixed success-metric targets. (scope-document)
- Live activity animation of the map ("neurons firing"); deprioritised. (rough mockups Q9)

## Open questions

- Which parts are written in Rust. (team-practices) To settle in design.
- Whether GitHub branch protection enforces "never commit straight to main". (practices evidence)
- The exact rules behind the risk level (FR4.2) are set in functional design.
