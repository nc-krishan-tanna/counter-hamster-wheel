# Team-Level Rules

> This team's affirmed practices and corrections. Loaded after `org.md` as
> strict-additive guidance.
> Populated by the practices-discovery affirmation gate. Edit at the gate,
> not directly.

## Way of Working

We work trunk-based. The three tech leads make small changes on short-lived
branches and merge them into `main` within a day or two. Every change reaches
`main` through a pull request that another tech lead approves, and it is
squash-merged as one tidy commit. Nobody commits straight to `main`.

- **Integration branch**: main
- **Merge style**: squash-merge; one commit on `main` per piece of work.
- **Branch lifetime**: one to two days; a branch that would run longer is split
  into smaller changes.
- **Review**: one other tech lead approves every pull request before it merges.
  Code written with an AI assistant is reviewed the same way as hand-written
  code.
- **Commits**: always made on a working branch, never directly on `main`.
- **Versions**: releases are marked with version tags on `main`, not with
  release branches.

## Walking Skeleton

We build a thin end-to-end slice first, before the real features go in:
knowledge goes in, is approved, is stored with its history, and is read back
both by a person and by an AI agent through MCP, all running from containers.

- **Stance**: on.
- **Proof that it works**: the slice is checked with the intent's recorded
  verification command, which must show that end-to-end result running from
  the containers, and a person approves it before later Units start.

## Testing Posture

We write tests first. For every piece of work, the failing test comes before
the code that makes it pass.

- **Methodology**: tdd
- **Methodology evidence**: The team chose "tests first (TDD): write the test,
  then the code that passes it" in the practices interview (Q3) and confirmed
  it in the summary.
- **Ordering**: For each testable layer, write a failing test first, then write
  the smallest code that makes it pass, then refactor with the tests green
  before moving on.
- **Coverage floor**: at least 80% line coverage.
- **CI**: the tests run in CI on every change; a failing test blocks the merge.
- **Languages**: the rules apply equally to TypeScript and Rust code.
- **Not allowed**: tests that pass whatever the code does.
- **Tooling (suggestion only, not yet chosen)**: Vitest for TypeScript and
  `cargo test` for Rust; the final choice is made with the tech stack.

## Guard Policy

<!-- Affirmed by the team. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless project.md or the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

The product is self-hosted open-source software, so releasing means two
things: running our own live copy, and publishing versions other
organisations can run.

- **On every merge to `main`**: CI builds the container images and deploys
  them straight to our own live copy. There is no sign-off step.
- **Releases for other organisations**: a version tag on `main` marks a
  release and publishes the versioned images.
- **Platform**: GitHub. GitHub Actions runs CI and deployment; images are
  published to GitHub Container Registry.
- **Rollback**: redeploy the previous image tag.
- **Done means healthy**: a deployment counts as done only when a health check
  on the deployed copy passes (operation-phase rule).

## Code Style

We use TypeScript and Rust. Each language uses its standard formatter and
linter, configured in the repository and run before merge; any failure blocks
the pull request. The tools decide, and AI assistants follow the same
configuration.

- **TypeScript**: strict mode; Prettier for formatting; ESLint for linting.
- **Rust**: `rustfmt` for formatting; `clippy` for linting.
- **Where each language is used**: not yet decided; the design stages decide
  which parts are written in Rust.
- **Naming**: idiomatic for each language.
- **Suggestions from agents**: only where the formatter or linter does not
  already cover the point.
## Forbidden

<!-- Team-specific forbidden patterns -->

## Mandated

<!-- Team-specific mandates -->

## Corrections

<!-- Self-learning loop appends here. -->
