# Infrastructure Design — U1 walking skeleton — Questions

Context: U1's runtime shape is set by the NFR design (`../nfr-design/logical-components.md`): `web` (Caddy), `api`, `worker`, `postgres` and a one-shot `migrate`, run with Docker Compose, with no dependency on any cloud provider (NFR12). CI on GitHub Actions and images on GitHub Container Registry are team practice. One thing is genuinely open: the team practice says every merge to `main` deploys straight to the team's own live copy and is done only when its health check passes, but no host for that copy exists yet. Each first option is my recommendation.

## Q1. [Operations] Where does the team's live copy run, and does U1 deploy to it?

A. One Linux virtual machine the team provides (any provider), with a DNS name pointing at it. On every merge to `main`, CI publishes the images to GitHub Container Registry, then connects over SSH and runs `docker compose pull` and `up -d` with the new image tag; the deploy counts as done only when `https://<name>/healthz` and the end-to-end check pass, and a failure redeploys the previous tag (Recommended: meets the team's deploy-on-merge practice from the first unit with the least to run)
B. U1 only builds and publishes the images on merge; deploying to a live copy starts when a host is chosen in a later unit (the team practice is not met until then)
C. A managed container service on one cloud provider (for example AWS ECS or Google Cloud Run) for the team's own copy; installs for other organisations stay on Compose
X. Other (please specify)

[Answer]: X. Other: Sort of an hybrid approach. Open source for the code if they want to self host allowing containerisation. But also offered as a SAAS by us multi tenanted

## Q2. [Product owner] How should the hosted, multi-tenant offer fit with what was agreed?

Your answer to Q1 adds a hosted offer run by the team, serving many organisations. The approved requirements say the opposite: "one organisation per installation" (FR13.1, Constraints) and "one shared hosted service for many organisations" is listed as out of scope. Every design so far (owners, groups, roles, search, the database permissions) assumes one organisation per database. True multi-tenancy (many organisations sharing one running copy and one database) means every table, query, role check and MCP token carries an organisation id, which touches every unit.

A. Hosted, one copy per customer: the team runs a separate install (its own containers and database) for each hosted customer, using the same images self-hosters run. "One organisation per installation" stays true, nothing designed so far changes, and real shared multi-tenancy can be added later if hosting costs demand it (Recommended: you get the hosted offer with no redesign)
B. True multi-tenancy now: go back to Requirements Analysis to record it, then revisit the domain design, contracts and U1's designs to add an organisation id everywhere before any code is written
C. True multi-tenancy, but after the MVP: record it now as a future requirement; the MVP stays one organisation per installation, and new code avoids choices that would block adding an organisation id later
X. Other (please specify)

[Answer]: B

## Q3. [Operations] Where does the hosted service run, and does U1 deploy to it on every merge?

Follow-up to Q1 and Q2: the product is now self-hosted from containers and also a hosted service for many organisations, each at its own address (`{org}.<service address>`). The team practice says every merge to `main` deploys to the team's own live copy and is done only when its health check passes. No host exists yet. Each organisation having its own address means the host needs a wildcard DNS name (`*.<service address>`) and a wildcard certificate, which Caddy gets through a DNS challenge with the DNS provider's API token.

A. One Linux virtual machine in the chosen region, running the same Compose stack self-hosters run (PostgreSQL on the machine, on an encrypted volume), with wildcard DNS and a wildcard certificate. On every merge to `main`, CI publishes the images to GitHub Container Registry, connects over SSH, and runs `docker compose pull` and `up -d` with the new image tag. The deploy counts as done only when `/healthz` and the end-to-end check pass at the two test organisations' addresses; a failure redeploys the previous tag (Recommended: the same artefacts self-hosters run, the least to operate, and it meets deploy-on-merge from U1; managed database and backups come with U20)
B. A managed container service and a managed PostgreSQL on one cloud provider (for example AWS ECS with RDS), with the same deploy-on-merge and health check; self-hosters keep Compose
C. U1 only builds and publishes the images on merge; the hosted service gets a host in a later unit (the deploy-on-merge practice is not met until then)
X. Other (please specify)

[Answer]: X. Other: supabase would be good.

## Q4. [Product owner] Which hosting region holds every hosted organisation's data?

The requirements say all hosted data, backups included, stays in one region, named publicly (NFR15), and leave the region open. The deploy target in Q3 needs it.

A. United Kingdom (for example London)
B. European Union (for example Ireland or Frankfurt)
C. United States
X. Other (please specify)

[Answer]: B

## Q5. [Operations] With Supabase holding the database, where do the `web`, `api` and `worker` containers run?

Follow-up to Q3: Supabase is managed PostgreSQL (with its own backups) in an EU region, which fits the row-level security design and the region in Q4. Supabase does not run our Fastify `api`, `worker` or Caddy `web` containers, so they need a host in the same EU region. Self-hosters keep plain PostgreSQL in Compose; the code is the same, because Supabase is standard PostgreSQL. We would use Supabase only as the database: sign-in stays Better Auth (the tech-stack decision), not Supabase Auth, so self-hosted and hosted installs sign in the same way. The `api` and `worker` would connect through Supabase's session pooler, not the transaction pooler, because the job queue holds session-level locks.

A. One Linux virtual machine in the same EU region, running `web`, `api` and `worker` with Compose and no `postgres` container. Wildcard DNS and a wildcard certificate (Caddy, DNS challenge). On every merge to `main`: publish the images, SSH in, pull and up. The deploy is done when `/healthz` and the end-to-end check pass at the two test organisations' addresses; otherwise the previous tag is redeployed (Recommended: the same images and Compose file self-hosters use, the least to run)
B. A managed container platform in the same EU region (for example Fly.io, Google Cloud Run or AWS ECS), with the same deploy-on-merge and health check
C. Supabase only for now: U1 creates the hosted database and runs its migrations from CI, but the containers get a host in a later unit (deploy-on-merge is not met until then)
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Product shape (Q1, Q2): open source to self-host from containers, and a hosted service run by the team for many organisations in one running copy and one database (already carried back into the requirements and designs).
- Database for the hosted service (Q3): Supabase as managed PostgreSQL only, in an EU region, with its backups; `api` and `worker` connect through Supabase's session pooler; sign-in stays Better Auth. Self-hosters keep the `postgres` container in Compose with the same code.
- Region (Q4): European Union, for all hosted data including backups (NFR15).
- Containers for the hosted service (Q5): one Linux VM in the same EU region runs `web`, `api` and `worker` with Compose and no `postgres` container; wildcard DNS and a wildcard certificate for `*.<service address>` (Caddy, DNS challenge).
- Deploy on merge (Q3, Q5): on every merge to `main`, CI publishes the images to GitHub Container Registry, connects to the VM over SSH and runs `docker compose pull` and `up -d` with the new tag (the one-shot `migrate` container runs first, against Supabase, exactly as it runs against the local `postgres` for self-hosters); done only when `/healthz` and the end-to-end check pass at the two test organisations' addresses; on failure the previous tag is redeployed.
- Released versions for self-hosters: a version tag on `main` publishes versioned images (team practice).

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
