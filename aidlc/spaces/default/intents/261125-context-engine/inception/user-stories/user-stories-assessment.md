# User Stories Assessment

Input: `inception/requirements-analysis/requirements.md` and `inception/practices-discovery/team-practices.md`.

- **Decision:** Execute.
- **Rationale:** The product is user-facing, with several distinct people (non-technical contributors, owners, engineers, admins) plus AI agents. Its core value is an accountability workflow (propose, assess, approve, record), and that workflow has many business rules. Stories make each person's path testable, and help the three tech leads split the work into small pieces they can build in parallel.
- **Factors considered:**
  - New product with web, chat and AI-agent interfaces.
  - Five personas with different needs and tech comfort.
  - Complex rules for approval, ownership, risk assessment and freshness.
  - Team practice is tests first (TDD), so Given/When/Then criteria feed directly into tests.
- **Where stories add the most value:**
  - The propose-and-approve journey, including the accountability edge cases the requirements review flagged.
  - Capture from connected tools.
  - Making the 3D map and its accessible list view usable by non-technical people.
  - Since 2026-11-26, the hosted multi-organisation service (Group 7): separation between organisations is a promise every story's data must keep, so it gets its own testable criteria.
