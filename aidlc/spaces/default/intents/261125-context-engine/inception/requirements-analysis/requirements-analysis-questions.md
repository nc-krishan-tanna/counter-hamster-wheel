# Requirements Analysis — Questions

Context: `ideation/intent-capture/intent-statement.md`, `ideation/scope-definition/scope-document.md`, the rough mockups and `inception/practices-discovery/team-practices.md` already settle the goal, scope, screens and team practices. These questions cover only facts about your world that requirements need and that earlier stages did not settle. Where a sensible default exists, it is the first option.

## Q1. [Product owner] How will people sign in?

A. With their existing work account: Google Workspace or Microsoft 365 single sign-on
B. Email and password managed inside the engine
C. Both: single sign-on where available, email and password as a fallback
D. Not yet defined
X. Other (please specify)

[Answer]: C. X. Both, but please do not handroll your own auth for the email and password section. please stand on the shoulders of giants!

## Q2. [Product owner] Which simple roles should the first version have?

Scope says "simple roles only". These four are a starting point from the mockups.

A. Reader (view and ask), Contributor (propose changes), Approver (approve changes), Admin (connections, privacy, people)
B. Just two: Member (view, ask, propose) and Admin (approve and configure)
C. Three: Member (view, ask, propose), Approver, Admin
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q3. [Product owner] Who may approve a proposed change?

A. Any Approver
B. Only the owner of that item (rule, process and so on), or an Admin when there is no owner
C. Two approvals for business rules and policies, one for everything else
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q4. [Product owner] Can AI agents change knowledge through MCP, or only read it?

A. Read only
B. Read, and propose changes that a person must approve
C. Read and change directly
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q5. [Product owner] How large is the largest organisation the first version must handle?

This sets the performance and scale targets.

A. Up to 100 people
B. Up to 1,000 people
C. Up to 10,000 people
D. Not yet defined
X. Other (please specify)

[Answer]: A. X. up to 100 to start with but allow for but keep scaling in mind for the future

## Q6. [Product owner] How quickly should new content in connected tools turn into a proposal?

A. Within about 15 minutes
B. Within an hour
C. Once a day
D. Not yet defined
X. Other (please specify)

[Answer]: X. it should be fairly quick, like raising a pr. This needs to be an active reflection of the orgs context. In certain context areas there may need to be workflows run like how we run actions or workflows on cicd pipelines

## Q7. [Product owner] By default, how long before an item counts as stale and its owner is reminded?

Organisations can change this; this is the default.

A. 90 days since last review
B. 180 days since last review
C. Each item sets its own review period when created
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Q8. [Compliance specialist] What happens to raw content from connected tools after extraction?

Chat and transcripts contain sensitive remarks. Organisations configure this, but the first version needs a safe default.

A. Keep only the excerpt each piece of knowledge was built from; discard the rest
B. Keep all raw content, visible only to Admins
C. Discard all raw content once extraction finishes; keep only a link back to the source
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q9. [Product owner] With only item owners approving, what is the Approver role for?

Follow-up to Q2 and Q3: you chose four roles including Approver, and also that only an item's owner (or an Admin when there is no owner) may approve. These need to fit together.

A. Only people with the Approver role can be made owners of items
B. Approvers can approve items that have no owner, alongside Admins
C. Drop the Approver role: Reader, Contributor and Admin, with ownership deciding who approves
D. Not yet defined
X. Other (please specify)

[Answer]: B (left to me: "the overall idea that this is as frictionless as possible, there needs to be accountability and there needs to be a model that suits these parameters, I dont care what it looks like so long as this is baked in.")

## Q10. [Product owner] What should the per-area workflows do? (select all that apply)

Follow-up to Q6: you said some areas may need workflows run on proposals, the way GitHub Actions run on a pull request. This is new, so it needs pinning down before it becomes a requirement.

A. Automatic checks before approval (for example: does this conflict with another rule, are required fields filled, is an owner set)
B. Extra approval steps per area (for example: finance rules also need a finance lead's approval)
C. Actions after approval (for example: notify a team, post to a channel, call another system via a webhook)
D. Not in the first version; later
X. Other (please specify)

[Answer]: X. In terms of the workflows, there needs to be risk analysis or blast radius assessment from changes.

## Consolidated Summary Confirmation

- Sign-in: both work-account single sign-on (Google, Microsoft) and email and password, using an established authentication library or service, not custom-built auth (Q1)
- Roles: Reader, Contributor, Admin, plus Approver; each item's owner approves changes to it, and Approvers (or Admins) approve items with no owner, so every change has an accountable approver with as little friction as possible (Q2, Q3, Q9)
- AI agents via MCP: read, and propose changes that a person must approve (Q4)
- Scale: designed for organisations of up to 100 people, without blocking growth beyond that (Q5)
- Speed: new content in connected tools becomes a proposal within a few minutes, like raising a pull request, so the engine stays a live reflection of the organisation (Q6)
- Staleness: each item sets its own review period; its owner is reminded when it passes (Q7)
- Raw content from connected tools: kept in full by default, visible only to Admins; organisations can change this (Q8)
- Workflows on proposals: every proposed change gets a risk and blast-radius assessment showing what else it affects before it is approved (Q6, Q10)
- Hosting: open source and self-hosted from containers, and also a hosted service run by the team for many organisations (Q11 context)
- Isolation: one shared database; every record carries its organisation and PostgreSQL row-level security refuses cross-organisation access (Q11)
- One product: same code and images; a self-hosted install runs with one organisation; hosted-only features are switched on for the hosted service (Q12)
- Joining: self-service sign-up creates an organisation and makes the person its Admin (Q13)
- Accounts: an account belongs to exactly one organisation; the same person needs a separate account in each (Q14)
- Data location: one hosting region for every hosted organisation, stated publicly (Q15)
- Payment: none in the product; operators can turn organisations on and off (Q16)
- Operator access: operators may read an organisation's knowledge for support; every access is logged and visible to that organisation's Admins (Q17)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

## Q11. [Product owner] How are hosted organisations kept apart?

New on 2026-11-26 (U1 infrastructure design, Q1 and Q2): besides self-hosting, the team will run a hosted service shared by many organisations, and you chose to build true multi-tenancy now. This replaces "one organisation per installation" (FR13.1) and removes "one shared hosted service for many organisations" from out of scope. How organisations are separated decides how much every later design changes.

A. One shared database; every record carries its organisation, and PostgreSQL row-level security refuses any query that crosses organisations, even if the code forgets a filter (Recommended: one copy to run and upgrade, and the database itself blocks leaks)
B. One database with a separate schema per organisation
C. A separate database per organisation behind one running application
X. Other (please specify)

[Answer]: A

## Q12. [Product owner] Do self-hosted installs and the hosted service run the same product?

A. Yes: one codebase and the same container images; a self-hosted install simply runs with one organisation, and multi-organisation features (creating organisations, the operator console) are switched on only for the hosted service (Recommended: one product to test and release)
B. Two editions built from the same code with different features
X. Other (please specify)

[Answer]: A

## Q13. [Product owner] How does a new organisation join the hosted service?

A. The team creates each organisation from an operator console and invites its first Admin; self-service sign-up comes later (Recommended: smallest first version, and the team stays in control of who joins)
B. Self-service sign-up: anyone creates an organisation and becomes its Admin
C. Both from the start
X. Other (please specify)

[Answer]: B

## Q14. [Product owner] Can one person belong to more than one organisation?

For example a consultant who works with two client organisations, signing in with the same Google account.

A. Yes: one account can belong to several organisations, with a role in each, and the person switches between them (Recommended: the sign-in library already supports organisations this way, and the same email in two organisations is common)
B. No: an account belongs to exactly one organisation; the same person needs a separate account for each
X. Other (please specify)

[Answer]: B

## Q15. [Compliance specialist] Where is hosted data kept?

A. One hosting region for every hosted organisation, stated publicly; an organisation that needs another region self-hosts (Recommended: one copy to run; self-hosting covers other needs)
B. Each organisation chooses its region from a short list
X. Other (please specify)

[Answer]: A

## Q16. [Product owner] Does the first version handle payment for the hosted service?

A. No: contracts and invoices are handled outside the product; the operator console only turns organisations on and off (Recommended: no billing system to build or secure yet)
B. Yes: plans, limits and card payment through a payment provider inside the product
X. Other (please specify)

[Answer]: A

## Q17. [Compliance specialist] Can the team running the hosted service read an organisation's knowledge?

A. No: operators manage organisations (create, suspend, see usage) but cannot read any organisation's items, proposals or sources; support needs the organisation's Admin to share what is needed (Recommended: the strongest privacy promise for a shared service)
B. Yes, for support, with every access logged and visible to the organisation's Admins
X. Other (please specify)

[Answer]: B
