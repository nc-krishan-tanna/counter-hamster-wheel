# Interaction Specification

Inputs: `mockups.md`, `ideation/rough-mockups/wireframes.md` (wireframes), `ideation/rough-mockups/user-flow.md` (user-flow), `inception/user-stories/stories.md` (stories) and `inception/requirements-analysis/requirements.md` (requirements). This document uses the component-spec template. Building blocks come from shadcn/ui (see `design-system-mapping.md`).

## Global patterns

| Pattern | Rule |
|---|---|
| Feedback | Success shows inline near the action and is announced through a polite live region. Errors are named in text with a fix, and never rely on colour alone. |
| Destructive or irreversible actions | Archive, Reject, Admin override and deactivating a person each open a confirmation dialog that names what is affected. Reject and override require a reason. |
| Unsaved work | Drafts save automatically. Leaving with unsaved changes asks for confirmation. Session expiry keeps the draft. |
| Loading | Skeletons on first load. Spinners for actions, with "Still working..." after 5 seconds. |
| AI output | Always labelled "AI". Always shows the sources it used. Never stated as approved fact. |
| Double submit | Buttons are disabled while a submission is in flight. The server refuses a second decision with "already decided". |
| Motion | Animations last at most 300 ms. With reduced motion, the map replay steps and nothing glides. |

---

## KnowledgeMap3D

| Field | Value |
|---|---|
| Component | KnowledgeMap3D |
| Description | Interactive 3D graph of items (nodes) and links (edges) |
| Category | display |

### States

| State | Description | Trigger |
|---|---|---|
| default | Graph rendered, nothing selected | page load |
| focus | Canvas focused, keyboard hint shown | Tab |
| selected | Node highlighted, side panel updated | click, or Enter in the panel |
| filtered | Non-matching nodes faded | filter change |
| loading | Skeleton cluster | data fetch |
| error | Message with [Try again] [Open list] | load failure |
| empty | "Nothing here yet" with actions | no items |
| replaying | Nodes appear in approval order | Play |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| items | Item[] | yes | — | Nodes |
| links | Link[] | yes | — | Edges |
| selectedId | string | no | — | Selected node, kept in sync with the side panel |
| colourBy | type \| team \| owner | no | type | Colour scheme; shape and letter marker always show type |
| filters | object | no | {} | Type, team, owner, freshness |
| onSelect | (id) => void | yes | — | Updates the selection |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Not shown by default; List is the home screen. Available behind [3D] |
| tablet (768–1024px) | Full width; side panel becomes a drawer |
| desktop (>1024px) | Map and panel side by side, 2:1 |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `img` with an `aria-label` summarising the counts ("Knowledge map, 340 items"). All interaction is mirrored in SyncedSidePanel and the List view |
| Keyboard interaction | Tab focuses the canvas. Arrow keys rotate, +/- zoom. Enter moves focus to the side panel. All item actions live in the panel |
| Label / aria-label | As above |
| Contrast ratio | Nodes 3:1 against the background; labels 4.5:1 |
| Screen reader | Announces the selected item through the side panel's live region |
| Focus management | After a selection, focus moves to the panel heading |

---

## SyncedSidePanel

| Field | Value |
|---|---|
| Component | SyncedSidePanel |
| Description | Text mirror of the map selection and its links, with actions |
| Category | display |

- **States:** none selected ("Select an item on the map or search"), selected, loading, error.
- **Accessibility:** `aside` landmark. A heading for the item. Links are a list of buttons. A live region announces changes to the selection.
- **Responsive:** a drawer on tablet; on mobile it is replaced by the List view.

---

## ItemEditor

| Field | Value |
|---|---|
| Component | ItemEditor |
| Description | Document-style editor with structured fields for creating or changing items |
| Category | input |

### States

| State | Description | Trigger |
|---|---|---|
| default | Empty (new item) or pre-filled (change) | open |
| mentioning | @ list open | typing @ |
| validating | Field errors shown | submit with missing fields |
| saving-draft | "Saving..." then "Draft saved hh:mm" | autosave |
| submitting | Buttons disabled | submit |
| submitted | Moves to the proposal view (S4) | success |
| error | "Could not submit. Your draft is kept." | failure |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| itemId | string | no | — | Present when proposing a change |
| initialDraft | Draft | no | — | From the Ask conversation or Simulate |
| onSubmitted | (proposalId) => void | yes | — | Navigation after submit |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `form`; the rich-text area has `textbox` with `aria-multiline` |
| Keyboard interaction | @ opens a combobox. Arrows move through it, Enter picks, Escape closes. Suggested links are checkboxes |
| Label / aria-label | Visible labels above every field |
| Contrast ratio | WCAG AA |
| Screen reader | Field errors are linked with `aria-describedby`. The impact preview updates in a polite live region |
| Focus management | On a validation error, focus moves to the first invalid field |

---

## AskConversation

| Field | Value |
|---|---|
| Component | AskConversation |
| Description | One chat box for questions and conversational changes, with impact shown before any draft |
| Category | input |

- **Flow:**
  1. The person asks a question or describes a change.
  2. For a change, the engine shows its impact (risk and affected items) and offers to draft it.
  3. On yes, the engine creates a draft (not a proposal) and shows **Review draft**.
  4. Review draft opens ItemEditor pre-filled with the draft.
  5. The person submits from the editor. Nothing is proposed without that explicit submit.
- **States:** idle, thinking ("Thinking..." with a cancel option), answered, impact-shown, draft-ready, no-match (offers to raise a gap), unavailable (AI down; points to search).
- **Accessibility:** the message list is a `log` role with polite announcements. The input has a visible label. Send works with Enter, and Shift+Enter adds a new line.

---

## ProposalReview

| Field | Value |
|---|---|
| Component | ProposalReview |
| Description | Before/after, source, impact and the decision form |
| Category | input |

- **States:** waiting, partly approved (some owners done), out of date, already decided, withdrawn, decided.
- **Decision rules:**
  - Approve, Request changes or Reject. A reason is required for Request changes and Reject.
  - Every owner must approve, and any rejection rejects the whole proposal.
  - Request changes clears approvals already given and returns the proposal to its proposer.
  - Admin override needs a reason and notifies the owner.
- **Accessibility:** the decision is a radio group with a legend. The reason field is marked required when needed. A submit result is announced.

---

## BlastRadiusPanel and RiskBadge

| Field | Value |
|---|---|
| Component | BlastRadiusPanel |
| Description | Lists directly affected items and items one further link away, with risk level, reasons and contradictions |
| Category | display |

- **RiskBadge:** shows the text "LOW", "MEDIUM" or "HIGH" alongside a colour and an icon.
- **States:** assessing ("Assessing impact..."), ready, unavailable (direct links still listed).
- **Accessibility:** two lists under headings. A contradiction is a link to the conflicting item.

---

## HistoryTimeline and DiffView

- **HistoryTimeline:** an ordered list of changes. Each entry shows date, action, proposer, approver, reason and flags (SELF-APPROVED, ADMIN OVERRIDE, CONFIRMED). The newest entry is first.
- **DiffView:** before and after side by side, with removed and added text marked in text as well as colour. On narrow screens it shows one column with inline markers.
- **Accessibility:** the timeline is an `ol`. In the diff, removals are announced as "removed" and additions as "added".

---

## NotificationCentre

- **Bell:** opens a list of notifications, unread first. Each notification links to its source.
- **Notification settings:** a channel grid with web app (always on), chat (only when the chat account is linked) and email, per notification type.
- **Accessibility:** the bell's label includes the unread count ("Notifications, 2 unread"). The list is navigable with arrow keys.

---

## Chat answer (Slack and Teams)

- **Answer:** the item text, its owner, freshness, and a link.
- **Variants:** stale (adds a note), no match (offers to raise a gap), unknown user (asks them to get invited), engine unavailable ("I can't answer right now").
- **Accessibility:** answers are plain text that each host's own accessibility handles.

---

## OrganisationSignUp (hosted service)

| Field | Value |
|---|---|
| Component | OrganisationSignUp |
| Description | Creates an organisation, its address and its first Admin (S14, US7.2) |
| Category | input |

| State | Description | Trigger |
|---|---|---|
| default | Empty form | page load |
| checking | Address availability being checked | address typed (debounced 300 ms) |
| available / taken | Result shown in text next to the address | check returns |
| error | Field errors named under each field; input kept | submit with invalid input |
| loading | Creating the organisation; button disabled | submit |

- **Accessibility:** the availability result is in a polite live region; errors are linked to their fields with `aria-describedby`; focus moves to the first error on submit.

---

## OperatorConsole and SupportAccessLog (hosted service)

- **OperatorConsole (S18):** a table of organisations with Status as text. Suspend, Reactivate and Open for support each open an Alert Dialog that names the organisation and requires a reason; confirm is disabled until a reason is typed. Support access opens the organisation read-only with a persistent banner.
- **SupportAccessLog (S17):** a read-only table, newest first, cursor-paged. No edit or delete controls exist.
- **Accessibility:** tables have row and column headers; dialogs follow the global dialog rules; the support banner is announced once when the organisation opens.

## Assumptions & Open Questions

- AskConversation drafts are kept per person for 7 days if not submitted. This is a default, changeable in settings.
