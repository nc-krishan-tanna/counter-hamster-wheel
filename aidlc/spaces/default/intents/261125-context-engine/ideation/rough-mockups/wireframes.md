# Wireframes (Low Fidelity): Organisational Context Engine

Inputs: `ideation/intent-capture/intent-statement.md` (intent-statement), `ideation/scope-definition/scope-document.md` (scope-document), `ideation/scope-definition/intent-backlog.md` (intent-backlog), and the answers in `rough-mockups-questions.md`.

These are rough concepts for review, not final design. Look: clean and neutral, suited to an open-source product (Q4). Fully responsive; designed desktop-first because most users are on desktop (Q5). Accessibility target: WCAG 2.1 AA (Q6).

## Information architecture

```
Context Engine
  |
  +-- Map (home)            3D knowledge map + synced side panel   (Q1, Q10)
  |     +-- Node detail     rule / process / person / team /
  |     |                   system / decision                      (Q8)
  |     |     +-- History   timeline, then before/after            (Q3)
  |     |     +-- Simulate  what-if sandbox, AI scenarios          (Q9)
  |     +-- List view       full accessible list/tree of the map   (Q10)
  +-- Reviews               proposed changes awaiting approval     (intent-backlog IB-2)
  |     +-- Proposal        what changed, source, approve/reject
  +-- Settings (admin)      connections, privacy, AI model, roles  (scope-document)
```

Everyday asking also happens outside the web app, in Slack or Teams and in ChatGPT or Claude through MCP (scope-document). See screen S8.

Every node type links to the others. A rule links to the process it governs, the team and person who own it, the systems it touches, and the decision that explains it. Getting these links right matters most (Q2, Q7).

---

## S1. Map (home)

```
+----------------------------------------------------------------------+
| Context Engine   [ Search or ask the organisation...      ]  Reviews 3|
+----------------------------------------------------------------------+
| Filters: [Type v] [Team v] [Owner v] [Fresh/Stale v]   [3D] [List]   |
+------------------------------------------------+---------------------+
|                                                | Selected: none      |
|              .   o        o                    |                     |
|           o--+--O Pricing  \                   | Linked items (list) |
|          /   |   rules      o                  |  - Sales process    |
|     o---O Sales             |                  |  - Finance team     |
|          \ process   o-----O Finance          |  - Billing system   |
|           o          /       team              |  - ADR: discounts   |
|                     o                          |                     |
|   3D: drag to rotate, scroll to zoom           | [Open] [Summarise]  |
|   click a node to select                       | [Simulate]          |
+------------------------------------------------+---------------------+
| Timeline: [|<]  ----o-------------------------->  Now   [Play]       |
+----------------------------------------------------------------------+
```

- **What it does:** a 3D, tree-like, neuron-style map of linked knowledge, like archify but in 3D (Q1). People can fly around, zoom and click a node to open it. They can filter and colour by type, team or owner, and search to jump to a node (Q8). The timeline at the bottom replays how the map grew and highlights recent or stale items (Q8).
- **Side panel:** always in sync with the map. It lists the selected node and its links as plain text, so the same information is available without the 3D view (Q10).
- **Empty state:** "Nothing captured yet. Connect a source or add your first rule." Buttons: [Connect a source] [Add a rule].
- **Loading state:** the map area shows a skeleton cluster; the side panel shows "Loading map...".
- **Error state:** "The map could not load. Your knowledge is safe. [Try again] [Open list view]".
- **Partial / edge state:** with thousands of nodes, distant clusters collapse into a single labelled bubble showing a count. If some sources failed to sync, a banner says which ones and when they last synced.
- **Accessibility:** h1 "Map". Landmarks: header (search), nav (filters, view switch), main (map), aside (side panel). The keyboard starts in the search box, and Tab reaches the side panel list, where arrow keys move between linked items. The 3D canvas is marked as decorative; the side panel and list view carry its meaning (Q10).

---

## S2. Node detail

```
+----------------------------------------------------------------------+
| < Back to map           Pricing rule: Discount limit                 |
+----------------------------------------------------------------------+
| Type: Business rule   Owner: Finance lead   Last reviewed: 12 days   |
+----------------------------------------------------+-----------------+
| Rule                                               | Linked to       |
| Discounts above 15% need finance approval.         |  - Sales proc.  |
|                                                    |  - Finance team |
| Why (decision)                                     |  - CRM system   |
| Agreed in Q3 pricing review to protect margin.     |  - ADR-012      |
|                                                    |                 |
| Sources                                            | Life summary    |
|  - Pricing policy.docx (Drive)                     | [Summarise]     |
|  - #finance Slack, 3 Sep                           | "Created 2024,  |
|                                                    |  changed twice, |
| [Propose change] [History] [Simulate]              |  last by ..."   |
+----------------------------------------------------+-----------------+
```

- **What it does:** shows one rule, process, person, team, system or decision. It shows its owner and freshness, its links, its sources, and an AI summary of the node's life (Q8; intent-statement).
- **Empty / edge:** a node with no links says "Not linked to anything yet. [Add a link]". Long text folds behind "Show more".
- **Error:** "This item could not load. [Try again]". If an AI summary fails: "Summary unavailable right now; the history below is complete."
- **Accessibility:** h1 is the node name, with h2 for Rule, Why, Sources and Linked to. Landmarks: header, main, aside. The keyboard starts on "Back to map".

---

## S3. History

```
+----------------------------------------------------------------------+
| Pricing rule: Discount limit  >  History                             |
+----------------------------------------------------------------------+
| Timeline                                                             |
|  o 12 Sep  Finance lead   Raised limit 10% -> 15%   "Margin review"  |
|  |         approved by CFO                    [See before / after]   |
|  o 02 May  Sales ops      Added exception for renewals               |
|  |                                            [See before / after]   |
|  o 10 Jan  Created from Pricing policy.docx (Drive)                  |
+----------------------------------------------------------------------+
| Before                         | After                               |
| Discounts above 10% need       | Discounts above 15% need            |
| finance approval.              | finance approval.                   |
|            ^^^                 |            ^^^ (changed)            |
+----------------------------------------------------------------------+
```

- **What it does:** a timeline of who changed what, when and why, in plain language first, with before and after available on demand (Q3; intent-statement).
- **Accessibility:** h1 "History". The timeline is an ordered list. Changes are marked with the text "(changed)", not by colour alone. The keyboard starts on the first timeline entry.

---

## S4. Reviews (proposal inbox)

```
+----------------------------------------------------------------------+
| Reviews                                         Filter: [Mine v]     |
+----------------------------------------------------------------------+
| Proposed from Slack #ops, 2 hrs ago           Process: Refund steps  |
|   "Refunds over $500 now need a manager"   [Open]                    |
| Proposed by Sam (manual edit), yesterday      Rule: Leave approval   |
|   "Add 2-day notice for annual leave"      [Open]                    |
+----------------------------------------------------------------------+
| Proposal                                                             |
|  Before / after  |  Source excerpt  |  What else this affects (3)    |
|  [Approve]  [Request changes]  [Reject]                              |
+----------------------------------------------------------------------+
```

- **What it does:** proposals extracted from tools, and manual edits, wait here for approval before they become knowledge (scope-document; intent-backlog IB-2, IB-4).
- **Empty state:** "Nothing to review. New proposals from your connected tools will appear here."
- **Accessibility:** h1 "Reviews". The list is a table with column headers. Approve, Request changes and Reject are buttons. Reject asks for confirmation and names the item.

---

## S5. Simulate (what-if sandbox and AI scenarios)

```
+----------------------------------------------------------------------+
| Simulate: Pricing rule: Discount limit                  [Exit]       |
+----------------------------------------------------------------------+
| What if: [ Discounts above 20% need finance approval      ]          |
|                                                                      |
| Would affect:                     | Scenario (AI)                    |
|  - Sales process (step 4)         | "A rep offers 18% on a renewal.  |
|  - CRM approval flow              |  Under the change, no finance    |
|  - 2 decisions mention 15%        |  approval is needed ..."         |
|                                   | [Run another scenario]           |
| [Turn this into a proposal]       |                                  |
+----------------------------------------------------------------------+
```

- **What it does:** changes a rule in a sandbox to see what it would affect, and runs AI scenarios through a process under the rules (Q9). Nothing changes until the person turns it into a proposal. The live activity animation is less important for now (Q9).
- **Accessibility:** h1 "Simulate". The affected items are a list. Scenario output appears in a live region, so screen readers announce it when it is ready.

---

## S6. List view (accessible full view)

```
+----------------------------------------------------------------------+
| Map  >  List view                               [3D] [List]          |
+----------------------------------------------------------------------+
| v Sales process                                                      |
|     > Pricing rules (4)                                              |
|     > Owned by: Sales ops team                                       |
| v Finance team                                                       |
|     > Discount limit rule                                            |
+----------------------------------------------------------------------+
```

- **What it does:** a full tree of the same knowledge and links, fully usable by keyboard and screen reader (Q10).
- **Accessibility:** h1 "List view". It uses tree semantics: arrow keys expand and collapse items, and Enter opens one.

---

## S7. Settings (admin)

```
+----------------------------------------------------------------------+
| Settings                                                             |
+----------------------------------------------------------------------+
| Connections: Google Workspace [Connected]  Microsoft 365 [Connect]   |
|              Slack [Connected]  ChatGPT projects [Connect]  [+ Add]  |
| Privacy:     Regulation preset [GDPR v]  Sensitive content [Opt-in v]|
| AI model:    [Hosted: Claude v]  or  [Self-run endpoint ...]         |
| Roles:       Reader / Contributor / Approver / Admin                 |
+----------------------------------------------------------------------+
```

- **What it does:** each organisation connects its tools and picks its privacy laws, security classifications, sensitive-content handling and AI model. Roles stay simple (scope-document).
- **Accessibility:** h1 "Settings", with h2 per section. Every control has a visible label. The keyboard starts on the first connection.
- **Assumption:** the four role names are placeholders for "simple roles" and are not yet agreed (see Assumptions).

---

## S8. In-tool assistant (Slack or Teams)

```
+----------------------------------------------------------------------+
| #sales                                                               |
| Alex: @context what's our discount limit?                            |
| Context Engine: Discounts above 15% need finance approval.           |
|   Source: Pricing rule (approved 12 Sep by CFO)  [Open in map]       |
+----------------------------------------------------------------------+
```

- **What it does:** people ask from inside tools they already use, and get the answer with its source and approval (scope-document; intent-statement). ChatGPT or Claude reaches the same knowledge through MCP.
- **Accessibility:** this follows the host app's accessibility; answers are plain text with a link.

## Assumptions & Open Questions

- [assumption] The role names Reader, Contributor, Approver and Admin in S7 are placeholders for "simple roles"; the real set is agreed in requirements.
- [assumption] Sample content (discount limits, teams, dates) is illustrative only.
