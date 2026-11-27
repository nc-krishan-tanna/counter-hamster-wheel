# Infrastructure Specification — U1 walking skeleton

Where U1's containers run, for both ways the product is offered: self-hosted from containers (one organisation per install) and the hosted service run by the team (many organisations, one running copy, one database). The logical components come from `../nfr-design/logical-components.md`; the security, reliability, scalability, performance and observability designs from the other files in `../nfr-design/`. Answers: `infrastructure-design-questions.md` Q1 to Q5.

Both shapes run the same images and the same Compose file. The only difference is where PostgreSQL lives.

```mermaid
graph LR
    subgraph Self-hosted install
      SU[People and agents] -- HTTPS --> SW[web: Caddy]
      SW --> SA[api]
      SA --> SDB[(postgres container, volume pgdata)]
      SK[worker] --> SDB
      SM[migrate] --> SDB
    end
    subgraph Hosted service, EU region
      HU[People and agents of many organisations] -- "HTTPS *.service address" --> HW[web: Caddy on the VM]
      HW --> HA[api on the VM]
      HA -- "TLS, session pooler" --> HDB[(Supabase PostgreSQL, EU)]
      HK[worker on the VM] -- "TLS, session pooler" --> HDB
      HM[migrate on the VM] -- TLS --> HDB
    end
```

<!-- Text fallback: Self-hosted: people and agents reach the Caddy web container over HTTPS; Caddy forwards to the api; api, worker and the one-shot migrate use a postgres container whose data is on the pgdata volume. Hosted: people and agents of many organisations reach Caddy on one EU virtual machine at their organisation's address under a wildcard name; api, worker and migrate on the same machine use Supabase's managed PostgreSQL in the same EU region over TLS, api and worker through Supabase's session pooler. -->

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| Compute model | Containers: `web` (Caddy with the built React files), `api`, `worker`, and the one-shot `migrate`, run by Docker Compose (`logical-components.md`) | No dependency on one cloud provider (NFR12.1); self-hosters and the hosted service run identical artefacts (Q1) |
| Self-hosted shape | The five services above plus a `postgres` container (PostgreSQL 16) on the named volume `pgdata` | One `docker compose up` with a filled `.env` is the whole setup (NFR12.1, NFR10.7) |
| Hosted shape: containers | One Linux virtual machine in an EU region (Ubuntu LTS, 2 vCPU, 4 GB memory to start) runs `web-hosted`, `api`, `worker` and `migrate` with the same Compose file and the override `compose.hosted.yaml`. The override marks `postgres` with `profiles: [selfhosted]` so it never starts, and replaces the `depends_on` of `api`, `worker` and `migrate` with `!override` so they no longer wait for it. Docker Compose 2.24 or later is required (for `!override`); `deploy/cloud-init.yaml` installs it (Q5) | The least to run; sized up or out in U20's load check (NFR4) |
| Hosted shape: database | Supabase, used only as managed PostgreSQL, in the EU region nearest the VM (for example `eu-central-1` Frankfurt or `eu-west-1` Ireland), Pro plan with its daily backups kept 7 days; point-in-time recovery is a paid add-on, not bought in U1 (Q3, Q4) | Managed backups and upgrades; standard PostgreSQL, so row-level security, roles and pg-boss behave as in the self-hosted shape; Pro because free projects pause when idle and keep no daily backups |
| Region | Every hosted organisation's data, backups included, in the EU (Q4, NFR15); the VM and the Supabase project are in the same EU region | Data location named publicly; low latency between `api` and the database |
| Networking: self-hosted | Only Caddy's 80 and 443 are published; `api`, `worker` and `postgres` sit on the private Compose network (NFR5.1) | `security-design.md`, Transport and edge |
| Networking: hosted | The VM's firewall allows 80 and 443 from anywhere and 22 for key-only SSH by the `deploy` user; nothing else. `migrate`, `api` and `worker` all reach Supabase outbound through its session pooler over TLS (IPv4, port 5432, `sslmode=verify-full` with Supabase's CA certificate); nothing uses Supabase's direct database host, which is IPv6-only without a paid add-on | Same private-network rule as self-hosted; the database is reached only over verified TLS, from an IPv4 VM |
| Addresses | Self-hosted: the install's one address, with a certificate Caddy obtains automatically by the standard HTTP challenge (no DNS token). Hosted: the bare `<service address>` (sign-up from U2, the deploy health check) and `{org}.<service address>` for each organisation, through DNS records for both names pointing at the VM, and one certificate covering both the bare name and `*.<service address>`, obtained by a DNS challenge with the DNS provider's API token. Local development: `acme.localhost` and `globex.localhost` with Caddy's local CA | Each organisation at its own address (contract summary, Organisations); `security-design.md`, Organisation from the address |
| Storage | Self-hosted: volume `pgdata`. Hosted: Supabase storage only; the VM keeps no data beyond container logs and Caddy's certificates (volume `caddy_data`) | Stateless containers (NFR4.1); the VM can be rebuilt from its setup file |
| One-off Supabase setup | A tech lead runs `deploy/bootstrap-supabase.sql` once, in Supabase's SQL editor as Supabase's `postgres` role, following `deploy/README.md`. It creates the roles `ce_migrate`, `ce_api` and `ce_worker` (login, no `BYPASSRLS`, passwords chosen then and stored only in the VM's `.env`), creates schema `pgboss` owned by `ce_migrate`, grants `ce_migrate` `CREATE` on `public`, and revokes `USAGE` on `public` and `pgboss` from Supabase's `anon` and `authenticated` roles. It also turns off the Data API in the project settings. After that, `migrate` (as `ce_migrate`) creates tables, policies and grants as on the self-hosted shape | `ce_migrate` cannot create roles or change Supabase's own roles, so those steps happen once as `postgres`; everything that changes per release stays in `migrate` |
| Environments | Local development (Compose on a laptop), CI (an ephemeral Compose stack per run), and the hosted live copy. No separate staging: every merge to `main` deploys straight to the live copy (team practice), guarded by the end-to-end check | Team deployment practice; `cicd-pipeline.md` |
| IaC approach | In the repository: `compose.yaml`, `compose.hosted.yaml` (the override without `postgres`), the `Caddyfile`, the Dockerfiles, and `deploy/cloud-init.yaml`, which turns a fresh VM into the host (Docker, the `deploy` user, firewall, log rotation). The Supabase project, the VM and the wildcard DNS record are created once by hand, following `deploy/README.md`. `shortcut: one VM and one database created by hand; move them to Terraform when a second hosted copy or region is needed (U20).` | Everything that changes per release is in code; the three one-off resources are documented steps |
| Resource sizing | Compose memory limits: `api` 512 MB, `worker` 256 MB, `web` 128 MB, `migrate` 256 MB. PostgreSQL connections: `api` pool 10, `worker` pool 5 (pg-boss), `migrate` 1 | Fits a 4 GB VM and the Supabase Pro pooler limit with room for a second `api` copy (NFR4.1 test); real sizing comes from U20's load check |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| PostgreSQL (self-hosted) | database, job queue | PostgreSQL 16 container, volume `pgdata`; the container's init script creates the roles `ce_migrate`, `ce_api`, `ce_worker` on first start (the same SQL as the Supabase one-off setup, without the Supabase parts); `migrate` then runs as `ce_migrate` | `security-design.md`, History cannot change and Organisations kept apart |
| Supabase PostgreSQL (hosted) | database, job queue | Pro plan, EU region, daily backups. Tables in `public` and `pgboss`, as in the self-hosted shape, created and owned by `ce_migrate`, so Supabase's default privileges (which apply to objects its own roles create) never grant them to `anon` or `authenticated`. The one-off setup turns off the Data API (its automatic REST API) and removes `anon` and `authenticated` access to both schemas; a migration test checks that neither role can select from any of our tables. Supabase Auth, Storage and Realtime are not used. `migrate`, `api` and `worker` all connect through the session pooler (not the transaction pooler, because pg-boss holds session-level locks) | Same three roles, row-level security and grants as self-hosted. Turning the Data API off and revoking Supabase's own roles stops Supabase's API from becoming a second way into the knowledge tables |
| Job queue | queue | pg-boss (version 10) on schema `pgboss` in the same database; queues created by `migrate`; `retryLimit: 2`, backoff, `<type>.dead` dead-letter queues | `reliability-design.md`, Jobs; no production job types in U1 |
| Caddy (`web` and `web-hosted`) | load-balancer, TLS, static files | Two images from one Dockerfile. `web` (published for self-hosters) is stock Caddy: one site block for the install's address, certificate by the standard HTTP challenge, or Caddy's local CA in development. `web-hosted` (the team's copy only) is built with `xcaddy` and the DNS provider's Caddy module (the provider is fixed in code generation), with one site block for `<service address>, *.<service address>` and the DNS challenge. Both route `/v1`, `/mcp`, `/api/auth` to `api`, never the health or metrics paths | `security-design.md`, Transport and edge; self-hosters need no DNS token |
| DNS | dns | Hosted: `<service address>` and `*.<service address>` A records to the VM (both names are on the certificate); the DNS provider's API token (scoped to that zone) lives only in the VM's `.env` for Caddy | Self-hosters point their one name at their host |
| GitHub Container Registry | image registry | Images `web`, `web-hosted`, `api`, `worker`, `migrate`, tagged with the commit SHA on every merge; `web`, `api`, `worker` and `migrate` also with the version on a release tag | Team deployment practice |
| Secrets | secrets | Self-hosted: the install's `.env`. Hosted: `/opt/context-engine/.env` on the VM, mode 600, owned by `deploy`, written once by a tech lead; GitHub Actions holds only the SSH key, the VM's host key, and the test organisations' tokens for the deploy check | No secret in the repository, an image or a log (NFR5.2, project rule) |
| Cache, search service, CDN | none | Not used in U1 | `performance-design.md`: no cache; search runs in PostgreSQL |

## Shared Infrastructure

U1 creates these for every later unit.

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| PostgreSQL database (schemas `public`, `pgboss`) | U1 (U20 hardens) | Every unit in `api` and `worker` | Roles `ce_api` and `ce_worker` only, row-level security per organisation; schema changes only through `migrate` |
| Job queue (`JobQueue`, contract C3) | U1 | U2, U6, U7, U8, U9 | Each job type owned by its publisher; queues created by `migrate` |
| Caddy edge and the wildcard address | U1 | U18, U19 (`web` pages), U15 (`/mcp`), U2 (sign-up at the bare service address) | Only `/v1`, `/mcp`, `/api/auth` and static files are routed |
| CI workflow and deploy job | U1 | Every unit | Changes reviewed like code |
| Hosted VM and Supabase project | U1 (U20 hardens) | Every unit | SSH only for `deploy`; database only through the three roles |

## Sources
- `../nfr-design/logical-components.md` (components, failure domains), `../nfr-design/security-design.md` (transport, organisations, roles), `../nfr-design/reliability-design.md` (jobs, health, restart), `../nfr-design/scalability-design.md` (stateless, one host), `../nfr-design/performance-design.md` (pool sizes, no cache), `../nfr-design/observability-design.md`.
- `inception/domain-design/components.md` (Tenancy owns each organisation and its hosting region; IdentityAccess resolves the organisation from the address).
- `../functional-design/functional-spec.md` (the two seeded organisations, W7).
- `inception/contract-design/contract-summary.md` (organisations at their own addresses, C3, C8).
- `infrastructure-design-questions.md` Q1 to Q5; team deployment practice.
