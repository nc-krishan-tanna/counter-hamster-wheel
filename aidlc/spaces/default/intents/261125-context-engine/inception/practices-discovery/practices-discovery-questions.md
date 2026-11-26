# Practices Discovery — Questions

Context: this is a new project, so there is no existing practice to discover. The draft in `team-practices.md` suggests defaults; these questions let you confirm or change how the team will work. The first option on each is the draft's suggestion.

## Q1. [Tech lead] How will the three tech leads combine their work?

A. Small changes merged into one main branch (`main`) within a day or two, each as one tidy commit after another tech lead approves it
B. Same, but no approval needed before merging
C. Longer-lived feature branches merged when a feature is done
D. A separate `develop` branch, merged to `main` for releases
X. Other (please specify)

[Answer]: A

## Q2. [Tech lead] Build a thin end-to-end slice first?

A walking skeleton is a minimal version that runs the whole way through, built first to prove the pieces connect before the real features go in. The suggested slice: knowledge goes in, is approved, is stored with its history, and is read back by a person and by an AI agent through MCP, all running from containers.

A. Yes, build that slice first
B. No, build the parts in dependency order without a first slice
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q3. [Quality engineer] How will tests be written?

A. Write each part, then its tests; keep at least 80% of the code covered; tests run on every change and a failure blocks the merge
B. Tests first (TDD): write the test, then the code that passes it; same 80% floor and merge blocking
C. Mixed: behaviour scenarios written first in plain language, unit tests after the code
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q4. [Release engineer] How will releases work?

The product is open source and self-hosted, so there are two jobs: publishing versions others can run, and running your own copy.

A. Every merge builds the containers and updates an internal test copy; version tags mark releases; upgrading your own live copy needs sign-off from a tech lead plus the sponsor
B. Same, but every merge also goes straight to your own live copy (no sign-off)
C. Manual releases only, when the team decides
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q5. [Release engineer] Where will the code, automated builds and container images live?

A. GitHub (GitHub Actions for builds, GitHub Container Registry for images)
B. GitLab
C. Azure DevOps
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q6. [Developer] What code style and languages will the team use?

A. TypeScript only, in strict mode, with Prettier formatting and ESLint checks set in the repo and run before merge
B. TypeScript as above, plus Python allowed for AI and extraction parts (with Black and Ruff)
C. Not yet defined
X. Other (please specify)

[Answer]: X. Typescript and rust.

## Q7. [Sponsor] Are there hard rules the team must ALWAYS or NEVER follow? (select all that apply)

These become fixed project rules that every later step follows. Pick only what you are sure of.

A. None for now
B. NEVER commit secrets, keys or real organisation content to the code repository
C. ALWAYS require a person to approve AI-extracted knowledge before it goes live
D. Not yet defined
X. Other (please specify)

[Answer]: B. X. Never commit straight to main

## Consolidated Summary Confirmation

- Way of working: small changes merged into `main` within a day or two, one tidy commit each, after another tech lead approves (Q1)
- First slice: yes, build the thin end-to-end slice first: knowledge in, approved, stored with history, read back by a person and an AI agent via MCP, all in containers (Q2)
- Testing: tests first (TDD), 80% coverage floor, tests run on every change and a failure blocks the merge (Q3)
- Releases: every merge builds the containers and goes straight to your own live copy, with no sign-off step; version tags mark releases for other organisations (Q4)
- Platform: GitHub, with GitHub Actions for builds and GitHub Container Registry for images (Q5)
- Languages and style: TypeScript and Rust, each with its standard formatter and linter set in the repo and run before merge (Q6)
- Hard rules: NEVER commit secrets, keys or real organisation content to the repository; NEVER commit straight to `main` (Q7)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
