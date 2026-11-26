# External Dependency Map

A **Bolt** is one build pass over a piece of the work that ends in something that runs (see `bolt-plan.md`). This map lists what the build needs from outside the code, who provides it, and which Bolt waits for it.

Only one decision lies outside the team: the open-source licence [Q6]. Everything else is test accounts the tech leads create themselves, kept apart from any real organisation's data [Q5], per the project rule never to commit or use real organisation content.

| Dependency | Owner | Lead time | Needed by | If it slips |
|---|---|---|---|---|
| AI model API key (or a self-run model) | Tech leads [Q5] | Same day | B3 (U4, U5) | Use a self-run model; the gateway supports both |
| ChatGPT account to check projects access | Tech leads [Q5] | Same day | B5 (U13) | U13 falls back to file import (requirements A6) |
| Google Workspace test domain with an OAuth app and admin consent | Tech leads [Q5] | 1 to 3 days [assumption] | B6 (U10), B4 (U2 single sign-on) | Build U11 or U12 first; email sign-in covers B4 |
| Microsoft 365 test tenant with an app registration and admin consent | Tech leads [Q5] | 1 to 3 days [assumption] | B11 (U11), B4 (U2 single sign-on), B7 (Teams delivery) | Build U12 first; Teams delivery waits |
| Slack test workspace and app | Tech leads [Q5] | Same day | B7 (Slack delivery), B12 (U12), B15 (U16) | Delivery to the web app and email still works |
| Non-technical colleagues for the usability check | Tech leads [assumption] | About a week to arrange | B10 (U19) | Run the check on the next Bolt; do not skip it |
| Open-source licence choice | Sponsor [Q6] | Not known | B18 (U20) public release | Release stays private; images are built but not published publicly |

## Not needed for the build

Admin consent in a real organisation (assumption A-3 in `ideation/feasibility/raid-log.md`, owned by the sponsor) matters for running the engine on real data, not for building it. The build uses test accounts only [Q5].

## Sources
- Decisions: `delivery-planning-questions.md` Q5, Q6, Q7.
- Assumptions: `ideation/feasibility/raid-log.md`.
- Bolt order: `bolt-plan.md`.
