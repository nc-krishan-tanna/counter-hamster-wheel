# Refined Mockups: Organisational Context Engine

Inputs: `ideation/rough-mockups/wireframes.md` (wireframes), `ideation/rough-mockups/user-flow.md` (user-flow), `inception/user-stories/stories.md` (stories), `inception/requirements-analysis/requirements.md` (requirements), `inception/practices-discovery/team-practices.md` (team-practices) and `refined-mockups-questions.md`.

These mockups are mid-fidelity: real labels, real layout and every state, in ASCII. Visual styling comes from `design-system-mapping.md`, behaviour from `interaction-spec.md`, and accessibility from `accessibility-checklist.md`. Each screen names the stories it serves.

## Changes since the rough mockups

- Added the **editor** (S5) and the **ask-to-edit conversation** (S6). The rough-mockups review flagged that authoring had no screen (R-01). You chose to offer both (Q2).
- Added **My items** (S10), **notification settings** (S11), **first-run setup** (S12) and connection health in Settings.
- **Reviews** now has reason fields, a request-changes comment, multi-owner status and the blast-radius panel.
- **Responsive rules** are added for every screen (rough-mockups review R-02).
- The 3D map is described as an alternative visual view, not as decorative (rough-mockups review R-03).
- The search box is labelled **Search**. Asking happens in **Ask** (S6), in chat and through MCP (rough-mockups review R-04).

## App shell (all screens)

```
+------------------------------------------------------------------------+
| [=] Context Engine  [ Search items...         ]  Ask  Reviews(3)  (o)  |
+------------------------------------------------------------------------+
| Map | List | My items | Reviews | Settings*        [sun/moon] [bell 2] |
+------------------------------------------------------------------------+
|                                                                        |
|                          (screen content)                              |
|                                                                        |
+------------------------------------------------------------------------+
```

- **Top bar:** product name (each organisation's logo can replace it), Search, Ask, Reviews with a count, theme switch, notifications bell, and account menu.
- **Navigation:** Map, List, My items, Reviews. Settings appears for Admins only (marked * above).
- **Theme:** light and dark follow the device setting, and the sun/moon switch overrides it. (Q4)
- **Narrow screens (below 768 px):** the navigation collapses into the [=] menu, and the home screen is List instead of Map. (stories US3.10)

---

## S1. Map (home) — US3.1, US3.2, US3.3, US3.4, US1.9

```
+------------------------------------------------------------------------+
| Filters: Type [All v] Team [All v] Owner [All v] Show [Fresh+Stale v]  |
|          Colour by: (o) Type ( ) Team ( ) Owner          [3D] [List]   |
+-----------------------------------------------+------------------------+
|                                               | Discount limit         |
|           o         o                         | Business rule - Owned  |
|        o--+---[R] Discount limit              | by Priya (Finance)     |
|       /   |         \                         | Reviewed 12 days ago   |
|  [P] Sales process   [S] CRM ------ o         |                        |
|       \               |                       | Linked (4)             |
|        [T] Finance ---+                       |  > Sales process  [P]  |
|              \                                |  > Finance team   [T]  |
|               [D] ADR-012 Pricing review      |  > CRM            [S]  |
|                                               |  > ADR-012        [D]  |
|  Drag to rotate - scroll to zoom - click node |                        |
|                                               | [Open] [Propose change]|
|                                               | [Simulate]             |
+-----------------------------------------------+------------------------+
| Timeline  [|<] [> Play]  ----------o------------------->  Today        |
| Legend: [R] Rule [P] Process [T] Team [S] System [D] Decision          |
|         [G] Glossary [U] Person   (STALE label on stale items)         |
+------------------------------------------------------------------------+
| ! Slack has not synced for 2 hours. [View connections]  (Admins only)  |
+------------------------------------------------------------------------+
```

- **Nodes:** each type has its own shape and letter marker as well as a colour, so type is never shown by colour alone. Stale items carry a STALE label and a dashed outline.
- **Clusters:** with many items, distant groups collapse into a bubble labelled "Finance (240)". Clicking a bubble expands it.
- **Side panel:** always mirrors the selection and lists the selected item's links as text. It works fully without the 3D view.
- **Timeline:** Play replays items in approval order, and Pause stops it. When the device asks for reduced motion, the replay steps through without animation.
- **States:**
  - Empty: "Nothing here yet." with buttons [Connect a source] and [Add an item].
  - Loading: a skeleton cluster, with "Loading map..." in the panel.
  - Error: "The map could not load. Your knowledge is safe." with [Try again] and [Open list].
  - Filtered to nothing: "No items match these filters." with [Clear filters].
- **Responsive:** on desktop the map and panel sit side by side at 2:1. On tablet the panel becomes a drawer. On phone the screen opens in List view, and the map is available as an option.

---

## S2. Item page — US3.5, US3.6, US2.12, US5.4

```
+------------------------------------------------------------------------+
| Map > Finance > Discount limit                                         |
| [R] Discount limit                       [Propose change v] [...]      |
| Business rule - Owner: Priya (Finance) - Review every 90 days          |
| Last reviewed 12 Sep by Priya - Fresh                                  |
+---------------------------------------------+--------------------------+
| Rule                                        | Linked (4)       [+ Link]|
| Discounts above 15% need finance approval.  |  [P] Sales process       |
|                                             |  [T] Finance team        |
| Why                                         |  [S] CRM                 |
| Agreed in the Q3 pricing review to protect  |  [D] ADR-012             |
| margin.                                     |                          |
|                                             | Life summary (AI)        |
| Sources                                     | [Summarise]              |
|  - Pricing policy.docx (Drive)              | "Created Jan 2025 from   |
|  - #finance, 3 Sep (Slack) - excerpt        |  the pricing policy;     |
|  - Raw transcript: Admins only              |  changed twice..."       |
|                                             |                          |
| [History]  [Still correct - confirm]        |                          |
+---------------------------------------------+--------------------------+
```

- **Propose change** opens a menu with two choices, **Edit in editor** (S5) and **Ask to change** (S6). (Q2)
- The **[...]** menu holds Archive (which raises a proposal), Simulate and Copy link.
- **Still correct - confirm** resets the review date and records who confirmed in the history. Only owners, Approvers and Admins see it. (US5.4)
- **Sources:** everyone sees excerpts. Full raw content shows as "Admins only" to everyone else, by default. (requirements FR12.2)
- **Unowned items** show "Unowned. Approvers decide changes. [Take ownership]".
- **Archived items** show a banner: "Archived on <date> by <name>: <reason>". Their history stays readable.
- **Responsive:** the side column moves below the content on narrow screens.

---

## S3. History — US3.7, US2.6, US2.7

```
+------------------------------------------------------------------------+
| Discount limit > History                                               |
+------------------------------------------------------------------------+
| 12 Sep  Approved   Limit 10% -> 15%                                    |
|         Proposed by Sam - approved by Priya - "Margin review"          |
|         [Before / after]                                               |
| 02 May  Approved   Added renewals exception   SELF-APPROVED            |
|         Proposed and approved by Priya - "Renewals team request"       |
|         [Before / after]                                               |
| 20 Mar  Approved   ADMIN OVERRIDE                                      |
|         Approved by Alex for owner Priya - "Urgent legal change"       |
| 10 Jan  Created    From Pricing policy.docx (Drive) - approved Priya   |
+------------------------------------------------------------------------+
| Before                             | After                             |
| Discounts above [-10%-] need       | Discounts above [+15%+] need      |
| finance approval.                  | finance approval.                 |
+------------------------------------------------------------------------+
```

- Removed text is shown as [-text-] and added text as [+text+], with colour as well. Screen readers announce "removed" and "added".
- The flags SELF-APPROVED and ADMIN OVERRIDE are shown as text badges.
- No control anywhere edits or deletes history. (requirements NFR9)

---

## S4. Reviews and proposal detail — US2.3, US2.4, US2.5, US2.8, US2.9, US2.10, US2.13

```
+------------------------------------------------------------------------+
| Reviews   Show: (o) Waiting for me  ( ) Raised by me  ( ) All           |
+------------------------------------------------------------------------+
| ! HIGH  Refund steps: over $500 needs a manager  from Slack  2 hrs ago |
|   MED   Leave approval: 2-day notice            from Sam    yesterday  |
|   LOW   Glossary: "Churn" wording               from AI agent  3 days  |
+------------------------------------------------------------------------+
| Proposal: Refund steps                       Origin: Slack #ops        |
| Waiting for: Priya (Refund process)  [ok] Theo (Payments system)       |
+---------------------------------+--------------------------------------+
| Before / after                  | Impact                               |
|  Refunds need a manager when    |  Risk: HIGH                          |
|  over [-$1,000-][+$500+].       |  - Business rule changed             |
|                                 |  - 6 items affected                  |
| Source excerpt                  |  - Contradicts "Refund policy v2"    |
|  "from now on refunds over $500 |    [Open conflicting item]           |
|   need manager sign-off" - Kim, |  Directly affected (3)               |
|   #ops, 10:02  [Open in Slack]  |   [P] Refund process                 |
|                                 |   [S] Payments system                |
| Reason given                    |   [T] Support team                   |
|  "Policy change from ops lead"  |  One link further (3)                |
|                                 |   [P] Chargebacks  [D] ADR-007  ...  |
+---------------------------------+--------------------------------------+
| Your decision                                                          |
|  ( ) Approve   ( ) Request changes   ( ) Reject                        |
|  Reason / comment (required for Request changes and Reject): [      ] |
|  [Submit decision]                                                     |
+------------------------------------------------------------------------+
```

- **Several owners:** a proposal that touches items with different owners needs each of them. The "Waiting for" line shows who has approved ([ok]) and who has not. The change applies only when every owner has approved. If any owner rejects, the whole proposal is rejected. (stories review R-04)
- **Request changes** returns the proposal to its proposer with the comment. They revise and resubmit, and the approvals given so far are cleared.
- **Out of date:** a banner reads "This item changed after the proposal was raised", with [Compare versions]. The owner must pick which version wins before approving.
- **Already decided:** if someone else decided first, a banner reads "Already decided by <name>" and the form is disabled.
- **Raised by me:** shows the proposer's own proposals, each with [Withdraw] while undecided.
- **Admin override:** an Admin viewing a proposal that waits on an owner also sees "Decide as Admin (override)", which requires a reason.
- **States:**
  - Empty: "Nothing waiting for you."
  - Assessment unavailable: "Impact assessment unavailable right now", followed by the directly linked items, which are still listed.
- **Responsive:** the two columns stack on narrow screens, with Impact above Before/after because risk is read first.

---

## S5. Editor (document style) — US2.1, US2.2, US2.14

```
+------------------------------------------------------------------------+
| New item / Proposing a change to: Discount limit           [Cancel]    |
+------------------------------------------------------------------------+
| Type [Business rule v]  Owner [@Priya       ]  Review every [90 v] days|
+------------------------------------------------+-----------------------+
| Title                                          | Suggested links (AI)  |
| [Discount limit                              ] |  [x] Sales process    |
|                                                |  [x] Finance team     |
| Rule                                           |  [ ] Marketing promos |
| Discounts above 15% need finance approval for  |  [x] CRM              |
| @Sales process deals ...                       |  [+ Add link]         |
|                    +-------------------+       |                       |
|                    | @Sales process [P]|       | Impact preview        |
|                    | @Sales team    [T]|       |  Risk: MEDIUM         |
|                    +-------------------+       |  4 items affected     |
| Why (required)                                 |  [Full assessment]    |
| [Margin review                               ] |                       |
+------------------------------------------------+-----------------------+
| Draft saved 10:42                    [Save draft] [Submit for approval]|
+------------------------------------------------------------------------+
```

- Typing **@** opens a list of matching items, and choosing one adds it as a link. **Suggested links** are ticked or unticked by the person. (Q3)
- The **impact preview** updates as they type. Submitting creates the proposal (S4).
- Drafts save automatically. Leaving with unsaved changes asks for confirmation. If the session expires, the draft is kept. (stories AC6.1.3)
- **Validation:** missing Title, Type or Why is named under the field, and the text is kept. Readers do not see Propose change at all.

---

## S6. Ask (questions and conversational changes) — US2.2, US4.1, US3.8

```
+------------------------------------------------------------------------+
| Ask                                                       [New chat]   |
+------------------------------------------------------------------------+
| You: What's our refund threshold for manager sign-off?                 |
| Engine: Refunds over $1,000 need a manager. Source: Refund process     |
|         (owner Priya, reviewed 40 days ago). [Open]                    |
| You: Ops now wants it at $500. What would that change?                 |
| Engine: Changing it to $500 affects 6 items. Risk: HIGH, because it    |
|         contradicts "Refund policy v2". Directly affected: Refund      |
|         process, Payments system, Support team. [See full assessment]  |
|         Want me to draft the change?                                   |
| You: Yes, and update the policy too.                                   |
| Engine: Drafted a proposal changing 2 items. [Review draft]            |
+------------------------------------------------------------------------+
| [ Ask a question or describe a change...                     ] [Send] |
+------------------------------------------------------------------------+
```

- **One box for both:** people can ask questions about knowledge, or describe a change and talk it through. The engine shows the full impact before drafting anything, and nothing is proposed until the person opens **Review draft**, checks it in the editor (S5) and submits. (Q2)
- **Answers:** only approved knowledge is stated as fact. Pending proposals are labelled "pending, not yet approved".
- **States:**
  - No answer: "Nothing approved matches. [Raise a gap for an owner]".
  - AI model unavailable: "I can't answer right now. You can still search and browse."
- **Responsive:** the conversation runs full width on every screen size.

---

## S7. Simulate — US3.8, US3.9

```
+------------------------------------------------------------------------+
| Simulate: Discount limit                     Sandbox - nothing changes |
+------------------------------------------------------------------------+
| What if: [Discounts above 20% need finance approval.               ]   |
| [Assess]                                                               |
+-----------------------------------+------------------------------------+
| Would affect (4) - Risk: MEDIUM   | Scenario (AI)                      |
|  [P] Sales process (step 4)       | [A rep offers 18% on a renewal ]   |
|  [S] CRM approval flow            | [Run scenario]                     |
|  [D] ADR-012 mentions 15%         | "Under the change, no finance      |
|  [D] ADR-019 mentions 15%         |  approval is needed. Rules used:   |
|                                   |  Discount limit (sandbox), ..."    |
+-----------------------------------+------------------------------------+
| [Exit without saving]                    [Turn into a proposal]        |
+------------------------------------------------------------------------+
```

- A persistent header label reads "Sandbox - nothing changes". **Turn into a proposal** opens the editor (S5) with the change and its assessment already filled in.

---

## S8. List view — US3.4, US3.10

```
+------------------------------------------------------------------------+
| List            [Search items...]   Sort [Name v]   [3D] [List]        |
+------------------------------------------------------------------------+
| v [T] Finance team (12)                                                |
|     > [R] Discount limit          Priya    Fresh                       |
|     > [R] Expense approvals       Priya    STALE                       |
| v [P] Sales process (8)                                                |
|     > [R] Discount limit (linked)                                      |
+------------------------------------------------------------------------+
| Showing 20 of 340 - [Load more]                                        |
+------------------------------------------------------------------------+
```

- This view has the same filters as the map. On phones it is the home screen.

---

## S9. Settings (Admin) — US1.1 to US1.4, US1.9, US6.3 to US6.6

```
+------------------------------------------------------------------------+
| Settings:  Connections | People and roles | Privacy | AI model | Brand |
+------------------------------------------------------------------------+
| Connections                                              [+ Add]       |
|  Google Workspace  Connected   Last sync 2 min ago   3 folders [Edit]  |
|  Microsoft 365     Connected   Last sync 5 min ago   2 channels [Edit] |
|  Slack             FAILED      Last good sync 2 hrs ago                |
|                    "Token revoked by workspace admin" [Reconnect]      |
|  ChatGPT projects  Import only (no automatic access)  [Upload export]  |
+------------------------------------------------------------------------+
```

- **People and roles:** invite people, set roles and deactivate people. On deactivation, a notice reads "Priya owns 14 items and 3 waiting proposals. They will become unowned and go to Approvers." and asks for confirmation.
- **Privacy:** choose regulation and security-classification presets, and sensitive-content handling (default: keep raw content, visible to Admins only).
- **AI model:** choose a hosted provider (the key is saved as a secret and never shown again) or a self-run endpoint, with [Test connection].
- **Brand:** upload a logo and set the primary colour, which restyles the app for this organisation.
- **Responsive:** the tabs become a dropdown on narrow screens.

---

## S10. My items — US5.3, US5.4

```
+------------------------------------------------------------------------+
| My items        Stale (2)   Due in 7 days (1)   All (14)               |
+------------------------------------------------------------------------+
| STALE  Expense approvals   due 3 days ago   [Still correct] [Edit]     |
| STALE  Travel policy       due 10 days ago  [Still correct] [Edit]     |
| DUE    Discount limit      due in 5 days    [Still correct] [Edit]     |
+------------------------------------------------------------------------+
```

- **Empty state:** "You're up to date."

---

## S11. Notification settings (account menu) — US5.2, US2.7

```
+------------------------------------------------------------------------+
| Notifications                    Web app   Chat (Slack)   Email        |
|  Proposals waiting for me          [x]        [x]          [ ]         |
|  Decisions on my proposals         [x]        [ ]          [x]         |
|  Overrides on my items             [x]        [x]          [x]         |
|  Stale-item reminders              [x]        [x]          [ ]         |
+------------------------------------------------------------------------+
```

- Each person chooses where each kind of notification goes. Web app is always on. Chat is available only when their chat account is linked. (Q5)

---

## S12. First-run setup — US6.7

```
+------------------------------------------------------------------------+
| Set up your Context Engine                     Step 2 of 4             |
|  1 Sign-in [done]  2 AI model  3 First connection  4 Invite people     |
+------------------------------------------------------------------------+
| Choose an AI model                                                     |
|  ( ) Hosted provider  [Claude v]  API key [**********]                 |
|  ( ) Your own model   Endpoint [https://...]                           |
|  [Test connection]                                [Back] [Continue]    |
+------------------------------------------------------------------------+
```

- **Skipping:** any step can be skipped. Skipping the connection step leads to the map's empty state.

---

## S13. Answers in Slack and Teams — US4.2 to US4.6

```
+------------------------------------------------------------------------+
| #sales                                                                 |
| Sam: @context what's our discount limit?                               |
| Context Engine: Discounts above 15% need finance approval.             |
|   Owner: Priya - reviewed 12 days ago - [Open in Context Engine]       |
+------------------------------------------------------------------------+
| (unknown user) Context Engine: I can't match your account. Ask an      |
|   Admin to invite your work email.                                     |
| (stale) ... Note: last reviewed 120 days ago; it may be out of date.   |
| (no match) Nothing approved matches. [Raise a gap]                     |
+------------------------------------------------------------------------+
```

## Assumptions & Open Questions

- The rules for several owners on one proposal (every owner must approve, and any rejection rejects the whole proposal) close stories review R-04. Confirm them at the gate if you prefer another rule.
- Sample content (amounts, names, dates) is illustrative only.
