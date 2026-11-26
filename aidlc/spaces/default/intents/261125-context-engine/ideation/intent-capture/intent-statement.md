# Intent Statement: Organisational Context Engine

## Problem Statement

The request is a context engine, usable by technical and non-technical people, that gathers business and technical intelligence for human and AI consumption: "a github for non code and business rules" that gathers and maintains the DNA of the organisation. [desc]

The problems it solves today: [Q1]

- Knowledge is scattered across documents, chats, wikis and people's heads, so nobody can find the current truth. [Q1]
- Business rules and decisions change with no record of who changed what, when, and why. [Q1]
- AI assistants and agents give wrong answers because they lack trustworthy company context. [Q1]

## Target Customer

- First customer: our own organisation, used internally first, then released as open source. [Q2]
- Other organisations each run their own copy (one organisation per installation). [Q13]
- Day-one users who put knowledge in and get it out: [Q3]
  - Non-technical business people and leaders (operations, finance, HR, sales, managers) writing, approving and reading rules and processes. [Q3]
  - Technical people (engineers, architects) recording technical decisions and system knowledge. [Q3]
  - AI agents and assistants reading the knowledge automatically. [Q3]

### What the engine holds

| Knowledge type | Examples | Source |
|---|---|---|
| Business rules and policies | Pricing rules, approval limits, eligibility rules | [Q4] |
| Processes, glossary and organisational map | How work gets done; people, teams and systems and how they relate | [Q4] |
| Decisions and their reasoning | Business or architecture decision records | [Q4] |

### How knowledge gets in

- Both manual authoring with change proposals and approvals, and automated extraction that people review, plus MCP integration and meeting transcripts, across the communication touchpoints people have in an organisation. [Q5]
- It must be easy for people to use. [Q5]
- Starting sources for the first version: documents and files, meeting transcripts, and chat. [Q11]

## Success Metrics

The goal: something used every day, often without people noticing they are using it, that captures the DNA of the organisation and becomes a reference point and an evolving snapshot of it. [Q6]

| Metric | What it measures | Target | Source |
|---|---|---|---|
| Daily lookups | Lookups served to people and AI tools per working day | Not yet set (see open questions) | [Q12] |
| Share of staff using it | Share of staff whose everyday tools draw on the engine each week | Not yet set (see open questions) | [Q12] |
| Freshness of rules | Share of captured rules and processes with an owner and reviewed within a set number of days | Not yet set (see open questions) | [Q12] |

## Initiative Trigger

- AI agents are being rolled out and need reliable company context. [Q7]
- Knowledge loss: people leaving, slow onboarding, tribal knowledge. [Q7]
- Audit, compliance or governance pressure to show who owns which rule and when it changed. [Q7]
- The aim is a project many organisations can benefit from. [Q7]

## Initial Scope Signal

- Workflow-selected scope: `mvp` (workflow-selected). [scope]
- User-confirmed product boundary for the first version: [Q10] [Q13]
  - Simple roles only; no fine-grained permissions. [Q10]
  - One organisation per installation; other organisations run their own copy. [Q13]

## Assumptions & Open Questions

- Target values for the three success metrics (daily lookups, share of staff using it, freshness window and percentage) are not yet set; they are to be agreed in a later stage. [assumption]
