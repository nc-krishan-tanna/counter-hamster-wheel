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
