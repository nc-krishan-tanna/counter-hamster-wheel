## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-26T11:50:36Z
**Iteration:** 2
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/functional-design/functional-spec.md > W1 step 2, W2, W4 step 5; rules.md > BR1.5, BR2.1; entities.md > Proposal, Link | Link handling is not specified well enough to build. (a) W1 lets a create proposal carry links to existing items (AC2.1.1 "links it to a process"), but BR1.5 only triggers on add-link or remove-link proposals, so links inside create or change proposals are never validated. (b) `Link.addedInVersionId` is required, so a link only proposal must create a new ItemVersion, yet Proposal.changes holds just the link and the rules do not say the title, content, owners and sources are copied from the base version. (c) A link touches two items but Proposal has one `itemId` and BR2.1 checks only the base version's owners, so the owners of the to-end item have no say. (d) A link to an item still in `proposed` status (no approved version) is neither allowed nor refused. | Extend BR1.5 to cover links carried by create and change proposals. Add a rule that a link only version copies every field from the base version. Say whose owners decide a link proposal (from-end only, or both ends) and record that choice. State whether a link to a `proposed` item is allowed. | Resolved (reviewer) |
| R-02 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/functional-design/entities.md > Deviations from the domain design | The deviations section lists only `ownerId` and `sourceRefs`. The domain design differs in other ways it does not mention: Proposal had `baseVersionIds` (several items, with `requiredApprovers`) and is now one `itemId` and one `baseVersionId`. Item drops `reviewPeriodDays` and `lastReviewedBy`. | Add these to the deviations list, each with the unit that restores it (U6 for multi-item proposals, U7 for review fields). | Resolved (reviewer) |
| R-03 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/functional-design/entities.md > Proposal.idempotencyKey; functional-spec.md > W1, W3 | `idempotencyKey` is globally unique and optional. The contract (C1) says a key repeats within 24 hours per request and makes the Idempotency-Key header required on POST /v1/proposals. Two different accounts reusing a key would collide. The web path of W1 never mentions a key. A repeat key with a different payload is undefined. | Scope uniqueness to (proposerId, key) with the 24 hour window. Say how the web form supplies a key. Define the response when the same key arrives with a different payload. | Unresolved |
| R-04 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/functional-design/rules.md > BR1.6; entities.md > Source | BR1.6 says the system source records proposer, channel and time, but Source has no time field. BR1.6's violation (a bad manual source refuses the proposal) fires at submit time, while its trigger is "proposal approved". It is not stated whether a new version keeps earlier versions' system sources or carries only manual ones plus one new system source. | Add a timestamp to Source or drop "time" from BR1.6. Split validation at submit from system source addition at approval. State how sources carry over between versions. | Resolved (reviewer) |
| R-05 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/functional-design/entities.md > Item.status; functional-spec.md > Item lifecycle, W5 step 5 | When a create proposal is rejected or goes out of date, its Item stays `proposed` with no version, and no state or rule says what happens to it. Before approval the owners exist only inside Proposal.changes, so "shown to its human owners" in W5 depends on that. | Say that such an item stays visible only to the proposer and owners, or add a terminal state. Say that owners for W5 come from the open proposal. | Resolved (reviewer) |
| R-06 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/functional-design/traceability.json > reverse BR5.1 | The reverse entry's N/A target is a prose sentence, not a unit or ID. The story it serves (US2.11) is on U6 and U15 in the story map and not on U1. FR7.3, which BR5.1 implements, is not among the upstream IDs. | Use a resolvable target (u15-mcp-server) for the N/A, or record BR5.1 as a deliberate pull-forward of US2.11 into U1. | Resolved (reviewer) |
| R-07 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/functional-design/functional-spec.md > W4 step 3 and rules.md > BR2.7 | W4 step 3 says a failed check leaves the proposal unchanged, but BR2.7 sets the status to out-of-date when the approval is refused as stale. A developer cannot tell whether a stale approval attempt writes the status change. | State that the stale-approval refusal is the one failed check that also sets the proposal to out-of-date, and that this write is persisted even though the approval is refused. | New |
| R-08 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/functional-design/functional-spec.md > W1 and W2 (idempotency key on the web path) | Same gap as prior R-03. The web path never says who generates the idempotency key, for example a hidden per-form token created when the form is rendered. Without that, a double-click submit creates two proposals. | Say the web form carries a per-render key and that a double submit returns the first proposal. | New |

> R-01 Reviewer note: BR1.5 now triggers on any proposal carrying a link, including create and change, and handles the create case where the from-item has no approved version yet. BR3.3 makes a link-only version copy every unchanged field. The from-item's human owners decide in U1, with the to-item owners deferred to U6, and the edge-case table records this. A link to an item without an approved version is refused.

> R-02 Reviewer note: The deviations list now covers baseVersionId (restored by U6), reviewPeriodDays (U7) and lastReviewedBy (replaced by the current version's approvedBy).

> R-03 Reviewer note: Uniqueness is now per proposer within 24 hours, and a repeat key with a different request is refused as a conflict (BR1.7). Still missing: how the web form supplies the key (W1 does not mention it; W2 only says every proposal carries one).

> R-04 Reviewer note: Source has recordedAt. BR1.6 splits manual-source validation at submission from system-source addition at approval, and states how sources carry over from the base version.

> R-05 Reviewer note: Item.status is only active, so there is no stuck proposed item. BR1.8 covers rejected or out-of-date creates. BR2.1 takes owners from the proposed version for a create, and W5 step 5 shows a pending create to the proposer and named owners.

> R-06 Reviewer note: The reverse entry for BR5.1 now targets u15-mcp-server, which resolves.

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| (none listed for this stage) | Not run | Cross-reference check done by hand: rule IDs BR1.1 to BR5.1 cited in the spec all exist in rules.md. Entity names in the spec resolve in entities.md. The traceability.json reverse target resolves. |

### Summary

The Major link-handling gap from iteration 1 is closed. Rules, entities and workflows now agree on link validation, version copying and who decides. Only Minor items remain (web idempotency key supply, the stale-approval status write), and none blocks implementation.
