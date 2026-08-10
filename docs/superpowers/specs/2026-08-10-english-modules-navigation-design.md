# English Modules Navigation Design

## Goal

Restore English labels for the Modules section of the MatterSolv documentation while preserving Thai explanatory content and all existing URLs.

## Scope

- Change the Modules sidebar title and its twelve navigation labels to English.
- Change the `/docs/modules` H1, section headings, module link labels, and related-document link labels to English.
- Keep explanatory descriptions on `/docs/modules` in Thai.
- Keep every route and slug unchanged.
- Do not change module-detail pages or unrelated documentation.

## English Labels

The sidebar and overview page use the same vocabulary:

- Modules
- Overview
- Clients
- Matters
- Documents
- Quotations
- Calendar
- Tasks
- Billing
- Finance
- Human Resources
- Reports
- Administration

The overview page uses these section headings:

- Documentation Boundary
- Available Module Documents
- Related Documents

## Files

- `docs/app/_meta.global.tsx`
- `docs/app/docs/modules/page.mdx`

## Verification

- Confirm the twelve module links retain their current `/docs/modules/...` destinations.
- Confirm no Thai navigation labels remain in the Modules metadata.
- Build the documentation package successfully.
- Inspect `/docs/modules` on the local documentation server when available.

## Non-goals

- Translating Thai descriptions into English.
- Renaming URLs or slugs.
- Editing module-detail pages.
- Modifying unrelated dirty or untracked files.
