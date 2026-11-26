# Refined Mockups — Questions

Context: `ideation/rough-mockups/wireframes.md` and `user-flow.md`, `inception/user-stories/stories.md` and `inception/requirements-analysis/requirements.md` already settle the screens, the 3D map with its accessible list view, a clean neutral look, full responsiveness, and WCAG 2.1 AA. These questions cover only what is still open for the refined design.

## Q1. [Designer] Which ready-made component library should the web app use?

Your project rule is to use proven libraries rather than build our own. All three are open source and support accessibility.

A. shadcn/ui (built on Radix and Tailwind): neutral look, accessible building blocks, easy to restyle for each organisation
B. Material UI: very complete, but has a recognisable Google look
C. Mantine: complete and neutral, with less styling flexibility
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. [Designer] How should people write and edit an item?

Non-technical people must find this as easy as writing a document.

A. A document-style editor (like Notion or Google Docs) with a few structured fields above it: type, owner, review period
B. A plain form with labelled fields
C. Edit in place on the item page, with before and after shown side by side
D. Not yet defined
X. Other (please specify)

[Answer]: X. document style editor or an ai style askbox to make an edit (both!) you can have a choice. You might want it to be a conversational change to discuss it and you can assess everything

## Q3. [Product owner] How should people link items while writing?

You said links are what matters most.

A. Type @ to find and link an item as you write
B. A side panel where AI suggests links and you tick the ones that are right
C. Both
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Q4. [Designer] Light mode, dark mode, or both?

A. Both, following the device's setting, with a manual switch
B. Light only
C. Dark only
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q5. [Product owner] Where should notifications and reminders go?

Covers proposals waiting for you, decisions on your proposals, overrides and stale-item reminders. The user-stories review flagged this as unnamed.

A. In the web app, plus Slack or Teams for people whose chat account is linked
B. In the web app, plus email
C. All three: web app, chat and email, each person choosing which
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Consolidated Summary Confirmation

- Component library: shadcn/ui (Radix and Tailwind), restylable per organisation (Q1)
- Editing: both, a document-style editor with a few structured fields, and an AI ask box for describing or discussing a change in conversation, with the full impact assessment shown before it becomes a proposal; the person chooses which (Q2)
- Linking: both, type @ to link while writing, and a side panel of AI-suggested links to tick (Q3)
- Theme: light and dark, following the device with a manual switch (Q4)
- Notifications: web app, chat (Slack or Teams) and email, each person choosing which (Q5)
- Already settled and carried forward: 3D map home with synced side panel and list view, clean neutral look, fully responsive with desktop first, WCAG 2.1 AA

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
