## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-26T11:48:07Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/functional-design/functional-spec.md > W1 step 2, W2, W4 step 5; rules.md > BR1.5, BR2.1; entities.md > Proposal, Link | Link handling is not specified well enough to build. (a) W1 lets a create proposal carry links to existing items (AC2.1.1 "links it to a process"), but BR1.5 only triggers on add-link or remove-link proposals, so links inside create or change proposals are never validated. (b) `Link.addedInVersionId` is required, so a link only proposal must create a new ItemVersion, yet Proposal.changes holds just the link and the rules do not say the title, content, owners and sources are copied from the base version. (c) A link touches two items but Proposal has one `itemId` and BR2.1 checks only the base version's owners, so the owners of the to-end item have no say. (d) A link to an item still in `proposed` status (no approved version) is neither allowed nor refused. | Extend BR1.5 to cover links carried by create and change proposals. Add a rule that a link only version copies every field from the base version. Say whose owners decide a link proposal (from-end only, or both ends) and record that choice. State whether a link to a `proposed` item is allowed. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/functional-design/entities.md > Deviations from the domain design | The deviations section lists only `ownerId` and `sourceRefs`. The domain design differs in other ways it does not mention: Proposal had `baseVersionIds` (several items, with `requiredApprovers`) and is now one `itemId` and one `baseVersionId`. Item drops `reviewPeriodDays` and `lastReviewedBy`. | Add these to the deviations list, each with the unit that restores it (U6 for multi-item proposals, U7 for review fields). | New |
| R-03 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/functional-design/entities.md > Proposal.idempotencyKey; functional-spec.md > W1, W3 | `idempotencyKey` is globally unique and optional. The contract (C1) says a key repeats within 24 hours per request and makes the Idempotency-Key header required on POST /v1/proposals. Two different accounts reusing a key would collide. The web path of W1 never mentions a key. A repeat key with a different payload is undefined. | Scope uniqueness to (proposerId, key) with the 24 hour window. Say how the web form supplies a key. Define the response when the same key arrives with a different payload. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/functional-design/rules.md > BR1.6; entities.md > Source | BR1.6 says the system source records proposer, channel and time, but Source has no time field. BR1.6's violation (a bad manual source refuses the proposal) fires at submit time, while its trigger is "proposal approved". It is not stated whether a new version keeps earlier versions' system sources or carries only manual ones plus one new system source. | Add a timestamp to Source or drop "time" from BR1.6. Split validation at submit from system source addition at approval. State how sources carry over between versions. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/functional-design/entities.md > Item.status; functional-spec.md > Item lifecycle, W5 step 5 | When a create proposal is rejected or goes out of date, its Item stays `proposed` with no version, and no state or rule says what happens to it. Before approval the owners exist only inside Proposal.changes, so "shown to its human owners" in W5 depends on that. | Say that such an item stays visible only to the proposer and owners, or add a terminal state. Say that owners for W5 come from the open proposal. | New |
| R-06 | Minor | aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/functional-design/traceability.json > reverse BR5.1 | The reverse entry's N/A target is a prose sentence, not a unit or ID. The story it serves (US2.11) is on U6 and U15 in the story map and not on U1. FR7.3, which BR5.1 implements, is not among the upstream IDs. | Use a resolvable target (u15-mcp-server) for the N/A, or record BR5.1 as a deliberate pull-forward of US2.11 into U1. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Manual cross-check: traceability.json targets against unit-of-work-story-map.md | u6 on US2.1, u3 and u18 on US3.5, u14 on US4.1 all present | Cross-unit targets resolve. Only the reverse BR5.1 target is unresolved. |
| Manual cross-check: BR sources against requirements.md and stories.md | FR1.1 to FR1.3, FR2.1, FR2.3, FR3.1 to FR3.5, FR7.1 to FR7.3, NFR9, NFR10 and all listed ACs exist | Sources are real. |
| Manual cross-check: Q1 to Q11 answers against the design | The Q2, Q3, Q4, Q5, Q6, Q7, Q9, Q10 and Q11 answers are reflected | The design is faithful to the person's answers and the confirmed summary. |

### Summary

The design follows the person's answers and the ownership model in Q11, and its rules and traceability are largely sound. One build-blocking gap remains: link proposals (creation with links, version creation for a link, whose owners decide, links to unapproved items) are not specified. The other findings are minor clean-ups.
