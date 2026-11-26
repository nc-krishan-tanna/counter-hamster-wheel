# Domain Design — Questions

Context: `inception/requirements-analysis/requirements.md`, `inception/user-stories/stories.md` and `inception/practices-discovery/team-practices.md`. These questions settle the main boundary choices for the system's building blocks. Each first option is my recommendation, with the reason. Technology choices (including where Rust is used) come in later stages.

## Q1. [Architect] How should the history of every change be kept?

The engine's promise is "GitHub for business rules": every change, who made it and why.

A. Every approved change creates a new, unchangeable version of the item, like a Git commit; the current item is simply its latest version (Recommended: history is built in and cannot drift from the truth)
B. Keep the current item in one place and write changes to a separate audit log
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. [Architect] Should the risk and blast-radius assessment be its own building block?

It is needed by proposals, the editor's live preview, the Ask conversation and Simulate.

A. Yes, one shared assessment block that all of them use (Recommended: one set of rules, one place to improve them)
B. No, build it into the proposal workflow only
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q3. [Architect] How should answering work across the web app, Slack, Teams and MCP?

A. One shared answering block (search plus AI answers, role-checked), with thin adapters for each channel (Recommended: the same question gets the same answer everywhere)
B. Each channel has its own answering logic
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Q4. [Architect] How should the different kinds of knowledge (rule, process, glossary term, person, team, system, decision) be modelled?

A. One "item" with a type, plus a few type-specific fields (Recommended: links, history, approval and freshness work the same for every type, and new types are cheap to add later)
B. A separate model for each type
C. Not yet defined
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- History: every approved change creates a new, unchangeable version of the item, like a Git commit; the current item is its latest version (Q1)
- Assessment: one shared risk and blast-radius block used by proposals, the editor preview, Ask and Simulate (Q2)
- Answering: one shared, role-checked answering block (search plus AI answers) with thin adapters for the web app, Slack, Teams and MCP (Q3)
- Item model: one item with a type plus a few type-specific fields, so links, history, approval and freshness work the same for every type (Q4)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]:

## Q5. [Architect] Where do organisations, operators and support access live?

New on 2026-11-26 with the hosted service (requirements FR14, NFR14; stories Group 7). Every component's data now belongs to one organisation, and something must own the organisation itself (its name, address, status and region), the operators who run the hosted service, the log of their support access, and suspension.

A. A new building block, Tenancy, that owns organisations, operators and the support access log, and resolves "which organisation is this request for" from the organisation's address; every other component stamps its records with the organisation and the database's row-level security enforces the separation (Recommended: one clear owner for the organisation lifecycle, and identity stays about people within an organisation)
B. Put organisations, operators and support access inside IdentityAccess
X. Other (please specify)

[Answer]:
