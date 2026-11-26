# Practices Discovery Evidence

The lead (aidlc-pipeline-deploy-agent) worked alone; no support agents ran and
there are no contribution files. The final practices come from the completed
interview (`practices-discovery-questions.md`), which the person confirmed with
"Looks correct".

## Project type

Greenfield. The repository has no commits, no code, no CI configuration and no
deployment configuration, so nothing could be inferred from existing work.
Every practice below is what the person chose in the interview.

## What was inspected

| Source | What it gave |
|---|---|
| `aidlc/spaces/default/memory/org.md` | Framework defaults used as the interview's starting suggestions (trunk-based squash-merge to `main`; test-after with an 80% floor for `mvp`; deploy on merge to staging with a manual production approval; defer to the repo's formatter and linter) |
| `aidlc/spaces/default/memory/team.md`, `project.md` | All sections empty: a first run, not a re-run |
| `aidlc/spaces/default/memory/phases/inception.md` | Stage rule bundle (no practice content) |
| `.claude/scopes/aidlc-mvp.md` | `skeleton: on` for the `mvp` scope |
| `ideation/intent-capture/intent-statement.md` | Self-hosted product; our own organisation is the first user, then open-source release |
| `ideation/feasibility/constraint-register.md` | TC-2 containers; TC-7 JavaScript/TypeScript main stack, others allowed; OC-1 three tech leads using AI assistants; OC-5 open source after internal use |
| `ideation/scope-definition/scope-document.md` | `mvp` scope; packaging ready for open-source release |
| `practices-discovery-questions.md` | The person's answers Q1 to Q7 and their summary confirmation |

## Interview decisions

| Question | Answer | Effect on the drafts |
|---|---|---|
| Q1 Way of working | A: small changes merged into `main` within a day or two, one tidy commit each, after another tech lead approves | Draft kept: trunk-based, squash-merge, one approving reviewer. `- **Integration branch**: main`. Unconfirmed feature-flag remark removed |
| Q2 First slice | A: yes, build the thin end-to-end slice first | Walking skeleton on, with the confirmed slice (knowledge in, approved, stored with history, read by a person and an AI agent via MCP, in containers) |
| Q3 Testing | B: tests first (TDD), 80% floor, tests block merge | Methodology changed from `test-after` to `tdd`; Ordering rewritten to test, code, refactor per layer. Testcontainers and Playwright suggestions removed; Vitest and `cargo test` kept only as labelled suggestions |
| Q4 Releases | B: every merge builds containers and goes straight to our own live copy, no sign-off; version tags mark releases | Internal staging copy and the "tech lead + sponsor" production sign-off removed. Rollback by redeploying the previous image tag kept |
| Q5 Platform | A: GitHub, GitHub Actions, GitHub Container Registry | Recorded as decided, no longer a suggestion |
| Q6 Languages and style | X: "Typescript and rust." | TypeScript (strict, Prettier, ESLint) and Rust (`rustfmt`, `clippy`), each run before merge |
| Q7 Hard rules | B, plus X: "Never commit straight to main" | `## Forbidden`: two `NEVER` rules. `## Mandated`: `None.` Option C (approval of AI-extracted knowledge) was not chosen, so it is not a rule |

## Remaining uncertainty

- **Where Rust is used**: the person named Rust as a team language but not which
  parts are written in it. Left open for the design stages; not invented here.
- **Commit hash**: the repository has no commits yet, so the timestamp records
  `none`. A re-run after the first commit would record the real hash.
- **Test and coverage tooling**: no test runner or coverage tool was chosen for
  either language; the ones named in `team-practices.md` are suggestions only.
- **Health check on deploy**: the "done means healthy" line comes from the
  operation-phase rule that production deployments must have a health check,
  not from an interview answer. The check itself is defined in later stages.
- **Branch protection**: "NEVER commit straight to main" is a team rule; whether
  it is also enforced with GitHub branch protection is decided when the
  repository and CI are set up.
