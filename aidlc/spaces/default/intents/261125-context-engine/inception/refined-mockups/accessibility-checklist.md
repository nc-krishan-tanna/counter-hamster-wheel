# Accessibility Checklist (WCAG 2.1 AA)

Inputs: `mockups.md`, `interaction-spec.md`, `design-system-mapping.md`, `ideation/rough-mockups/wireframes.md` (wireframes), `ideation/rough-mockups/user-flow.md` (user-flow), `inception/user-stories/stories.md` (stories; US3.4) and `inception/requirements-analysis/requirements.md` (requirements; NFR7). Target: WCAG 2.1 AA across the web app. Every function of the 3D map is also available in the side panel and the List view.

## Global

- [ ] Every page declares its language and has one h1, with headings in order.
- [ ] Landmarks: header (top bar), nav (section navigation), main, aside (side panel), and footer where present.
- [ ] A "Skip to content" link is the first focusable element.
- [ ] Every interactive element is reachable by Tab in visual order, with a visible focus ring (2 px or more, 3:1 contrast).
- [ ] No keyboard traps. Dialogs trap focus while open, close on Escape, and return focus to the element that opened them.
- [ ] Text contrast is 4.5:1 or better and UI components 3:1 or better, in both light and dark themes and with organisation branding.
- [ ] Status, risk, item type and change marks never rely on colour alone (text, icon or shape too).
- [ ] Layout works at 200% and 400% zoom and down to 320 px wide, with no horizontal scrolling.
- [ ] Touch targets are 44 × 44 px or larger on mobile.
- [ ] Every form field has a visible label. Errors are named in text and linked to their field.
- [ ] Dynamic updates (selection, assessments, AI answers, toasts) are announced through polite live regions.
- [ ] Reduced-motion preference is respected. The timeline replay can be paused.
- [ ] No time limits on tasks. Session expiry keeps drafts.
- [ ] AI-generated content is labelled.

## Per screen

| Screen | h1 | Landmarks | Keyboard entry point | Specific checks |
|---|---|---|---|---|
| S1 Map | Map | header, nav, main, aside | Search box | Canvas has an `img` label with counts; all actions are in the side panel; filters are labelled |
| S2 Item page | Item title | header, nav, main, aside | Breadcrumb | h2 sections; sources state "Admins only" in text |
| S3 History | History | header, nav, main | First timeline entry | Timeline is an `ol`; diff marks announced as "removed" and "added" |
| S4 Reviews | Reviews | header, nav, main | View switch (radio) | List is a table with headers; decision is a radio group with a legend; required reason marked |
| S5 Editor | New item or change name | header, main, aside | Type field | @ combobox follows the ARIA combobox pattern; impact preview in a live region; focus goes to the first error |
| S6 Ask | Ask | header, nav, main | Message box | Messages in a `log` region; Send by Enter |
| S7 Simulate | Simulate | header, main | What-if field | "Sandbox" label is visible and announced |
| S8 List | List | header, nav, main | Search box | Tree semantics; arrows expand and collapse; Enter opens |
| S9 Settings | Settings | header, nav, main | First tab | Tabs follow the ARIA tabs pattern; Select on mobile |
| S10 My items | My items | header, nav, main | First tab | Status shown as text (STALE, DUE) |
| S11 Notifications | Notifications | header, main | First checkbox | Grid as a table with row and column headers |
| S12 First run | Set up your Context Engine | header, main | First field of the step | Progress shown as "Step 2 of 4" in text |

## Testing

- [ ] An automated scan (axe) runs in CI on every screen. Failures block the merge, in line with the team's CI practice (team-practices).
- [ ] Manual keyboard-only walkthrough of flows 1 to 5 from `user-flow.md` before each release.
- [ ] Screen-reader check with VoiceOver and NVDA on S1, S4, S5 and S8 before each release.

## Assumptions & Open Questions

- None.
