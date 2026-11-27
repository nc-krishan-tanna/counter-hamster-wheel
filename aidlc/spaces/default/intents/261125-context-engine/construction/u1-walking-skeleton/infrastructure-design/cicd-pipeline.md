# CI/CD Pipeline — U1 walking skeleton

How every change is checked, deployed to the hosted live copy, and released for self-hosters. Team practice: trunk-based, every change through a pull request that another tech lead approves, squash-merged to `main`; every merge to `main` deploys to the team's live copy with no sign-off step, and is done only when a health check on that copy passes; a version tag on `main` publishes the versioned images; rollback redeploys the previous image tag. Platform: GitHub Actions and GitHub Container Registry. Hosting: `infrastructure-specification.md` (one EU VM running Compose, Supabase PostgreSQL in the EU; Q3 to Q5).

## Workflows

| Workflow | Runs on | What it does |
|---|---|---|
| `ci.yml` | Every pull request, and every push to `main` | All checks below; required to pass before merge (branch protection) |
| `deploy.yml` | Push to `main` (after a squash merge), once `ci.yml` passes on that commit | Build and publish images tagged with the commit SHA, deploy to the hosted VM, check, roll back on failure |
| `release.yml` | A tag `v*` on `main` | Re-tag that commit's images with the version, publish them for self-hosters |

## Checks on every pull request (`ci.yml`)

Ordered so the fast checks fail first:

1. Install with the lockfile (`npm ci`), cached.
2. Prettier check, ESLint (including the module-boundary rule and the ban on `sql.raw`), `tsc --noEmit` (NFR11.3, `../nfr-design/security-design.md`).
3. Rust jobs (`cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`) only when a `Cargo.toml` exists; none in U1.
4. Secret scan of the change (gitleaks) (NFR5.2).
5. Vitest unit and integration tests with V8 coverage; below 80% lines in `api`, `worker` or `web` fails the job (NFR11.2). Integration tests run against a real PostgreSQL 16 service container, as the three roles, with row-level security on (NFR9.2, NFR14.1).
6. The isolation check: lists every route in `api/openapi/v1.yaml` and every MCP tool, and fails when one has no isolation test (NFR14.3).
7. OpenAPI check: server routes match `api/openapi/v1.yaml`, and a diff against `main` fails on a breaking change inside `/v1` (contract summary, ownership rules).
8. Build the five images (`web`, `web-hosted`, `api`, `worker`, `migrate`; `infrastructure-specification.md`, Caddy).
9. End-to-end check (W7), twice. First the self-hosted shape: `docker compose up` with the CI `.env` (generated test secrets), wait for every container healthy, then run the W7 script against `acme.localhost` and `globex.localhost` (connecting to `127.0.0.1` with the organisation's host name), including the second organisation's "not found" steps. Then the hosted shape: the same with `compose.hosted.yaml`, the database URLs pointing at a PostgreSQL service container outside the Compose file (standing in for Supabase, with Supabase's `anon` and `authenticated` roles created so the lockdown test runs), and `web-hosted` with Caddy's local CA. Tear down.
10. Rollback rehearsal: run this change's `migrate`, then start `api` and `worker` from the images of the current `main` commit (already in GitHub Container Registry) and run the W7 script. A failure means the change's migration would break a rollback, and blocks the merge.

| Stage | Gate |
|---|---|
| Format, lint, type check | Any failure blocks the merge |
| Secret scan | Any finding blocks the merge |
| Tests and coverage | Any failure or coverage below 80% blocks the merge |
| Isolation check | A route or tool without an isolation test blocks the merge |
| OpenAPI check | A breaking `/v1` change blocks the merge |
| End-to-end check (both shapes) | Any failure blocks the merge |
| Rollback rehearsal | A migration the previous release's code cannot run with blocks the merge |
| Review | One other tech lead approves (branch protection) |

## Deploy on merge (`deploy.yml`)

One deploy at a time: the workflow uses a concurrency group, so a second merge waits for the first deploy to finish.

1. **Publish.** Build the five images and push them to `ghcr.io/<owner>/context-engine-<name>:<sha>`.
2. **Remember the running tag.** Over SSH as `deploy` (key from the GitHub environment `live`, host key pinned), read the current `IMAGE_TAG` from `/opt/context-engine/release.env` as `PREVIOUS_TAG`. On the very first deploy the file does not exist: there is no previous tag, and a failed first deploy ends failed without a rollback.
3. **Deploy.** Write `IMAGE_TAG=<sha>` to `release.env`, then `docker compose -f compose.yaml -f compose.hosted.yaml pull` and `up -d`. Compose runs `migrate` first (against Supabase as `ce_migrate`); `api` and `worker` start only after it exits successfully.
4. **Check.** Wait up to 120 seconds for every container to report healthy, then from the runner: `https://<service address>/healthz` must answer `200`, and the W7 end-to-end script runs against the two live test organisations' addresses (`e2e-a` and `e2e-b`; their agent tokens and passwords are secrets of the `live` environment). The deploy is done only when both pass (team practice: done means healthy).
5. **Roll back on failure.** Write `IMAGE_TAG=<PREVIOUS_TAG>` and run `up -d --no-deps web api worker`, so the previous release's `migrate` never runs against the newer schema (an older migrator would refuse a database holding a migration it does not know). Repeat the health and end-to-end checks. The job ends failed either way, so the author and the tech leads are notified (`monitoring-design.md`, Alerts); a failed rollback marks the run `rollback-failed`.

The single VM restarts each container in place, so a deploy has a few seconds when `api` does not answer. `shortcut: recreate on one host; a second api copy behind Caddy (already supported, NFR4.1) gives rolling deploys when U20 adds capacity.`

**Migrations must survive a rollback.** Rolling back redeploys old `web`, `api` and `worker` images but never reverses a migration and never runs an old `migrate`, so every migration must work with the previous release's code: add columns, tables and policies first, and remove or rename only in a later release once no running code uses them. Everything `migrate` runs (migrations, grants, policies, the seed) is idempotent, so running the same release's `migrate` twice changes nothing. The rollback rehearsal in `ci.yml` (step 10 below) proves backward compatibility on every pull request, before a deploy can need it.

**Test organisations on the live copy.** The seed creates two test organisations on the hosted service, at the addresses `e2e-a` and `e2e-b`, only when their seed variables are present in the VM's `.env`. Both addresses are on the list of reserved addresses that sign-up refuses (`address-reserved`, contract C1), so no real customer is ever blocked by them. Local development and CI keep `acme` and `globex`. The test organisations hold only test items created by the end-to-end check, never real organisation content (project rule).

## Releases for self-hosters (`release.yml`)

1. A tech lead tags a commit on `main` with `vX.Y.Z` (team practice: releases are tags on `main`, not branches).
2. The workflow checks that `ci.yml` passed on that commit and that its SHA-tagged images exist, then adds the tags `X.Y.Z` and `X.Y` to `web`, `api`, `worker` and `migrate` and publishes them (`web-hosted` is for the team's hosted copy only).
3. Self-hosters upgrade by setting `IMAGE_TAG=X.Y.Z` and running `docker compose pull` and `up -d`; `migrate` runs first, as on the hosted copy.

## Secrets in CI/CD

| Secret | Where | Used by |
|---|---|---|
| `GITHUB_TOKEN` (packages: write) | Built in | Push images to GitHub Container Registry |
| SSH private key for `deploy`, the VM's host key | GitHub environment `live` | `deploy.yml` only |
| Test organisations' agent tokens and passwords | GitHub environment `live` | The end-to-end check on the live copy |
| Database URLs, Better Auth secret, DNS API token, seed values | Only in `/opt/context-engine/.env` on the VM (mode 600) | The containers; never passed through CI |
| CI test secrets | Generated in the run | `ci.yml` end-to-end check; never stored |

No secret is in the repository, an image or a log (NFR5.2, project rule). The `live` environment's deployment branches are limited to `main`, so neither a pull request (forks included) nor another branch can read its secrets or deploy. The `deploy` user is in the `docker` group, which is root-equivalent on the VM; that is accepted because the VM runs nothing else and the key exists only in the `live` environment.

## Rollback

| Situation | Action |
|---|---|
| A deploy fails its checks | Automatic: the previous image tag is redeployed (step 5) |
| A problem found after a successful deploy | A tech lead re-runs `deploy.yml` for the last good commit (`workflow_dispatch` with a SHA), or reverts the change with a pull request |
| The database needs restoring | Restore of a Supabase daily backup (Pro plan: 7 days kept; point-in-time recovery is a paid add-on not bought in U1), by a tech lead in the Supabase dashboard, following `deploy/README.md`; tested restores and the point-in-time decision come with U20 |

## Sources
- Team practices: Way of Working, Testing Posture, Deployment, Code Style (team rules).
- `../nfr-design/logical-components.md` (build, test and run: NFR11.1 to NFR11.3, NFR12.1), `../nfr-design/security-design.md` (secrets, isolation check, roles), `../nfr-design/reliability-design.md` (health, restart, migrations in `migrate`), `../nfr-design/scalability-design.md` (second `api` copy), `../nfr-design/performance-design.md`, `../nfr-design/observability-design.md`.
- `../functional-design/functional-spec.md` (W7 end-to-end check, the two organisations).
- `inception/domain-design/components.md` (Tenancy and the organisation addresses).
- `inception/contract-design/contract-summary.md` (OpenAPI as the source of truth, breaking-change rule, C8).
- `infrastructure-specification.md`, `monitoring-design.md`; `infrastructure-design-questions.md` Q1 to Q5.
