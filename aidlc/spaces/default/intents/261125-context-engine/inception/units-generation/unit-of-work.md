# Units of Work

Inputs: `inception/domain-design/components.md` (components), `inception/domain-design/decisions.md` (decisions), `inception/requirements-analysis/requirements.md` (requirements), `inception/user-stories/stories.md` (stories), `inception/refined-mockups/mockups.md` (mockups) and `interaction-spec.md`, plus `units-generation-questions.md` (Q1 to Q7, plan approved).

Shape:
- Mostly one unit per building block. Each tool connection and each big web area is its own unit (Q1).
- Fine-grained, about 1 to 2 weeks per unit for one tech lead with AI assistance (Q2).
- Independent units can be built in parallel (Q4).
- U1 is the thin end-to-end slice (Q5, team Walking Skeleton practice).

**Deployment model: modular monolith (Q3).** At install time the units become four containers. Each unit keeps its own module and boundary inside its container, so parts can be split out later.

| Container | Holds units |
|---|---|
| `api` (main backend) | U2, U3, U6, U7 (web-facing parts), U14, U15, plus the libraries U4, U5 and U17 |
| `worker` (background) | U7 (daily checks and delivery), U8, U9, connectors U10 to U13 |
| `web` | U18, U19 |
| `chatbot` | U16 |

U1 creates the first versions of `api`, `worker` (empty), `web` and the container setup. U20 turns them into production images.

## Unit table

| Unit ID | Directory | Kind | Size | Deployment | Building blocks (components.md) |
|---|---|---|---|---|---|
| U1 | u1-walking-skeleton | service | L | shared (api, web) | Thin slices of KnowledgeGraph, ProposalWorkflow, MCPServer, IdentityAccess (seeded), WebApp |
| U2 | u2-identity-admin | service | L | shared (api) | IdentityAccess, OrgSettings, Tenancy |
| U3 | u3-knowledge-graph | service | M | shared (api) | KnowledgeGraph |
| U4 | u4-ai-gateway | library | S | embedded (api, worker) | AIGateway |
| U5 | u5-impact-assessment | library | M | embedded (api) | ImpactAssessment |
| U6 | u6-proposal-workflow | service | L | shared (api) | ProposalWorkflow |
| U7 | u7-notifications-freshness | service | M | shared (api, worker) | Notifications, Freshness |
| U8 | u8-ingestion-framework | service | M | shared (worker, api) | Ingestion |
| U9 | u9-extraction | service | M | shared (worker) | Extraction |
| U10 | u10-connector-google | library | M | embedded (worker) | Ingestion connection: Google Workspace |
| U11 | u11-connector-microsoft | library | M | embedded (worker) | Ingestion connection: Microsoft 365 |
| U12 | u12-connector-slack | library | S | embedded (worker) | Ingestion connection: Slack |
| U13 | u13-connector-chatgpt | library | S | embedded (worker) | Ingestion connection: ChatGPT projects |
| U14 | u14-knowledge-query | service | M | shared (api) | KnowledgeQuery |
| U15 | u15-mcp-server | service | S | shared (api) | MCPServer |
| U16 | u16-chat-assistant | service | M | standalone (chatbot) | ChatAssistant |
| U17 | u17-simulation | library | S | embedded (api) | Simulation |
| U18 | u18-web-explore | ui | XL | standalone (web) | WebApp: explore screens |
| U19 | u19-web-change-admin | ui | L | standalone (web) | WebApp: change and admin screens |
| U20 | u20-release-packaging | packaging | M | standalone (images) | Production packaging and release |

## Unit definitions

### U1 u1-walking-skeleton (service, L)
**Boundary:** the smallest working integrated slice, which proves every layer connects.

**Responsibilities:**
- Creates the repository layout, the `api`, `worker` and `web` containers, a local container setup, and the GitHub Actions CI. CI follows the team's tests-first practice, with an 80% floor and lint and format checks for TypeScript and Rust.
- Stores an item and its first versions in an append-only way.
- Supports a basic proposal: create or change, owner approves.
- Provides a basic web page to write an item, approve it and read it.
- Provides an MCP tool to read items.
- Uses a seeded sign-in (two accounts: a contributor and an owner).
- Keeps organisations apart from the first table (Q7, ADR-009): seeds two organisations, stamps every U1 table with the organisation, and switches on PostgreSQL row-level security.

**Builds (screens):** a basic item page and a basic approve view. Later web units replace both.

**Notes:** End-to-end check: start the containers, create an item, approve it as its owner, then read it in the page and through MCP; then prove that the second seeded organisation cannot see that item through the page or MCP. Later units deepen each part. The skeleton's code is extended, not thrown away.

### U2 u2-identity-admin (service, L)
**Responsibilities:**
- Sign-in through an established authentication library: Google and Microsoft single sign-on, plus email and password, at the organisation's own address; one account per organisation.
- Users, the four roles, service accounts and permission checks.
- Chat-identity matching by work email; linking each Slack or Teams workspace to one organisation.
- User-deactivated events.
- OrgSettings: privacy and security presets, sensitive-content policy, default review period, branding with a contrast check, and change history.
- Tenancy (Q6, ADR-009): organisations, their addresses and hosting region; finding the organisation for each request; sign-up on the hosted service; suspension and reactivation with recorded reasons; operator accounts; the support access log. Extends U1's organisation stamp and row-level security to the whole product, and owns the automated isolation tests every later unit adds to (NFR14).

**Notes:** No custom password storage, per the project rule to use proven libraries. Grew from M to L when Tenancy was added (Q6). On a self-hosted install, sign-up and operators are switched off.

### U3 u3-knowledge-graph (service, M)
**Responsibilities:**
- One Item model with types and type fields.
- Append-only versions.
- Typed links.
- Archive: no delete.
- Ownership and review data.
- Unowning on user deactivation.
- Graph traversal.
- Text search over approved knowledge.

### U4 u4-ai-gateway (library, S)
**Responsibilities:**
- Model configuration: hosted or self-run, with keys kept as secrets.
- Connection test.
- Validation of structured output.
- An explicit "unavailable" result when the model cannot be reached.

### U5 u5-impact-assessment (library, M)
**Responsibilities:**
- Blast radius: direct links and items one further link away.
- Contradiction detection.
- Risk level with reasons.
- Degraded result when AI is unavailable.

### U6 u6-proposal-workflow (service, L)
**Responsibilities:**
- Drafts and proposals.
- Approval routing: owners whatever their role; Approvers or Admins for unowned items; every owner must approve; any rejection rejects.
- Self-approval flag and Admin override with a reason.
- Request changes and withdraw.
- Out-of-date detection; one decision only (concurrency).
- Archive and link proposals.
- Gap requests.
- Rerouting waiting proposals when a user is deactivated.
- Applying approved changes to U3.

### U7 u7-notifications-freshness (service, M)
**Responsibilities:**
- Notifications and per-person preferences.
- Delivery to the web app, Slack, Teams and email, with limited retries.
- Daily staleness check, reminders, and "still correct" confirmations.
- The owner's stale-and-due list.

### U8 u8-ingestion-framework (service, M)
**Responsibilities:**
- The standard connection contract and connection lifecycle.
- Scope selection.
- File upload.
- Source documents stored under the sensitive-content policy.
- Content-changed events.
- Connection health and failure isolation.

### U9 u9-extraction (service, M)
**Responsibilities:**
- Consumes content events.
- Uses the AI model to extract items and suggest links, and matches them to existing items.
- De-duplication.
- Queues and retries when the model is down.
- Raises proposals with an excerpt and a source link. Target: 95% within 5 minutes.

### U10 u10-connector-google (library, M)
**Responsibilities:** reads Drive documents and Meet transcripts for the folders the Admin chose, following the U8 contract.

### U11 u11-connector-microsoft (library, M)
**Responsibilities:** reads SharePoint and OneDrive documents, Teams chat and Teams transcripts for the chosen scopes.

### U12 u12-connector-slack (library, S)
**Responsibilities:** reads messages in chosen Slack channels.

### U13 u13-connector-chatgpt (library, S)
**Responsibilities:**
- First checks whether automated access to ChatGPT projects exists, and uses it if so.
- Otherwise imports an exported file, importing the valid parts and reporting the rest.

### U14 u14-knowledge-query (service, M)
**Responsibilities:**
- Role-checked search and answers from approved knowledge only, with citations.
- Labels for pending and stale knowledge.
- Ask conversations: impact via U5, and drafts via U6.
- AI life summaries.
- Raising gap requests.
- Expiry of conversation drafts.

### U15 u15-mcp-server (service, S)
**Responsibilities:**
- MCP tools to search, read and propose.
- Service-account authentication; the role decides what an agent may do.
- Answers distinguish approved knowledge from pending.

Extends the U1 read tool.

### U16 u16-chat-assistant (service, M)
**Responsibilities:**
- Slack and Teams bots.
- Identity matching through U2.
- Answers with owner, freshness and a link.
- Gap offer.
- An "unavailable" reply when the engine is unreachable.

### U17 u17-simulation (library, S)
**Responsibilities:** sandbox sessions, assessment of a hypothetical change, and AI scenario runs. Nothing touches real knowledge.

### U18 u18-web-explore (ui, XL)
**Builds screens (mockups):**
- S1 Map: 3D map, filters, timeline, synced side panel.
- S2 Item page.
- S3 History.
- S6 Ask.
- S7 Simulate.
- S8 List view.
- S10 My items.
- The app shell (navigation, theme switch, bell).
- Narrow-screen layouts for these screens.

**Notes:**
- Uses shadcn/ui, and three.js through a proven graph library for the map.
- Must meet WCAG 2.1 AA; the side panel and list view carry everything the map shows.

### U19 u19-web-change-admin (ui, L)
**Builds screens (mockups):**
- S4 Reviews and proposal detail, including the blast-radius panel.
- S5 Editor with @-linking, suggested links and a live impact preview.
- S9 Settings: connections and uploads, people and roles, privacy, AI model, brand.
- S11 Notification settings.
- S12 First-run setup.
- Sign-in screens.
- Hosted service: S14 Sign up, S15 Sign in at the organisation's address, S16 Organisation suspended, S17 Support access log, S18 Operator console (Q6).
- Narrow-screen layouts for these screens.

### U20 u20-release-packaging (packaging, M)
**Responsibilities:**
- Production container images for `api`, `worker`, `web` and `chatbot`.
- Documented install configuration.
- Health checks.
- A load check at 100-person scale, including a second `api` copy.
- Version-tag release workflow.
- Open-source release readiness: README and licence placeholder. Choosing the licence stays with the sponsor.

## Assumptions & Open Questions

- Rust is not assigned to any unit yet. U3's graph traversal and U5's assessment are the candidates. The team decides when the tech stack is chosen, in the unit's design stages.
- Where a later web unit replaces a U1 screen, the U1 screen is removed, not kept beside it.
