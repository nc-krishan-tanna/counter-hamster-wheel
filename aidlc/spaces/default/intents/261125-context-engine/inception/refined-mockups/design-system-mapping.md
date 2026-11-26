# Design System Mapping

Inputs: `mockups.md`, `interaction-spec.md`, `ideation/rough-mockups/wireframes.md` (wireframes; clean neutral look), `inception/requirements-analysis/requirements.md` (requirements), `inception/user-stories/stories.md` (stories) and `inception/practices-discovery/team-practices.md` (team-practices; TypeScript, use proven libraries).

## Foundation

- **Component library:** shadcn/ui, built on Radix primitives with Tailwind styling. Radix supplies keyboard handling and ARIA, so we do not build our own. (Q1, project rule: use proven libraries)
- **Theme:** light and dark, defined as CSS variables. The app follows the device setting, with a manual switch whose choice is stored per person. (Q4)
- **Per-organisation brand:** an Admin can set a logo and a primary colour, which override the `--primary` tokens. Contrast is checked when it is saved. A colour that fails 4.5:1 against both themes is refused with a suggestion.

## Component mapping

| UI need | shadcn/ui component | Used in |
|---|---|---|
| App navigation | Navigation Menu, Sheet (mobile menu) | Shell |
| Search | Command (cmdk) | Top bar, @-mentions |
| Filters | Select, Toggle Group | S1, S8 |
| Side panel / drawer | Sheet (tablet), Card | S1 |
| Tree / list | Accordion plus list (tree semantics added) | S8 |
| Item header and badges | Badge | S2, S3, S4, S10 |
| Rich-text editor | Tiptap editor (proven open-source library) styled with shadcn tokens | S5 |
| @-mention picker | Command inside Popover | S5 |
| Suggested links | Checkbox | S5 |
| Decision form | Radio Group, Textarea, Button | S4 |
| Confirmations | Alert Dialog | Archive, Reject, Override, Deactivate |
| Tabs | Tabs (Select on mobile) | S9, S10 |
| Toasts / status | Sonner (shadcn toast) plus live regions | Global |
| Notifications | Dropdown Menu, Table (settings grid) | Shell, S11 |
| Data tables | Table | S4 list, S9 |
| Wizard | Card plus custom stepper using Progress | S12 |
| Chat | ScrollArea, Textarea, Button | S6 |
| 3D map | three.js through react-three-fiber and a force-graph library (proven open source); not part of shadcn | S1 |

## Tokens

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--background` | near-white | near-black | Neutral grey scale |
| `--foreground` | near-black | near-white | Body text at 4.5:1 or better |
| `--primary` | neutral blue (overridable) | lighter blue (overridable) | Organisation brand |
| `--destructive` | red | lighter red | Always paired with an icon and text |
| `--risk-low` / `--risk-medium` / `--risk-high` | green / amber / red | lighter variants | Always paired with the LOW/MEDIUM/HIGH text |
| Spacing | 4, 8, 16, 24, 32, 48 px | same | Tailwind scale |
| Radius | 8 px | same | shadcn default |
| Type | system sans-serif; 14 px body, 16 px editor, 12 px meta | same | Supports 200% zoom |

## Item type encoding (never colour alone)

| Type | Letter | 3D shape | Colour hue |
|---|---|---|---|
| Business rule or policy | R | Cube | Indigo |
| Process | P | Cylinder | Teal |
| Glossary term | G | Small sphere | Grey |
| Person | U | Sphere with ring | Amber |
| Team | T | Large sphere | Orange |
| System | S | Octahedron | Purple |
| Decision | D | Diamond | Rose |

Stale items have a dashed outline and a STALE label. Archived items are hidden unless the "Show archived" filter is on.

## Assumptions & Open Questions

- Tiptap (editor) and react-three-fiber with a force-graph library (3D map) are proposed proven libraries. The final choices are confirmed in the design and code generation stages, alongside the tech stack.
