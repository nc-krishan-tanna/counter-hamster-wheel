# Entities — U1 walking skeleton

The entity model for the thin end-to-end slice. Names follow the component catalogue (`inception/domain-design/components.md`): `Item`, `ItemVersion` and `Link` (KnowledgeGraph), `Proposal` and `Decision` (ProposalWorkflow), `User` and `ServiceAccount` (IdentityAccess). U1 adds `Group`, `OwnerRef` and `Source` as recorded in `functional-design-questions.md` Q10 and Q11. Later units extend these entities; they do not replace them.

**Organisations (added 2026-11-26; requirements FR14, NFR14; domain design ADR-009).** Every entity below except `Organisation` carries `organisationId` (required, references Organisation) and belongs to exactly one organisation. The database refuses to read or write a row of another organisation. U1 creates `Organisation` in its smallest form and seeds two of them; U2 (Tenancy) adds sign-up, suspension, operators and the support log.

```yaml
entities:
  - name: Organisation
    description: One customer of the product. Seeded in U1 (two organisations); created by sign-up from U2.
    attributes:
      - { name: organisationId, type: identifier, required: true, unique: true }
      - { name: name, type: text, required: true, max: 120 }
      - { name: address, type: text, required: true, unique: true, constraints: "lower-case letters, digits and hyphens; the organisation's own web address is built from it" }
      - { name: status, type: enum, required: true, allowed: [active], default: active, constraints: "suspended comes in U2" }

  - name: User
    description: A person who signs in. Seeded in U1 (a contributor and a human owner); real sign-in comes in U2.
    attributes:
      - { name: userId, type: identifier, required: true, unique: true }
      - { name: email, type: email, required: true, constraints: "unique within its organisation; the same email may have an account in another organisation" }
      - { name: displayName, type: text, required: true, max: 120 }
      - { name: role, type: enum, required: true, allowed: [Reader, Contributor, Approver, Admin], default: Contributor }
      - { name: status, type: enum, required: true, allowed: [active, deactivated], default: active }
    relationships:
      - { to: Group, cardinality: many-to-many, direction: User is a member of Groups }

  - name: ServiceAccount
    description: An AI agent's account for MCP. Seeded in U1 with the Contributor role.
    attributes:
      - { name: serviceAccountId, type: identifier, required: true, unique: true }
      - { name: name, type: text, required: true, max: 120 }
      - { name: role, type: enum, required: true, allowed: [Reader, Contributor], default: Contributor }
      - { name: tokenRef, type: secret-reference, required: true, constraints: "token value never stored in plain text" }
      - { name: status, type: enum, required: true, allowed: [active, deactivated], default: active }

  - name: Group
    description: A named set of people, defined by the organisation (for example techLead). U1 seeds one group containing the human owner; the role and permission matrix comes in U2.
    attributes:
      - { name: groupId, type: identifier, required: true, unique: true }
      - { name: name, type: text, required: true, max: 80, constraints: "unique within its organisation" }
      - { name: memberUserIds, type: list<identifier>, required: true, references: User, min: 1, constraints: "members belong to the group's organisation" }

  - name: OwnerRef
    description: One entry in an item's owners list. Value object, stored inside ItemVersion.
    attributes:
      - { name: kind, type: enum, required: true, allowed: [user, group, agent] }
      - { name: refId, type: identifier, required: true, references: "User, Group or ServiceAccount by kind" }

  - name: Item
    description: A piece of organisational knowledge. Its content lives in versions; the Item row points at the current approved one. An Item exists only once its create proposal is approved.
    attributes:
      - { name: itemId, type: identifier, required: true, unique: true }
      - { name: type, type: enum, required: true, allowed: [business-rule-or-policy, process, glossary-term, person, team, system, decision], constraints: "starting list; organisation-defined types come in U3" }
      - { name: currentVersionId, type: identifier, required: true, references: ItemVersion }
      - { name: status, type: enum, required: true, allowed: [active], default: active, constraints: "archived comes in U6" }
      - { name: lastReviewedAt, type: timestamp, required: false, constraints: "set to the approval time of the current version" }
    relationships:
      - { to: ItemVersion, cardinality: one-to-many, direction: Item has versions }
      - { to: Link, cardinality: one-to-many, direction: Item is the from-end of links }

  - name: ItemVersion
    description: An immutable snapshot of an item, created only by an approved proposal.
    attributes:
      - { name: versionId, type: identifier, required: true, unique: true }
      - { name: itemId, type: identifier, required: true, references: Item }
      - { name: versionNumber, type: integer, required: true, min: 1, constraints: "unique per item, increments by 1" }
      - { name: title, type: text, required: true, min: 1, max: 200 }
      - { name: content, type: long-text, required: true, min: 1 }
      - { name: why, type: long-text, required: false, constraints: "the reason the knowledge exists" }
      - { name: owners, type: list<OwnerRef>, required: true, min: 1 }
      - { name: sources, type: list<Source>, required: true, min: 1, constraints: "always holds the system source" }
      - { name: proposalId, type: identifier, required: true, references: Proposal }
      - { name: approvedBy, type: identifier, required: true, references: User }
      - { name: approvedAt, type: timestamp, required: true }
      - { name: flags, type: list<enum>, required: false, allowed: [self-approved] }
    constraints:
      - "never updated or deleted after creation"

  - name: Source
    description: Where a version's knowledge came from. Value object inside ItemVersion.
    attributes:
      - { name: kind, type: enum, required: true, allowed: [system, manual], constraints: "connected-tool sources come in U8 and U9" }
      - { name: title, type: text, required: true, max: 200 }
      - { name: url, type: url, required: false, allowed: [http, https] }
      - { name: author, type: identifier, required: false, constraints: "system sources only: the proposer (User or ServiceAccount)" }
      - { name: channel, type: enum, required: false, allowed: [web, mcp], constraints: "system sources only" }
      - { name: recordedAt, type: timestamp, required: false, constraints: "system sources only: when the proposal was submitted" }

  - name: Link
    description: A typed connection between two items.
    attributes:
      - { name: linkId, type: identifier, required: true, unique: true }
      - { name: fromItemId, type: identifier, required: true, references: Item }
      - { name: toItemId, type: identifier, required: true, references: Item }
      - { name: linkType, type: enum, required: true, allowed: [relates-to, depends-on, part-of, applies-to], constraints: "starting list; U3 finalises link types, contexts and applies-to" }
      - { name: addedInVersionId, type: identifier, required: true, references: ItemVersion }
      - { name: removedInVersionId, type: identifier, required: false, references: ItemVersion }
    constraints:
      - "fromItemId differs from toItemId"
      - "at most one live link per (fromItemId, toItemId, linkType)"

  - name: Proposal
    description: A requested change. Nothing is live until it is approved.
    attributes:
      - { name: proposalId, type: identifier, required: true, unique: true }
      - { name: kind, type: enum, required: true, allowed: [create, change, add-link, remove-link] }
      - { name: itemId, type: identifier, required: true, references: Item, constraints: "for a create proposal, an identifier reserved at submission; the Item is created with it on approval" }
      - { name: baseVersionId, type: identifier, required: false, constraints: "required for every kind except create" }
      - { name: changes, type: structured, required: true, constraints: "the proposed field values, owners, sources or link" }
      - { name: reason, type: long-text, required: true, constraints: "why the change is made (FR2.1)" }
      - { name: origin, type: enum, required: true, allowed: [person, ai-agent] }
      - { name: proposerId, type: identifier, required: true, references: "User or ServiceAccount" }
      - { name: status, type: enum, required: true, allowed: [open, approved, rejected, out-of-date], default: open }
      - { name: createdAt, type: timestamp, required: true }
      - { name: idempotencyKey, type: text, required: true, max: 200, constraints: "contract C1 Idempotency-Key, on web and MCP alike; unique per proposer within 24 hours, within the organisation" }
    relationships:
      - { to: Decision, cardinality: one-to-zero-or-one, direction: Proposal has at most one Decision }

  - name: Decision
    description: The single decision on a proposal.
    attributes:
      - { name: decisionId, type: identifier, required: true, unique: true }
      - { name: proposalId, type: identifier, required: true, unique: true, references: Proposal }
      - { name: deciderId, type: identifier, required: true, references: User }
      - { name: outcome, type: enum, required: true, allowed: [approved, rejected] }
      - { name: comment, type: long-text, required: false, constraints: "required when outcome is rejected" }
      - { name: isSelfApproval, type: boolean, required: true, default: false }
      - { name: decidedAt, type: timestamp, required: true }
```

## Summary

- **Item, ItemVersion, Link** hold the knowledge. Versions are append-only; the item points at the current approved version; links record the version that added and removed them, so history shows link changes.
- **Proposal and Decision** hold every change and its single decision. A proposal records the version it was based on, which is how out-of-date proposals are caught.
- **Owners** are always a list of `OwnerRef` entries (a person, a group or an agent), stored on each version so ownership changes are part of history.
- **Sources** are a system source (who proposed and through which channel) on every version, plus any added by hand.
- **User, ServiceAccount, Group** are seeded in U1 and replaced by real sign-in, groups and permissions in U2.
- **Organisation** scopes everything else: two are seeded, every other entity carries `organisationId`, and owners, group members and both ends of a link always share the item's organisation.

## Deviations from the domain design

- `Item.ownerId` (zero or one owner User) becomes `ItemVersion.owners`, a list of people, groups and agents, per the team's ownership decision (Q11). Recorded as a new requirement for U2, U3 and U6 in `rules.md`.
- `ItemVersion.sourceRefs` (to SourceDocuments) becomes a list of `Source` values until U8 adds SourceDocuments (Q10).
- `Proposal.baseVersionIds` (a list, for proposals over several items) becomes a single `baseVersionId`: in U1 a proposal changes one item, and a link belongs to its from-item (BR1.5). U6 restores the list when multi-item proposals arrive.
- `Item.reviewPeriodDays` and `Item.lastReviewedBy` are left out of U1: review periods come with U7 (freshness); the last reviewer is the current version's `approvedBy`.
- `Item.ownerId` and `Item.status: proposed` are dropped: an Item exists only after its create proposal is approved, so there are no half-created items.

## Sources
- `inception/domain-design/components.md` (entity names and attributes).
- `inception/units-generation/unit-of-work.md` (U1 boundary).
- `inception/contract-design/contract-summary.md` (C1 idempotency, C2 MCP tools, organisation rules).
- `inception/requirements-analysis/requirements.md` FR14, NFR14; `inception/units-generation/units-generation-questions.md` Q7.
- `functional-design-questions.md` Q1 to Q11.
