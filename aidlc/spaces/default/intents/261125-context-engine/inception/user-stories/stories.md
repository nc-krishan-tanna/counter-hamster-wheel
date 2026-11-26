# User Stories

Inputs: `inception/requirements-analysis/requirements.md` (FR and NFR IDs), `personas.md`, `inception/practices-discovery/team-practices.md` and `user-stories-questions.md`.

Grouped by user journey (Q2). Each story is small: 1 to 3 days for one person with AI assistance (Q3). Priority is MoSCoW. Every story is a must-have unless marked, because scope made every capability a must-have. Acceptance criteria use Given/When/Then and feed the team's tests-first practice (team-practices). The accountability defaults agreed in Q4 are written into US2 and US5.

INVEST notes: stories are independently testable against seeded data, so none needs another story to be finished first in order to be tested. Dependencies are listed for build order only.

---

## Group 1: Capture

### US1.1 Connect Google Workspace
As Alex (Admin), I want to connect our Google Workspace, so that Drive documents and Meet transcripts can feed the engine. **Must.** Traces: FR5.2, FR12.4.
- **AC1.1.1** Given Alex has Google admin rights, when he connects Google Workspace and grants access, then Settings shows it as Connected with a last-sync time.
- **AC1.1.2** Given Alex selects two Drive folders, when sync runs, then only documents in those folders are read.
- **AC1.1.3** Given Google refuses access, when Alex tries to connect, then Settings shows the reason and nothing is synced.

### US1.2 Connect Microsoft 365
As Alex, I want to connect Microsoft 365, so that SharePoint and OneDrive documents, Teams chat and Teams transcripts can feed the engine. **Must.** Traces: FR5.3, FR12.4.
- **AC1.2.1** Given Alex has tenant admin consent, when he connects Microsoft 365, then Settings shows it as Connected.
- **AC1.2.2** Given Alex selects one Teams channel, when sync runs, then messages from other channels are not read.
- **AC1.2.3** Given consent is withdrawn, when sync runs, then Settings shows Microsoft 365 as failed with the reason.

### US1.3 Connect Slack
As Alex, I want to connect Slack and choose channels, so that decisions made in chat are captured. **Must.** Traces: FR5.4, FR12.4.
- **AC1.3.1** Given Alex installs the Slack app and picks #ops, when someone posts in #ops, then the message is synced.
- **AC1.3.2** Given a channel not picked, when someone posts there, then nothing is synced.
- **AC1.3.3** Given the Slack token is revoked, when sync runs, then Settings shows Slack as failed.

### US1.4 Bring in ChatGPT projects
As Theo (Technical contributor), I want ChatGPT project content brought in, so that context built in ChatGPT is not lost. **Must.** Traces: FR5.5.
- **AC1.4.1** Given automated access is available, when Alex connects it, then project content is synced like any other source.
- **AC1.4.2** Given automated access is not available, when Theo uploads a ChatGPT export file, then its content is imported as a source.
- **AC1.4.3** Given an export file is malformed, when it is uploaded, then the valid parts are imported and the rest is reported.

### US1.5 Upload a document
As Sam (Business contributor), I want to upload a document, so that knowledge in files nobody connected still gets captured. **Must.** Traces: FR5.6.
- **AC1.5.1** Given a PDF or Word policy file, when Sam uploads it, then it appears as a source and extraction runs on it.
- **AC1.5.2** Given an empty or unreadable file, when Sam uploads it, then he is told why it could not be read.
- **AC1.5.3** Given Sam is a Reader, when he tries to upload, then the upload is refused.

### US1.6 Turn new content into proposals
As Priya (Item owner), I want new content in connected tools turned into proposals quickly, so that the engine stays a live picture of the organisation. **Must.** Traces: FR6.1, FR6.2, FR6.4, NFR1. Depends on US1.1 to US1.5 for real sources (testable with a fake source).
- **AC1.6.1** Given a message in #ops says "refunds over $500 need manager sign-off", when it is saved, then within 5 minutes a proposal to update the Refund process appears in its owner's inbox.
- **AC1.6.2** Given an extracted proposal, when Priya opens it, then she sees the excerpt it was built from and a link to the original message.
- **AC1.6.3** Given the organisation chose a self-run AI model, when extraction runs, then no content is sent to a hosted model.
- **AC1.6.4** Given the AI model is unavailable, when content arrives, then it is queued and processed when the model is back, and nothing is lost.

### US1.7 Avoid duplicate proposals
As Priya, I want the same content to raise only one proposal, so that my inbox is not cluttered. **Must.** Traces: FR6.3.
- **AC1.7.1** Given a message is synced twice, when extraction runs, then only one proposal exists.
- **AC1.7.2** Given a document is edited, when it re-syncs, then only the changed part produces a new proposal.
- **AC1.7.3** Given the same rule appears in a Slack message and a Drive document, when both are extracted, then one proposal lists both sources.

### US1.8 Add a new kind of connection
As Theo, I want to add a connection to a new data source without changing the core, so that any store of data can be integrated. **Must.** Traces: FR5.1.
- **AC1.8.1** Given Theo writes a connection that follows the standard contract, when it is enabled, then its content flows into extraction with no core change.
- **AC1.8.2** Given a connection that breaks the contract, when it is enabled, then it is refused with a clear reason.
- **AC1.8.3** Given the standard contract, when Theo reads its documentation, then it lists what a connection must supply.

### US1.9 See connection health
As Alex, I want to see each connection's status, so that I can fix a broken one without affecting the rest. **Must.** Traces: FR5.7, FR5.8, NFR10, NFR13.
- **AC1.9.1** Given Slack fails, when Alex opens Settings, then Slack shows the error and last good sync, and Google and Microsoft are still syncing.
- **AC1.9.2** Given all connections are healthy, when Alex opens Settings, then each shows its last sync time.
- **AC1.9.3** Given a connection has failed for over an hour, when Alex opens the map, then a banner names it.

---

## Group 2: Propose and approve

### US2.1 Create an item
As Sam, I want to add a new rule or process with its owner, links and review period, so that knowledge in my head becomes shared. **Must.** Traces: FR1.1, FR1.2, FR1.3, FR9.7, FR3.1.
- **AC2.1.1** Given Sam fills in the title, type and content, chooses an owner and links it to a process, when he submits, then a proposal is created and nothing is live yet.
- **AC2.1.2** Given a required field is missing, when Sam submits, then the field is named and his text is kept.
- **AC2.1.3** Given Sam leaves the owner blank, when it is approved, then the item is marked "unowned".

### US2.2 Propose a change to an item
As Sam, I want to edit an item and say why, so that the change is reviewed and its reason recorded. **Must.** Traces: FR3.1, FR3.2, FR2.1.
- **AC2.2.1** Given Sam edits a rule and gives a reason, when he submits, then a proposal shows the before and after and the reason, with origin "person".
- **AC2.2.2** Given Sam gives no reason, when he submits, then the system asks for one.
- **AC2.2.3** Given Sam is a Reader, when he tries to edit, then he cannot.

### US2.3 See proposals waiting for me
As Priya, I want a Reviews inbox filtered to items I own, so that I know what needs my decision. **Must.** Traces: FR3.6.
- **AC2.3.1** Given three proposals touch Priya's items and two touch others', when she filters to "mine", then she sees three.
- **AC2.3.2** Given no proposals wait for her, when she opens the inbox, then it says so.
- **AC2.3.3** Given a proposal, when it is listed, then its origin (person, extraction, AI agent) is shown.

### US2.4 Decide on a proposal
As Priya, I want to approve, request changes or reject a proposal with a reason, so that every decision is accountable. **Must.** Traces: FR3.3, FR3.4, FR2.1, FR2.3, NFR9.
- **AC2.4.1** Given Priya owns the item, when she approves, then the item changes and its history records the proposer, Priya, the time and the reason.
- **AC2.4.2** Given Priya rejects without a reason, when she submits, then the system asks for one.
- **AC2.4.3** Given Priya is a Contributor who owns the item, when she approves, then the approval is accepted.
- **AC2.4.4** Given an approver who does not own the item and is not an Admin, when they try to approve it, then the system refuses.

### US2.5 Approve changes to unowned items
As an Approver, I want to approve proposals for unowned items, so that nothing stalls for lack of an owner. **Must.** Traces: FR1.4, FR3.3.
- **AC2.5.1** Given an unowned item, when an Approver approves a proposal for it, then the change is applied and the history names that Approver.
- **AC2.5.2** Given an unowned item, when a Contributor tries to approve, then the system refuses.
- **AC2.5.3** Given an unowned item, when an Admin approves, then it is accepted.

### US2.6 Approving my own proposal is flagged
As Alex, I want self-approvals flagged, so that accountability stays visible without adding friction. **Must.** Traces: FR2.1, FR3.3.
- **AC2.6.1** Given Priya proposed a change to her own item, when she approves it, then it is applied and the history marks it "self-approved".
- **AC2.6.2** Given a self-approved change, when anyone views the timeline, then the flag is visible.
- **AC2.6.3** Given an approval by someone else, when it is recorded, then it is not flagged.

### US2.7 Admin override
As Alex, I want to approve or reject in place of an owner with a recorded reason, so that urgent changes are not blocked. **Must.** Traces: FR3.3, FR2.1.
- **AC2.7.1** Given Priya owns an item, when Alex approves a proposal for it and gives a reason, then it is applied and the history marks it "Admin override" with the reason.
- **AC2.7.2** Given Alex gives no reason, when he overrides, then the system refuses.
- **AC2.7.3** Given an override, when it happens, then Priya is notified.

### US2.8 Handle out-of-date proposals
As Priya, I want to know when a proposal is based on an old version, so that I do not undo a newer change. **Must.** Traces: FR3.5.
- **AC2.8.1** Given the item changed after the proposal was raised, when Priya opens it, then it is marked out of date and both versions are shown.
- **AC2.8.2** Given two approvers decide the same proposal at the same moment, when the second decision arrives, then it is refused with "already decided".
- **AC2.8.3** Given an out-of-date proposal, when Priya approves it, then she must first confirm which version wins.

### US2.9 See the blast radius and risk before approving
As Priya, I want each proposal to show what else it affects and how risky it is, so that I approve with eyes open. **Must.** Traces: FR4.1, FR4.2.
- **AC2.9.1** Given a rule linked to 2 processes, 1 system and 1 decision, when Priya opens a proposal for it, then all 4 are listed as affected, along with items one further link away.
- **AC2.9.2** Given a proposal, when it is assessed, then a risk level (Low, Medium or High) and its reasons are shown.
- **AC2.9.3** Given the assessment cannot run, when Priya opens the proposal, then it says "assessment unavailable" and still lists directly linked items.

### US2.10 Spot contradictions
As Priya, I want a proposal flagged when it contradicts approved knowledge, so that conflicting rules do not both go live. **Must.** Traces: FR4.3.
- **AC2.10.1** Given an approved rule "discounts above 15% need finance approval", when a proposal says "discounts above 20% need finance approval", then the contradiction is flagged and the risk is at least Medium.
- **AC2.10.2** Given no conflicting item, when the proposal is assessed, then no contradiction is shown.
- **AC2.10.3** Given a flagged contradiction, when Priya opens it, then she can open the conflicting item.

### US2.11 An AI agent proposes a change
As the AI agent, I want to propose a change through MCP, so that context I notice can be captured with a person's approval. **Must.** Traces: FR7.3, FR3.2.
- **AC2.11.1** Given an agent with a Contributor service account, when it proposes a change through MCP, then the proposal appears in the owner's inbox marked "AI agent".
- **AC2.11.2** Given an agent proposal, when nobody has approved it, then the knowledge is unchanged.
- **AC2.11.3** Given an agent with a Reader account, when it tries to propose, then it is refused.

### US2.12 Archive an item
As Priya, I want to archive an item that is no longer true, so that it stops being served without losing its history. **Must.** Traces: FR3.1, FR2.1.
- **AC2.12.1** Given Priya proposes archiving her item with a reason, when it is approved, then the item disappears from the map and answers but its history remains viewable.
- **AC2.12.2** Given an archived item had links, when it is archived, then linked items show the link as "archived".
- **AC2.12.3** Given anyone, when they look for a delete option, then there is none; archiving is the only removal.

### US2.13 Withdraw my proposal
As Sam, I want to withdraw a proposal I raised, so that mistakes do not waste the owner's time. **Must.** Traces: FR3.1.
- **AC2.13.1** Given Sam's undecided proposal, when he withdraws it, then it leaves the inbox and the history records the withdrawal.
- **AC2.13.2** Given a decided proposal, when Sam tries to withdraw it, then he cannot.
- **AC2.13.3** Given someone else's proposal, when Sam tries to withdraw it, then he cannot.

### US2.14 Change or remove a link
As Theo, I want to add or remove a link between items through a proposal, so that the map stays accurate. **Must.** Traces: FR1.3, FR3.1.
- **AC2.14.1** Given Theo proposes linking a system to a rule, when it is approved, then both items show the link.
- **AC2.14.2** Given Theo proposes removing a link, when it is approved, then neither item shows it and the history records it.
- **AC2.14.3** Given a link proposal, when it is assessed, then the blast radius covers both ends.

---

## Group 3: Explore the map

### US3.1 Explore the 3D map
As Sam, I want to rotate, zoom and click through a 3D map of our knowledge, so that I see how things connect. **Must.** Traces: FR9.1, NFR3.
- **AC3.1.1** Given the map is open, when Sam drags and scrolls, then it rotates and zooms.
- **AC3.1.2** Given Sam clicks a node, when it is selected, then the side panel shows the item and its links.
- **AC3.1.3** Given 10,000 items, when Sam moves the map on a standard desktop browser, then it stays at 30 frames per second or more.

### US3.2 Filter, colour and search the map
As Priya, I want to filter and colour by type, team or owner and search to jump to an item, so that I find what matters. **Must.** Traces: FR9.2.
- **AC3.2.1** Given Priya filters Team = Finance, when applied, then only Finance items stay highlighted on the map and in the panel.
- **AC3.2.2** Given Priya searches "discount", when she picks a result, then the map flies to that node.
- **AC3.2.3** Given no matches, when she searches, then it says so.

### US3.3 Replay how knowledge changed
As Alex, I want to replay how the map grew and see recent and stale items highlighted, so that I see the organisation evolve. **Should.** Traces: FR9.3.
- **AC3.3.1** Given Alex presses Play on the timeline, when it runs, then items appear in the order they were approved.
- **AC3.3.2** Given the replay is running, when Alex presses Pause, then it stops; with reduced motion turned on, it does not animate.
- **AC3.3.3** Given stale items, when the map is shown, then they are marked with a text label, not by colour alone.

### US3.4 Use everything without the 3D view
As a keyboard or screen-reader user, I want a synced side panel and a full list view, so that I can do everything the map does. **Must.** Traces: FR9.4, NFR7.
- **AC3.4.1** Given a keyboard-only user, when they open the list view, then they can find, open and propose a change to any item.
- **AC3.4.2** Given a node is selected on the map, when the side panel updates, then a screen reader announces the item.
- **AC3.4.3** Given an automated accessibility scan, when it runs on each screen, then no WCAG 2.1 AA failures are reported.

### US3.5 Read an item
As Sam, I want an item page with content, reason, sources, links, owner and freshness, so that I trust what I am reading. **Must.** Traces: FR9.5, FR1.2, FR1.4.
- **AC3.5.1** Given an approved rule, when Sam opens it, then he sees its content, why it exists, its sources, links, owner and last-reviewed date.
- **AC3.5.2** Given an unowned item, when Sam opens it, then it is marked "unowned".
- **AC3.5.3** Given a source Sam may not see, when the page shows it, then it says "restricted" instead of showing the excerpt.

### US3.6 Summarise an item's life
As Priya, I want an AI summary of how an item came to be and changed, so that I get its story at a glance. **Should.** Traces: FR9.5.
- **AC3.6.1** Given an item with 3 changes, when Priya asks for a summary, then it mentions each change and who approved it.
- **AC3.6.2** Given the AI model is unavailable, when she asks, then it says so and the full history is still shown.
- **AC3.6.3** Given a summary, when it is shown, then it is labelled as AI-generated.

### US3.7 See what changed
As Sam, I want a plain-language timeline of changes with before and after on demand, so that I know who changed what and why. **Must.** Traces: FR2.2, FR2.3, NFR9.
- **AC3.7.1** Given an item with changes, when Sam opens History, then he sees each change with who, when and why.
- **AC3.7.2** Given a change, when he opens before and after, then the differences are marked with text, not colour alone.
- **AC3.7.3** Given any role, when they look for a way to edit or delete history, then there is none.

### US3.8 Try a change in a sandbox
As Priya, I want to try a rule change in a sandbox and see what it would affect, so that I know the impact before proposing. **Must.** Traces: FR9.6, FR4.4.
- **AC3.8.1** Given Priya edits a rule in the sandbox, when she runs it, then the affected items and a risk level are shown.
- **AC3.8.2** Given she exits without converting, when she leaves, then no item or proposal is created.
- **AC3.8.3** Given she clicks "Turn this into a proposal", when it is created, then it carries the same assessment.

### US3.9 Run an AI scenario
As Priya, I want AI to walk through how a process plays out under the rules, so that I can check a change in a realistic case. **Should.** Traces: FR9.6.
- **AC3.9.1** Given a process and a scenario prompt, when Priya runs it, then the AI's walkthrough cites the rules it used.
- **AC3.9.2** Given a sandbox change, when she runs the same scenario, then the walkthrough uses the changed rule.
- **AC3.9.3** Given the AI model is unavailable, when she runs it, then it says so.

### US3.10 Use it on any screen size
As Sam, I want the web app to work on my phone and laptop, so that I can check something anywhere. **Must.** Traces: NFR8, FR9.8.
- **AC3.10.1** Given a 320 px-wide screen, when Sam opens the app, then it shows the list view by default and every function works.
- **AC3.10.2** Given a desktop, when Sam opens the app, then it shows the map with the side panel.
- **AC3.10.3** Given any screen size, when a page loads, then no content needs sideways scrolling.

---

## Group 4: Ask

### US4.1 An AI agent reads organisational context
As the AI agent, I want to search and read items with their links, owners and sources through MCP, so that my answers are grounded. **Must.** Traces: FR7.1, FR7.2, FR7.4, NFR2.
- **AC4.1.1** Given Claude is connected through MCP, when it asks about the discount limit, then it receives the approved rule with its owner and source within 5 seconds.
- **AC4.1.2** Given a pending proposal exists for the rule, when the agent reads it, then the pending change is marked as not yet approved.
- **AC4.1.3** Given an agent account without access to an item, when it searches, then that item is not returned.

### US4.2 Ask in Slack
As Sam, I want to ask a question in Slack and get an answer with its source, so that I do not have to leave chat. **Must.** Traces: FR8.1, NFR2.
- **AC4.2.1** Given an approved rule, when Sam asks about it in Slack, then the reply quotes it, names its owner and links to it, within 5 seconds.
- **AC4.2.2** Given Sam's Slack email matches an account, when he asks, then the answer only uses items his role can see.
- **AC4.2.3** Given the engine is unreachable, when Sam asks, then the bot says it cannot answer right now.

### US4.3 Ask in Teams
As Sam, I want to ask in Microsoft Teams too, so that people on Teams get the same answers. **Must.** Traces: FR8.1.
- **AC4.3.1** Given an approved rule, when Sam asks in Teams, then the reply quotes it with its owner and a link.
- **AC4.3.2** Given the same question in Slack and Teams, when both answer, then the answers match.
- **AC4.3.3** Given the engine is unreachable, when Sam asks, then the bot says it cannot answer right now.

### US4.4 Raise a gap when nothing matches
As Sam, I want to be told when nothing approved matches and be offered to raise it, so that gaps get filled. **Must.** Traces: FR8.2.
- **AC4.4.1** Given no approved item matches, when Sam asks, then the reply says so and offers to raise a gap.
- **AC4.4.2** Given Sam accepts, when the gap is raised, then it appears for Approvers as an unowned item request.
- **AC4.4.3** Given Sam declines, when he does, then nothing is created.

### US4.5 Know when an answer is stale
As Sam, I want answers from stale items labelled, so that I know to double-check. **Must.** Traces: FR8.3.
- **AC4.5.1** Given the answer comes from a stale item, when it is shown, then it says when the item was last reviewed.
- **AC4.5.2** Given a fresh item, when it is answered, then no warning is shown.
- **AC4.5.3** Given an MCP answer from a stale item, when the agent receives it, then the stale status is included.

### US4.6 Only known chat users get answers
As Alex, I want Slack and Teams users matched to accounts by work email, so that nobody sees knowledge their role does not allow. **Must.** Traces: FR11.5, FR7.4, NFR5.
- **AC4.6.1** Given a Slack user whose email matches an account, when they ask, then they get answers within that account's role.
- **AC4.6.2** Given a Slack user with no matching account, when they ask, then they are told they need an account and get no knowledge.
- **AC4.6.3** Given an account is deactivated, when its chat user asks, then they get no knowledge.

---

## Group 5: Keep it fresh

### US5.1 Set an item's review period
As Priya, I want each item to have its own review period, so that fast-changing rules are checked more often. **Must.** Traces: FR10.1, FR1.2.
- **AC5.1.1** Given Priya creates an item, when she sets a 30-day review period, then it is saved with the item.
- **AC5.1.2** Given no period is set, when the item is created, then the organisation's default applies.
- **AC5.1.3** Given a change to the review period, when it is approved, then it is recorded in history.

### US5.2 Be reminded about stale items
As Priya, I want reminders when my items pass their review period, so that the knowledge stays current. **Must.** Traces: FR10.2.
- **AC5.2.1** Given an item with a 30-day period last reviewed 31 days ago, when the daily check runs, then it is marked stale and Priya is reminded in the web app and by her chat tool (Slack or Teams).
- **AC5.2.2** Given an unowned stale item, when the check runs, then Approvers and Admins are reminded.
- **AC5.2.3** Given an item within its period, when the check runs, then it is not marked stale.

### US5.3 See my stale and due items
As Priya, I want a list of my items that are stale or due soon, so that I can plan reviews. **Must.** Traces: FR10.3.
- **AC5.3.1** Given Priya owns 2 stale items and 1 due within 7 days, when she opens her list, then all 3 are shown in date order.
- **AC5.3.2** Given none, when she opens it, then it says she is up to date.
- **AC5.3.3** Given another owner's items, when Priya opens her list, then they are not shown.

### US5.4 Confirm an item is still true
As Priya, I want to confirm an item is still correct without editing it, so that review is one click. **Must.** Traces: FR10.4.
- **AC5.4.1** Given a stale item, when Priya confirms it, then it is no longer stale and its review date is reset.
- **AC5.4.2** Given a confirmation, when it happens, then the history records who confirmed and when.
- **AC5.4.3** Given a Reader, when they try to confirm, then they cannot.

### US5.5 Reassign a departed owner's items
As Alex, I want a removed person's items to become unowned and go to Approvers, so that nothing is left unaccountable. **Must.** Traces: FR1.4, FR3.3.
- **AC5.5.1** Given Alex deactivates Priya, when it takes effect, then her items are marked unowned and Approvers are notified.
- **AC5.5.2** Given Priya had proposals waiting for her approval, when she is deactivated, then they move to Approvers.
- **AC5.5.3** Given an Approver takes ownership through a proposal, when it is approved, then the item is owned again.

---

## Group 6: Set up and administer

### US6.1 Sign in with my work account
As Sam, I want to sign in with my Google or Microsoft work account, so that I do not need another password. **Must.** Traces: FR11.1, NFR5.
- **AC6.1.1** Given Sam's Google account belongs to the organisation, when he signs in, then he is in with his assigned role.
- **AC6.1.2** Given an account from outside the organisation, when it signs in, then access is refused.
- **AC6.1.3** Given his session expires mid-edit, when he signs in again, then his unsaved text is not lost.

### US6.2 Sign in with email and password
As a person without Google or Microsoft, I want to sign in with email and password, so that I can still use the engine. **Must.** Traces: FR11.1, FR11.2.
- **AC6.2.1** Given an invited email, when the person sets a password and signs in, then they are in.
- **AC6.2.2** Given the login, when it is built, then it uses an established authentication library or service, and no custom password storage exists in our code.
- **AC6.2.3** Given repeated wrong passwords, when the limit is reached, then sign-in is temporarily blocked.

### US6.3 Manage people and roles
As Alex, I want to invite people and set their role, so that each person has the right access. **Must.** Traces: FR11.3, FR11.4, FR11.5.
- **AC6.3.1** Given Alex sets Sam to Contributor, when Sam signs in, then he can propose but not approve unowned items.
- **AC6.3.2** Given a Reader, when Alex tries to make them an item's owner, then the system asks to raise their role first.
- **AC6.3.3** Given a role change, when it happens, then it takes effect on the person's next request.

### US6.4 Choose privacy and security presets
As Alex, I want to choose which privacy laws and security classifications apply, so that the engine handles data the way we must. **Must.** Traces: FR12.1.
- **AC6.4.1** Given Alex picks the GDPR preset, when it is saved, then the settings it implies are applied and shown.
- **AC6.4.2** Given no preset, when the engine is set up, then a safe default is applied.
- **AC6.4.3** Given a preset change, when it is saved, then it is recorded in an admin history.

### US6.5 Control sensitive content
As Alex, I want raw chat and transcript content kept but visible only to Admins by default, so that sensitive remarks do not leak. **Must.** Traces: FR12.2, NFR6.
- **AC6.5.1** Given the default setting, when a Contributor views a proposal, then they see the excerpt but not the full raw content.
- **AC6.5.2** Given Alex changes the setting to discard raw content, when new content is extracted, then only the excerpt and a link are kept.
- **AC6.5.3** Given any setting, when the engine writes logs, then they contain no item or source content.

### US6.6 Choose the AI model
As Alex, I want to choose a hosted AI model or our own, so that we control where content is processed. **Must.** Traces: FR12.3, FR6.4.
- **AC6.6.1** Given Alex enters a self-run model endpoint, when it is saved, then extraction, assessment and summaries use it.
- **AC6.6.2** Given an invalid endpoint, when Alex saves, then the connection test fails with the reason.
- **AC6.6.3** Given a hosted model is chosen, when it is saved, then the provider's key is stored as a secret, not shown again.

### US6.7 First-run setup
As Alex, I want a guided first run, so that a new installation is usable in one sitting. **Must.** Traces: FR13.2.
- **AC6.7.1** Given a fresh installation with no data, when Alex opens it, then a guide takes him through sign-in setup, the AI model and the first connection.
- **AC6.7.2** Given Alex skips the connection step, when he finishes, then the map shows the empty state with "Connect a source".
- **AC6.7.3** Given setup is complete, when Alex reopens the app, then the guide does not appear again.

### US6.8 Run our own copy in containers
As Theo, I want to run the engine from published container images, so that any organisation can host its own copy. **Must.** Traces: FR13.1, NFR4, NFR12.
- **AC6.8.1** Given a host with a container runtime, when Theo starts the published images with the documented configuration, then the engine is reachable and its health check passes.
- **AC6.8.2** Given 100 people's typical load, when the engine runs on one host, then the NFR targets are met.
- **AC6.8.3** Given a second copy of the web and API service, when it is started alongside, then both serve requests without code changes.

## Dependencies (build order only)

- US2.1 and US2.4 come before the other Group 2 stories.
- Group 1 extraction (US1.6) needs at least one source (US1.5 is the simplest).
- US4.2 to US4.6 need US4.1's search.
- US6.1 to US6.3 come before anything role-dependent in real use (tests use seeded accounts).

## Coverage notes

- NFR11 (tests first, 80% coverage, CI blocks merge) is a team practice applied to every story rather than a story of its own. It is checked at Build and Test.
- NFR13 (observability) is partly covered by US1.9 and AC6.8.1. Error-rate and latency measurement is designed at code generation.
