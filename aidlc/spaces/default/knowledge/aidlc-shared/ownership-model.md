# Ownership Model

The team's decisions on who owns knowledge, who approves changes, and how items relate to the people they apply to. Agreed on 2026-11-26 during U1 Functional Design (`intents/261125-context-engine/construction/u1-walking-skeleton/functional-design/functional-design-questions.md`, Q4, Q8, Q9, Q11).

These decisions change parts of `requirements.md` (FR1.1, FR1.2, FR3.3) and the domain design (`Item.ownerId`). Every later unit follows this file where the two disagree.

## Decisions

1. **Owners are always a list.** An item's owners are never a single value. Each entry is a person, a group or an AI agent. A group with a single member is fine. Every item has at least one entry, and at least one entry is a person or a group, so a human can always decide.
2. **Groups are defined by the organisation.** Examples: techLead, SquadLead, product, Junior, CTO. A group has members, and it carries a role and permission matrix. Groups describe the organisation; they sit alongside the four system roles (Reader, Contributor, Approver, Admin), not in place of them.
3. **One owner approval is enough.** Any one human owner, named directly or through a group, can approve a change. This replaces "every owner must approve" (FR3.3).
4. **Self-approval is allowed and flagged.** An owner may decide on their own proposal; the decision and the new version are marked self-approved.
5. **AI agents can own items but never approve.** An agent may be listed as an owner, may propose changes, and is notified like an owner. Approval is always a person's.
6. **"Applies to" is separate from ownership.** It records who a rule applies to (for example, "tech leads except Tom may deploy"), including exceptions. It is part of the knowledge itself, not access control. Owners decide changes; "applies to" says who the rule covers.
7. **Contexts are linked, and the link defines the relationship.** An item can be linked to a context (for example "Context of TeamX", owned by the CTO, grouping policies). A context can be an item that links to items, or a container that hands information down to the items in it.
8. **Conflicts are flagged, and ideally stopped at creation.** Overlapping or contradictory knowledge (for example "TechLead deploys" against "Junior can also deploy", or two items with the same title and different owners) is flagged. Where possible, a conflicting proposal is stopped when it is created, not only flagged at approval.
9. **Item types are a base type each organisation extends.** One base item with shared fields; the seven types in FR1.1 are the starting list; organisations add their own types and fields.

## Still open

- **Context owner override:** whether a context's owners override, add to, or give way to an item's own owners. To be decided in U3's design.
- **Unowned items:** with owners always a list, whether "unowned" items (FR1.2, US2.1 AC2.1.3, US3.5 AC3.5.2) still exist at all. To be settled in U3 and U6.
- **Link approvals:** in U1, a link change is decided by the owners of the item it starts from. Whether the owners of the item at the other end must also approve is decided in U6.

## Where each decision lands

| Decision | Unit |
|---|---|
| Owners as a list of people, groups and agents | U1 (built), U2, U3, U6 |
| Groups with members and a role and permission matrix | U2 |
| One owner approval is enough; self-approval flagged | U1 (built), U6 |
| Agents own but never approve | U1 (built), U6 |
| "Applies to" with exceptions | U3 |
| Contexts and context owner override | U3 |
| Conflicts flagged and stopped at creation | U5, U6 |
| Organisation-defined item types and fields | U3, U19 |
