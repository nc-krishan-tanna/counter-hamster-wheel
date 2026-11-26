# Business Rules — U1 walking skeleton

The rules the skeleton enforces. Entity names refer to `entities.md`. A "human owner" of an item is a User listed in its owners, or a member of a Group listed in its owners.

```yaml
rules:
  - id: BR1.1
    statement: Every change to knowledge goes through a proposal; nothing is live until the proposal is approved.
    category: policy
    applies_to: Proposal, Item
    trigger: a person or agent submits a create, change, add-link or remove-link request
    logic: IF a request is submitted THEN record a Proposal with status open AND leave the item's current version unchanged
    violation: no direct write path to Item, ItemVersion or Link exists
    source: FR3.1, AC2.1.1

  - id: BR1.2
    statement: A create or change proposal needs a title, a type, content, at least one owner and a reason for the change.
    category: validation
    applies_to: Proposal
    trigger: proposal submitted
    logic: IF title, type, content, owners or reason is missing or empty THEN refuse the proposal and name each missing field
    violation: refused with the list of missing fields; the submitted text is returned unchanged so the person does not lose it
    source: FR1.2, FR2.1, AC2.1.2

  - id: BR1.3
    statement: An item's type comes from the starting list of seven types.
    category: validation
    applies_to: Item
    trigger: proposal submitted
    logic: IF type is not in the starting list THEN refuse the proposal
    violation: refused, naming the allowed types
    source: FR1.1

  - id: BR1.4
    statement: Owners are always a list of people, groups and agents, and at least one entry must be a person or a group with members.
    category: constraint
    applies_to: ItemVersion.owners
    trigger: proposal submitted
    logic: IF owners is empty OR every entry is an agent OR an entry names an unknown or deactivated person, group or agent THEN refuse the proposal
    violation: refused, naming the bad entry
    source: FR1.2, Q11

  - id: BR1.5
    statement: A link joins two different approved items with a type from the starting list, belongs to its from-item, and is added or removed only by proposal.
    category: validation
    applies_to: Link
    trigger: any proposal that adds or removes a link (create, change, add-link or remove-link)
    logic: IF the to-item has no approved version OR (for anything but create) the from-item has no approved version OR both ends are the same item OR the type is not in the list OR (add) the same live link exists OR (remove) the link is not live THEN refuse the proposal. A link change is a change to the from-item; in U1 its human owners decide (BR2.1). Whether the to-item's owners must also approve is left to U6 (FR3.3 "each affected item")
    violation: refused with the reason
    source: FR1.3, Q2

  - id: BR1.6
    statement: Every version carries exactly one system source naming who proposed it, through which channel and when; people may add sources by hand.
    category: policy
    applies_to: ItemVersion.sources
    trigger: manual sources are checked when the proposal is submitted; the system source is added when it is approved
    logic: AT submission, IF a manual source has no title OR an address that is not http or https THEN refuse the proposal. AT approval, the new version's sources are the proposal's manual sources (copied from the base version unless the proposal changes them) plus one new system source (proposer, channel web or mcp, submission time). Earlier versions keep their own system sources in history
    violation: refused at submission, naming the bad source
    source: FR1.2, Q10

  - id: BR2.1
    statement: Only a human owner of the item may decide on a proposal, whatever their role.
    category: authorization
    applies_to: Decision
    trigger: approve or reject requested
    logic: IF the decider is not a human owner of the item (owners of the base version, or of the proposed version for a create) THEN refuse
    violation: refused as not allowed; the proposal stays open
    source: FR3.3, AC2.4.3, AC2.4.4

  - id: BR2.2
    statement: AI agents can own items and propose changes but can never decide.
    category: authorization
    applies_to: Decision
    trigger: a ServiceAccount requests approve or reject
    logic: IF the caller is a ServiceAccount THEN refuse
    violation: refused as not allowed
    source: FR3.3, Q11

  - id: BR2.3
    statement: One approval from any human owner is enough to apply the change.
    category: policy
    applies_to: Proposal
    trigger: a human owner approves
    logic: IF an open, up-to-date proposal is approved by a human owner THEN apply it and set status approved
    violation: not applicable
    source: FR3.3, Q11

  - id: BR2.4
    statement: An owner may decide on their own proposal, and the decision is flagged as self-approved.
    category: policy
    applies_to: Decision, ItemVersion.flags
    trigger: the decider is the proposer
    logic: IF deciderId equals proposerId THEN set isSelfApproval true AND add the self-approved flag to the new version
    violation: not applicable
    source: Q4

  - id: BR2.5
    statement: Rejecting needs a reason; approving may carry one.
    category: validation
    applies_to: Decision
    trigger: reject requested
    logic: IF outcome is rejected AND comment is empty THEN refuse and ask for a reason
    violation: refused, asking for a reason; the proposal stays open
    source: FR2.3, FR3.4, AC2.4.2

  - id: BR2.6
    statement: A proposal is decided once.
    category: constraint
    applies_to: Proposal, Decision
    trigger: approve or reject requested
    logic: IF the proposal status is not open THEN refuse
    violation: refused as already decided
    source: FR3.3

  - id: BR2.7
    statement: A proposal based on an older version cannot be approved.
    category: constraint
    applies_to: Proposal
    trigger: approve requested, or another proposal on the same item approved
    logic: IF the proposal's baseVersionId is not the item's currentVersionId THEN set status out-of-date AND refuse the approval
    violation: refused as out of date; the proposer raises it again against the current version
    source: FR3.5, Q5

  - id: BR3.1
    statement: Each approval creates a new version that records the proposer, the decider, the time, the reason and any self-approval.
    category: policy
    applies_to: ItemVersion, Decision
    trigger: proposal approved
    logic: IF approved THEN create ItemVersion n+1 AND point the item at it AND set lastReviewedAt to the approval time
    violation: if any part fails, nothing is applied and the proposal stays open
    source: FR2.1, FR2.3, AC2.4.1

  - id: BR3.3
    statement: A new version copies every field the proposal does not change from the base version.
    category: policy
    applies_to: ItemVersion
    trigger: proposal approved
    logic: IF a proposal changes only some fields, owners, sources or links (for example a link-only proposal) THEN the new version takes the base version's values for everything else
    violation: not applicable
    source: FR2.1

  - id: BR3.2
    statement: History cannot be edited or deleted by anyone.
    category: constraint
    applies_to: ItemVersion, Proposal, Decision, Link
    trigger: any request to edit or delete history
    logic: IF a request would change or delete a version, decision or link record THEN refuse
    violation: no such operation exists
    source: NFR9

  - id: BR4.1
    statement: Readers see the approved version; open proposals are listed separately and marked "not yet approved".
    category: policy
    applies_to: item page, MCP get_item
    trigger: an item is read
    logic: IF an item has open proposals THEN return the approved version AND list the open proposals marked not yet approved
    violation: not applicable
    source: FR7.2, AC4.1.2

  - id: BR4.2
    statement: Search returns approved items only, matched on title and content, each with its owners and sources.
    category: policy
    applies_to: MCP search_knowledge
    trigger: a search is made
    logic: IF an item has no approved version THEN leave it out of results
    violation: not applicable
    source: FR7.1, AC4.1.1

  - id: BR1.7
    statement: Repeating a proposal with the same idempotency key does not create a duplicate.
    category: constraint
    applies_to: Proposal
    trigger: a proposal is submitted through the web page or MCP
    logic: IF the same proposer used the same key within 24 hours AND the request is the same THEN return the first proposal; IF the request differs THEN refuse it as a key conflict
    violation: refused as a key conflict; nothing is created
    source: FR3.1, contract C1

  - id: BR1.8
    statement: A rejected or out-of-date create proposal leaves no item behind.
    category: constraint
    applies_to: Proposal, Item
    trigger: a create proposal is rejected or becomes out of date
    logic: IF a create proposal ends without approval THEN no Item is created; the proposal and its decision stay in the proposer's history
    violation: not applicable
    source: FR3.1, FR2.3

  - id: BR5.1
    statement: An agent with the Contributor role may propose through MCP, and the proposal is marked as coming from an AI agent.
    category: authorization
    applies_to: MCP propose_change
    trigger: an agent proposes
    logic: IF the ServiceAccount role is Contributor THEN create the proposal with origin ai-agent ELSE refuse
    violation: refused as not allowed
    source: FR7.3, Q7
```

## Rules summary

| Rule | In short |
|---|---|
| BR1.1 | All changes go through proposals; nothing live until approved |
| BR1.2 | Title, type, content, owners and a reason required; missing fields named, text kept |
| BR1.3 | Type from the starting list of seven |
| BR1.4 | Owners always a list; at least one person or group |
| BR1.5 | Links join two different items, typed, by proposal only |
| BR1.6 | One system source per version; manual sources checked at submission |
| BR1.7 | Same idempotency key, same request: no duplicate |
| BR1.8 | Rejected create proposals leave no item |
| BR2.1 | Only a human owner decides |
| BR2.2 | Agents never decide |
| BR2.3 | One owner approval is enough |
| BR2.4 | Self-approval allowed and flagged |
| BR2.5 | Reject needs a reason |
| BR2.6 | Decided once |
| BR2.7 | Out-of-date proposals cannot be approved |
| BR3.1 | Approval creates a new version with who, when, why |
| BR3.2 | History is never edited or deleted |
| BR3.3 | Unchanged fields copy from the base version |
| BR4.1 | Read shows approved; pending marked separately |
| BR4.2 | Search shows approved only |
| BR5.1 | Contributor agents may propose, marked "AI agent" |

## New requirements recorded here for later units

These come from the team's decisions in this stage (Q8, Q11) and are not in `requirements.md` yet. Each later unit's design picks them up.

| New requirement | Origin | Later unit |
|---|---|---|
| Organisations define their own item types and fields on top of the base item | Q1, Q8 | U3, U19 |
| Owners are a list of people, groups and agents (replaces "owner (optional)" in FR1.2) | Q11 | U2, U3, U6 |
| Groups with members and a role and permission matrix | Q11 | U2 |
| One owner approval is enough (replaces "every owner must approve") | Q11 | U6 |
| Agents may own items but never approve | Q11 | U6 |
| "Applies to": who a rule applies to, with exceptions, separate from ownership | Q11 | U3 |
| Contexts linked to items, where the link defines the relationship; a context may hand information down; owner override decided in U3 | Q11 | U3 |
| Conflicting knowledge flagged, and ideally stopped when the proposal is created | Q11 | U5, U6 |

## Sources
- `inception/requirements-analysis/requirements.md` (FR and NFR IDs).
- `inception/user-stories/stories.md` (acceptance criteria).
- `functional-design-questions.md` Q1 to Q11.
