# Architecture Decision Records: Domain Design

Inputs: `inception/requirements-analysis/requirements.md` (requirements), `inception/user-stories/stories.md` (stories), `inception/practices-discovery/team-practices.md` (team-practices), `domain-design-questions.md` and `components.md`.

---

## ADR-001: Versioned, append-only history for items

**Context:** The product is "GitHub for business rules". Every change must record who proposed it, who approved it, when, and why (requirements FR2.1). History must not be editable or deletable (requirements NFR9). Owners also need to compare versions (stories US3.7).

**Decision:** Every approved change creates a new, unchangeable ItemVersion. The item's current state is its latest version. KnowledgeGraph owns this, and only ProposalWorkflow can append a version. (Q1)

**Consequences:**
- Positive: history and current state cannot drift apart. Before/after and replay come for free. Accountability is structural.
- Negative: storage grows with every change, which is acceptable at 100-person scale. Queries for "current" need an index on the latest version.
- Security and compliance: an append-only store resists tampering. It conflicts with erasure rights under some privacy laws. That is handled by redacting personal data within a version, not by deleting history, and is to be designed in functional design (requirements review R-06).

**Alternatives Rejected:**
- **Mutable item plus a separate audit log:** the log can drift from reality and needs discipline to stay complete.
- **Full event sourcing of every field change:** more flexible, but more complex than an MVP needs.

## ADR-002: One Item model with a type

**Context:** Seven kinds of knowledge (rule or policy, process, glossary term, person, team, system, decision) all need the same links, history, approval and freshness. (requirements FR1.1, Q4)

**Decision:** One Item entity with a `type` and a small set of type-specific fields (`typeFields`).

**Consequences:**
- Positive: one workflow, one map, one search. New types are cheap to add later.
- Negative: type-specific validation lives in rules keyed on type rather than in separate schemas.
- Security: there is a single permission model across all types.

**Alternatives Rejected:**
- **A separate model per type:** every capability would have to be duplicated or abstracted seven times.

## ADR-003: Shared ImpactAssessment component

**Context:** Risk and blast radius are needed for proposals, the editor's live preview, Ask conversations and Simulate. (requirements FR4, Q2)

**Decision:** One ImpactAssessment component, which all four callers use.

**Consequences:**
- Positive: one set of rules, and consistent risk levels everywhere.
- Negative: it becomes a hot path, so its performance matters. It is a Rust candidate (to be decided later).
- Security: assessments run under the caller's role, so impact lists never reveal items the caller cannot see.

**Alternatives Rejected:**
- **Assessment inside ProposalWorkflow only:** Simulate and Ask would need copies.

## ADR-004: One shared KnowledgeQuery with thin channel adapters

**Context:** People ask in the web app, Slack and Teams, and agents ask through MCP. Answers and role checks must be the same everywhere. (requirements FR7, FR8, FR11.5, Q3)

**Decision:** KnowledgeQuery owns search, answers, conversations, summaries and gap requests. MCPServer, ChatAssistant and WebApp are thin adapters over it.

**Consequences:**
- Positive: there is one place to make answers grounded and role-checked. New channels are cheap to add.
- Negative: KnowledgeQuery is a dependency of every channel, so an outage affects all of them. Mitigation: search and browsing still work when the AI model is down (requirements NFR10).
- Security: role checks happen once, centrally, before any content is returned.

**Alternatives Rejected:**
- **Answering logic per channel:** answers and permissions would drift between channels.

## ADR-005: Ingestion separated from Extraction, joined by events

**Context:** Many sources (requirements FR5), each with its own quirks and failures. A proposal is expected within 5 minutes (requirements NFR1). A failing connection or AI model must not stop the rest (requirements FR5.8, NFR10).

**Decision:** Ingestion fetches and stores source content behind a standard connection contract and publishes "content changed" events. Extraction consumes those events, calls the AI model and raises proposals, with de-duplication and retries.

**Consequences:**
- Positive:
  - A model outage only delays proposals; syncing continues.
  - New connections need no changes to Extraction.
  - The queue absorbs bursts.
- Negative: it adds a queue and eventual consistency between syncing and proposals, which fits the 5-minute target.
- Security: raw content is stored under the sensitive-content policy at ingestion. Extraction reads it under a service role, and logs never contain content (requirements NFR6).

**Alternatives Rejected:**
- **One combined ingest-and-extract component:** a model outage would block syncing, and adding sources would mean touching AI logic.

## ADR-006: AIGateway hides which AI model is used

**Context:** Each organisation chooses a hosted or a self-run model (requirements FR6.4, FR12.3).

**Decision:** All AI calls go through AIGateway. It validates structured output and reports when the model is unavailable.

**Consequences:**
- Positive: one switch for the whole system. Output validation sits in one place.
- Negative: it sets a lowest-common-denominator interface across providers.
- Security: provider keys live only in the secret store and AIGateway. With a self-run model, no content leaves the organisation.

**Alternatives Rejected:**
- **Each component calls its own provider SDK:** this would scatter keys and make "self-run only" hard to guarantee.

## ADR-007: Accountability rules live only in ProposalWorkflow

**Context:** The accountability rules are as follows:
- owners approve, whatever their role;
- Approvers or Admins approve unowned items;
- every owner must approve, and any rejection rejects;
- self-approval is flagged;
- Admin override needs a reason;
- Request changes clears approvals;
- concurrent decisions are refused;
- a proposal is out of date when its base has changed. (stories Q4 defaults, US2.4 to US2.8)

**Decision:** ProposalWorkflow is the only component that decides and the only writer of approved changes to KnowledgeGraph.

**Consequences:**
- Positive: there is one place to test every accountability rule, and no channel can bypass them.
- Negative: ProposalWorkflow has many callers (WebApp, Extraction, KnowledgeQuery, MCPServer).
- Security: all changes, including those from agents, pass the same role and owner checks.

**Alternatives Rejected:**
- **Let KnowledgeGraph accept direct edits from Admins:** this would break the guarantee that every change has a recorded decision.

## ADR-008: Deactivation handled by events from IdentityAccess

**Context:** When an owner leaves, their items become unowned and their waiting proposals go to Approvers (stories US5.5). IdentityAccess must not depend on business components.

**Decision:** IdentityAccess publishes "user deactivated". KnowledgeGraph unowns that user's items. Approval routing in ProposalWorkflow treats unowned items as Approver-decided.

**Consequences:**
- Positive: there are no cycles; IdentityAccess stays independent.
- Negative: there is a short delay between deactivation and reassignment.
- Security: a deactivated user loses access immediately at IdentityAccess, whatever the delay in reassigning their items.

**Alternatives Rejected:**
- **IdentityAccess calls KnowledgeGraph directly:** this creates a dependency cycle risk and couples security to business data.

## ADR-009: Organisations in one shared database, separated by row-level security, owned by Tenancy

**Context:** The product is now also a hosted service for many organisations (requirements FR14, NFR14; stories Group 7). No organisation may see or change another's data through any path. Self-hosted installs run the same product with one organisation (FR14.6). The team chose a shared database with row-level security (requirements Q11) and a separate Tenancy component (Q5).

**Decision:** A new Tenancy component owns organisations, operators, suspension and the support access log, and resolves the organisation for each request from the organisation's address. Every entity of every other component carries `organisationId`, and PostgreSQL row-level security on `organisationId` makes the database refuse cross-organisation reads and writes.

**Consequences:**
- Positive: one copy to run and upgrade; separation is enforced by the database even when code forgets a filter; self-hosted and hosted share one design.
- Negative: every table, index and query carries `organisationId`; a mistake in setting the request's organisation on the database connection would be serious, so it is set in one place and tested on every route, tool and job (NFR14).
- Security and compliance: a single region for all hosted data (NFR15); operator access to an organisation is always recorded and visible to its Admins (FR14.5).

**Alternatives Rejected:**
- **A schema or database per organisation:** stronger physical separation, but many copies to migrate and back up (requirements Q11).
- **Organisations inside IdentityAccess:** mixes customers with people and leaves operators, who belong to no organisation, without a natural home (Q5).

## ADR-010: Chat workspaces and connections belong to exactly one organisation

**Context:** Slack and Teams questions arrive from a workspace, and connections read from a Google or Microsoft tenant or Slack workspace. With many organisations on one service, each inbound event must map to one organisation (stories review R-01 on US4.6).

**Decision:** IdentityAccess links each Slack or Teams workspace to exactly one organisation (ChatWorkspaceLink); Ingestion binds each connection and its credentials to one organisation. A workspace or tenant already linked to another organisation is refused. Chat users are then matched by work email within that organisation only.

**Consequences:**
- Positive: every chat question and synced document has exactly one organisation, so the same email in two organisations is never ambiguous.
- Negative: an organisation that genuinely shares a workspace with another cannot link it; it would need its own workspace.
- Security: no answer or document can cross organisations through a shared workspace.

**Alternatives Rejected:**
- **Match the organisation from the chat user's email alone:** ambiguous when the same email has accounts in several organisations (FR14.2).

## Assumptions & Open Questions

- Erasure requests under privacy laws (ADR-001) are handled by redacting within versions. The detailed design comes in functional design.
