# Unit to Story Map

Inputs: `unit-of-work.md`, `inception/user-stories/stories.md` (stories), `inception/refined-mockups/mockups.md` (mockups), `inception/domain-design/components.md` (components) and `inception/requirements-analysis/requirements.md` (requirements).

Every Unit named on a row implements part of that story and traces that story's acceptance criteria in its Functional Design. Where a row names only `library` or `packaging` Units, the `Reached through` column says how the story is used.

| Story | Units | Directories | Reached through |
|---|---|---|---|
| US1.1 | U10; U19 | u10-connector-google; u19-web-change-admin | |
| US1.2 | U11; U19 | u11-connector-microsoft; u19-web-change-admin | |
| US1.3 | U12; U19 | u12-connector-slack; u19-web-change-admin | |
| US1.4 | U13; U19 | u13-connector-chatgpt; u19-web-change-admin | |
| US1.5 | U8; U19 | u8-ingestion-framework; u19-web-change-admin | |
| US1.6 | U9 | u9-extraction | |
| US1.7 | U9 | u9-extraction | |
| US1.8 | U8 | u8-ingestion-framework | |
| US1.9 | U8; U19 | u8-ingestion-framework; u19-web-change-admin | |
| US2.1 | U1; U6; U19 | u1-walking-skeleton; u6-proposal-workflow; u19-web-change-admin | |
| US2.2 | U6; U19 | u6-proposal-workflow; u19-web-change-admin | |
| US2.3 | U6; U19 | u6-proposal-workflow; u19-web-change-admin | |
| US2.4 | U1; U6; U19 | u1-walking-skeleton; u6-proposal-workflow; u19-web-change-admin | |
| US2.5 | U6 | u6-proposal-workflow | |
| US2.6 | U6 | u6-proposal-workflow | |
| US2.7 | U6; U19 | u6-proposal-workflow; u19-web-change-admin | |
| US2.8 | U6; U19 | u6-proposal-workflow; u19-web-change-admin | |
| US2.9 | U5; U6; U19 | u5-impact-assessment; u6-proposal-workflow; u19-web-change-admin | |
| US2.10 | U5; U19 | u5-impact-assessment; u19-web-change-admin | |
| US2.11 | U6; U15 | u6-proposal-workflow; u15-mcp-server | |
| US2.12 | U3; U6 | u3-knowledge-graph; u6-proposal-workflow | |
| US2.13 | U6; U19 | u6-proposal-workflow; u19-web-change-admin | |
| US2.14 | U3; U6 | u3-knowledge-graph; u6-proposal-workflow | |
| US3.1 | U18 | u18-web-explore | |
| US3.2 | U18 | u18-web-explore | |
| US3.3 | U3; U18 | u3-knowledge-graph; u18-web-explore | |
| US3.4 | U18 | u18-web-explore | |
| US3.5 | U1; U3; U18 | u1-walking-skeleton; u3-knowledge-graph; u18-web-explore | |
| US3.6 | U14; U18 | u14-knowledge-query; u18-web-explore | |
| US3.7 | U3; U18 | u3-knowledge-graph; u18-web-explore | |
| US3.8 | U17; U18 | u17-simulation; u18-web-explore | |
| US3.9 | U17; U18 | u17-simulation; u18-web-explore | |
| US3.10 | U18; U19 | u18-web-explore; u19-web-change-admin | |
| US4.1 | U1; U14; U15 | u1-walking-skeleton; u14-knowledge-query; u15-mcp-server | |
| US4.2 | U16 | u16-chat-assistant | |
| US4.3 | U16 | u16-chat-assistant | |
| US4.4 | U6; U14; U16 | u6-proposal-workflow; u14-knowledge-query; u16-chat-assistant | |
| US4.5 | U14 | u14-knowledge-query | |
| US4.6 | U2; U16 | u2-identity-admin; u16-chat-assistant | |
| US5.1 | U3; U19 | u3-knowledge-graph; u19-web-change-admin | |
| US5.2 | U7 | u7-notifications-freshness | |
| US5.3 | U7; U18 | u7-notifications-freshness; u18-web-explore | |
| US5.4 | U7; U18 | u7-notifications-freshness; u18-web-explore | |
| US5.5 | U2; U3; U6 | u2-identity-admin; u3-knowledge-graph; u6-proposal-workflow | |
| US6.1 | U2; U19 | u2-identity-admin; u19-web-change-admin | |
| US6.2 | U2; U19 | u2-identity-admin; u19-web-change-admin | |
| US6.3 | U2; U19 | u2-identity-admin; u19-web-change-admin | |
| US6.4 | U2; U19 | u2-identity-admin; u19-web-change-admin | |
| US6.5 | U2; U8; U19 | u2-identity-admin; u8-ingestion-framework; u19-web-change-admin | |
| US6.6 | U4; U19 | u4-ai-gateway; u19-web-change-admin | |
| US6.7 | U19 | u19-web-change-admin | |
| US6.8 | U20 | u20-release-packaging | interface |
| US7.1 | U1; U2 | u1-walking-skeleton; u2-identity-admin | |
| US7.2 | U2; U19 | u2-identity-admin; u19-web-change-admin | |
| US7.3 | U2; U19 | u2-identity-admin; u19-web-change-admin | |
| US7.4 | U2; U19 | u2-identity-admin; u19-web-change-admin | |
| US7.5 | U2; U19 | u2-identity-admin; u19-web-change-admin | |
| US7.6 | U2; U20 | u2-identity-admin; u20-release-packaging | |
| US7.7 | U2; U19 | u2-identity-admin; u19-web-change-admin | |

US6.8 is reached through an interface: operators install the published container images.

## Cross-cutting rows

- **Proposals (US2.x):** U6 owns the rules on every row. Web units only present them.
- **Walking skeleton:** U1 delivers thin versions of US2.1, US2.4, US3.5 and US4.1. The later units on those rows finish them.
- **Screens:** every screen in the mockups has a unit.
  - U18 builds S1, S2, S3, S6, S7, S8, S10 and the shell.
  - U19 builds S4, S5, S9, S11, S12, sign-in and the hosted-service screens S14 to S18.
- **Organisation separation (US7.1):** U1 builds it into the first tables and U2 extends it; every unit that adds a table, route, tool, job type or export also adds its row-level security policy and isolation test (NFR14).
  - U16 builds S13, the chat answers.

## Implementation order within units

Each unit works through its stories in the order listed in the table above. For example, U6 goes from US2.1 to US2.14. Each unit writes tests first, following the team's practice.

## Coverage verification

- All 52 stories are assigned. None is `none`.
- All 20 units appear on at least one row.
