# Functional Design — U1 walking skeleton — Questions

Context: U1 is the thin end-to-end slice (`inception/units-generation/unit-of-work.md`): an item goes in, is approved by its owner, is stored with its history, and is read back on a basic web page and through MCP, all from containers, with two seeded accounts (a contributor and an owner). It delivers thin versions of four stories: create an item (US2.1), decide on a proposal (US2.4), read an item (US3.5) and an AI agent reads context (US4.1). Later units finish them (U3, U6, U14, U15, U18, U19). These questions settle how thin each part is. Each first option is my recommendation.

## Q1. [Product owner] Which item types does the skeleton support?

The full product has several item types (rules, processes, systems and so on), each with its own fields (FR1.1).

A. All item types from the start, with only the shared fields (title, type, content, reason, owner); type-specific fields come in U3 (Recommended: the model does not need reshaping later, and the form stays small)
B. One generic type only; types arrive in U3
C. All types with their full type-specific fields
X. Other (please specify)

[Answer]: X. Other: We need a base type for the item to be then extended as needed for each org

## Q2. [Product owner] What can a proposal do in the skeleton?

A. Create a new item and change an existing one's fields; no links, no archive (Recommended: matches U1's definition "create or change, owner approves")
B. Create only; changes come in U6
C. Create, change and add links between items
X. Other (please specify)

[Answer]: C

## Q3. [Product owner] Which decisions can the owner make in the skeleton?

Full decisions are approve, request changes or reject, with a reason required for rejection (US2.4).

A. Approve and reject, with a reason required to reject; request changes and withdraw come in U6 (Recommended: proves both outcomes reach history)
B. Approve only
C. All three decisions plus withdraw
X. Other (please specify)

[Answer]: A

## Q4. [Product owner] Who must approve, and can someone approve their own proposal?

The skeleton has two seeded accounts: a contributor and an owner. The full rules (unowned items go to Approvers or Admins; self-approval is flagged) come in U6.

A. Every item must have an owner in the skeleton; only that owner can decide; an owner cannot decide on their own proposal (Recommended: the simplest rule that still proves approvals are accountable; "unowned" and self-approval come in U6)
B. Owner optional; unowned items can be approved by the owner account as a stand-in Admin
C. Owners may approve their own proposals, flagged as self-approved
X. Other (please specify)

[Answer]: C

## Q5. [Tech lead] What if two proposals change the same item?

A. Both can be open; each records the version it was based on; when one is approved, the other is refused as out of date and must be raised again (Recommended: proves the "one decision only" rule from US2.4 early, at little cost)
B. Only one open proposal per item; a second is refused until the first is decided
C. Ignore it in the skeleton; last approval wins
X. Other (please specify)

[Answer]: A

## Q6. [Product owner] What does the basic item page show?

A. Content, reason, type, owner and the full history (who proposed, who decided, when and why), plus a note when a proposal is pending (Recommended: shows the history and "pending" are real end to end)
B. Content and owner only
C. Everything in A plus links and sources
X. Other (please specify)

[Answer]: C

## Q7. [Tech lead] What can an AI agent do through MCP in the skeleton?

A. Read an item by id and search approved items by text; pending changes are marked "not yet approved"; no proposing (Recommended: proves the agent path with the two read tools later units extend; proposing comes in U15)
B. Read an item by id only
C. Read, search and propose
X. Other (please specify)

[Answer]: C

## Q8. [Product owner] Follow-up to Q1: who defines the item types, and when?

You answered that items need a base type that each organisation extends as needed. The requirements list seven fixed types (FR1.1: business rule or policy, process, glossary term, person, team, system, decision), so organisation-defined types are new and need a home.

A. The skeleton builds one base item (title, type, content, reason, owner) with the type as a value from a list; the seven types ship as the starting list, and letting an Admin add their own types and fields becomes a new requirement for U3 (data) and U19 (settings screen) (Recommended: the skeleton's model is already extensible, and the extension feature is built where types and settings live)
B. Same base item, and the skeleton already lets an Admin add a new type (name only, no extra fields)
C. Same base item, and the skeleton lets an Admin add types with their own fields
X. Other (please specify)

[Answer]: A

## Q9. [Product owner] Follow-up to Q4: must every item have an owner in the skeleton?

You chose that owners may approve their own proposals, flagged as self-approved. That leaves open whether an item can be created without an owner (FR1.2 makes the owner optional; unowned items are approved by Approvers or Admins in U6).

A. Owner required in the skeleton; only the owner decides, and deciding on your own proposal is allowed but flagged (Recommended: the skeleton has no Approver or Admin role yet)
B. Owner optional; the seeded owner account acts as a stand-in Admin for unowned items
X. Other (please specify)

[Answer]: X. Other: answered by the ownership discussion in Q11: owners are always an array of elements, never a single one (a group with a single member is fine); one owner approval is enough; agents cannot approve.

## Q10. [Product owner] Follow-up to Q6: where do an item's sources come from in the skeleton?

You chose to show links and sources on the item page. Sources normally come from connected tools through ingestion (U8, U9), which the skeleton does not have.

A. The person writing the proposal adds sources by hand as a title and an optional web address; the page shows them; connected-tool sources and "restricted" excerpts come with U8 and U9 (Recommended: proves the field end to end without ingestion)
B. No sources in the skeleton after all; the page shows links only
X. Other (please specify)

[Answer]: X. Other: source can be self-generated or hand-generated if needed

## Q11. [Product owner] Ownership model (discussion of the team's board)

The team shared a board sketch of item ownership: owners given as a person or a list of groups (techLead, Admin, SquadLead, product), group membership (TechLead: Krish, lorenzo), items owned by a mix of groups and an agent, an "allows" list with an exception (techLead except Tom) beside an owner (CTO), a "Context of TeamX" owned by the CTO grouping policies, and grey areas (TechLead deploys; Junior can also deploy). My reading was put back as six points and five open decisions; the answer below is the team's reply.

A. Ownership model as answered below
X. Other (please specify)

[Answer]: X. Other: 1: owners are always an array of elements. Never a single one (unless a group contains one single item which is fine). 2: Groups have a role and permission matrix. 3: fine (owners can mix people, groups and AI agents). 4: yes exactly ("allows" is separate from "owner"). 5: yes (items can be grouped into a context). 6: yes (grey areas are the point). One owner approval is fine. Yes agents cannot approve. Yes it is who the rule applies to. Context should track linked context. The link defines the relationship. It can be both an item that links to an item or a container that hands down info, but the owner override will be discussed more when we get to the unit. Conflicts to flag. Ideally would be stopped at creation.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

**What U1 builds**
- One base item with shared fields (title, type, content, reason, owners, sources); the type comes from a starting list of the seven types in FR1.1 [Q1, Q8].
- Proposals can create an item, change its fields, and add or remove links between items [Q2].
- Decisions: approve, or reject with a required reason [Q3].
- Owners are always a list: each entry is a person, a group or an AI agent; every item has at least one entry. One approval from any human owner (directly or through a group) is enough; an owner may decide on their own proposal, and it is flagged as self-approved; agents can own but never approve [Q4, Q9, Q11].
- Two proposals on the same item can both be open; each records the version it was based on; once one is approved, the other is refused as out of date [Q5].
- The item page shows content, reason, type, owners, links, sources and the full history, plus a note when a proposal is pending [Q6].
- Sources are either generated by the system (where the item came from: who wrote it and through which channel, web or MCP) or added by hand (a title and an optional web address) [Q10].
- MCP: AI agents can read an item, search approved items and propose changes; pending changes are marked "not yet approved" [Q7].
- Seeded for the skeleton: a contributor, a human owner, an AI agent service account (Contributor role), and one group containing the human owner, so group ownership is proven end to end.

**New requirements this design records for later units** [Q8, Q11]
- Organisations define their own item types and fields on top of the base item (U3 data, U19 settings).
- Groups with members and a role and permission matrix (U2).
- One owner approval is enough, replacing "every owner must approve" (U6).
- Agents may own items but never approve (U6).
- "Applies to": who a rule applies to, with exceptions such as "tech leads except Tom", kept separate from ownership (U3).
- Contexts: an item can be linked to a context, and the link defines the relationship; a context can be an item that links to items, or a container that hands information down; whether its owner overrides an item's owners is decided in U3.
- Conflicting knowledge is flagged, and ideally stopped when the proposal is created (U5, U6).

- Looks correct
- Request changes

[Answer]: Looks correct
