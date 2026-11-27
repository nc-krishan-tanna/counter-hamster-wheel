# Running the Context Engine

Two ways to run the same images: self-hosted (one install, its own PostgreSQL container) and the
team's hosted service (many organisations, Supabase PostgreSQL in the EU). Design:
`aidlc/spaces/default/intents/261125-context-engine/construction/u1-walking-skeleton/infrastructure-design/`.

## Local development and self-hosting

1. Install Docker with Compose 2.24 or later.
2. `cp .env.example .env` and fill in every value. Generate secrets, for example
   `openssl rand -base64 32`. The database URLs use the role passwords:
   `DATABASE_URL_API=postgres://ce_api:<CE_API_PASSWORD>@postgres:5432/ce` (likewise `ce_worker`,
   `ce_migrate`). Locally set `PUBLIC_BASE_DOMAIN=localhost`; a self-hosted install sets its own
   domain and `SITE_ADDRESS=<address>.<domain>`.
3. `docker compose up -d --wait`. `migrate` runs first (tables, row-level security, grants, job
   queue, seed), then `api`, `worker` and `web` start.
4. Locally, open `https://acme.localhost` and `https://globex.localhost`. Run `caddy trust` (or
   import the root certificate from `docker compose cp web:/data/caddy/pki/authorities/local/root.crt .`)
   to stop browser warnings. Sign in as `owner@acme.example` or `contributor@acme.example` with the
   passwords from `.env`.
5. Agents use MCP at `https://acme.localhost/mcp` with `Authorization: Bearer <SEED_ACME_AGENT_TOKEN>`.
   Non-browser clients may need `--resolve acme.localhost:443:127.0.0.1`.

The end-to-end check (W7) against the running stack:

```bash
docker compose cp web:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
set -a; . ./.env; set +a
E2E_BASE_HOSTS=acme.localhost,globex.localhost E2E_CA_FILE=./caddy-root.crt \
  npx vitest run --coverage.enabled=false e2e/w7.u1.test.ts
```

Upgrading a self-hosted install: set `IMAGE_PREFIX=ghcr.io/<owner>/context-engine` and
`IMAGE_TAG=<version>` in `.env`, then `docker compose pull && docker compose up -d --wait`.

## The hosted service: first-time setup (a tech lead, once)

1. **Supabase.** Create a project on the Pro plan in the EU region nearest the VM (for example
   Frankfurt). Open the SQL editor and run `deploy/bootstrap-supabase.sql` with three new passwords.
   Turn off the Data API (Project Settings, Data API). Download the project's CA certificate.
2. **Connection strings.** Use the **session pooler** (not the transaction pooler: pg-boss holds
   session-level locks), IPv4, port 5432, with verified TLS. The pooler user is `<role>.<project-ref>`:
   `DATABASE_URL_API=postgres://ce_api.<project-ref>:<password>@<pooler-host>:5432/postgres?sslmode=verify-full&sslrootcert=/run/supabase-ca.crt`
   (likewise `ce_worker`, `ce_migrate`).
3. **VM.** Create an Ubuntu LTS VM (2 vCPU, 4 GB) in the same EU region with `deploy/cloud-init.yaml`
   as its user data (put the deploy public key in it first).
4. **DNS.** Point `<service address>` and `*.<service address>` (A records) at the VM. Create a DNS
   provider API token scoped to that zone (Cloudflare by default; another provider: build
   `web-hosted` with `--build-arg DNS_MODULE=...` and change `deploy/Caddyfile.hosted`).
5. **Secrets on the VM.** As `deploy`, write `/opt/context-engine/.env` (mode 600) with the
   database URLs, `BETTER_AUTH_SECRET`, `PUBLIC_BASE_DOMAIN=<service address>`, `SERVICE_ADDRESS`,
   `DNS_API_TOKEN`, `SUPABASE_CA_FILE=/opt/context-engine/supabase-ca.crt` (copy the certificate
   there), and the `SEED_E2E_A_*` / `SEED_E2E_B_*` values for the two test organisations.
   Never put real organisation content in the test organisations.
6. **GitHub.** In the environment `live` (deployment branches: `main` only) add the secrets
   `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS` (the VM's pinned host key) and the same `SEED_E2E_*`
   values, and the variable `SERVICE_ADDRESS`. Protect `main`: the `ci` workflow must pass and one
   other tech lead must approve.

From then on every merge to `main` deploys itself (`.github/workflows/deploy.yml`).

## Operating the hosted service

- **Status and logs:** `ssh deploy@<service address>`, then in `/opt/context-engine`:
  `docker compose -f compose.yaml -f compose.hosted.yaml ps` and `... logs api`. Filter one
  organisation's requests by its id: `... logs api | grep '"org":"<organisation id>"'`.
- **Metrics:** `docker compose -f compose.yaml -f compose.hosted.yaml exec api node -e "fetch('http://127.0.0.1:3000/metrics').then(r=>r.text()).then(console.log)"`.
- **Redeploy a commit by hand:** run the `deploy` workflow (workflow_dispatch) with the commit SHA.
  Or on the VM: set `IMAGE_TAG=<sha>` in `release.env`, then
  `docker compose -f compose.yaml -f compose.hosted.yaml --env-file .env --env-file release.env up -d --wait`.
- **Roll back without a migration:** set the previous `IMAGE_TAG` in `release.env` and run the
  command above with `--no-deps web api worker`, so the older `migrate` never runs against the
  newer schema.
- **Rollback failed (P1):** check `ps` and the logs; if the database is the problem, restore.
- **Restore the database:** in the Supabase dashboard, Database, Backups: restore a daily backup
  (7 days are kept; point-in-time recovery is not bought in U1). Stop `api` and `worker` first,
  start them again after the restore, then run the `deploy` workflow for the running commit to
  re-check health and W7.
