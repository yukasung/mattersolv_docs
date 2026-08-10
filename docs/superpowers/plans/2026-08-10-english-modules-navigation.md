# English Modules Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore English navigation and overview-page headings for the MatterSolv Modules documentation without changing routes, Thai descriptions, or module-detail pages.

**Architecture:** Keep the existing Nextra metadata and MDX structure. Update only the display labels in the global metadata and the heading/link text in the Modules overview, then verify the exact routes and build output.

**Tech Stack:** Next.js 16, Nextra 4, MDX, TypeScript, pnpm

## Global Constraints

- Keep explanatory descriptions on `/docs/modules` in Thai.
- Keep every route and slug unchanged.
- Do not change module-detail pages or unrelated documentation.
- Preserve all unrelated modified and untracked files.

---

### Task 1: Restore English Modules labels

**Files:**
- Modify: `docs/app/_meta.global.tsx`
- Modify: `docs/app/docs/modules/page.mdx`

**Interfaces:**
- Consumes: Nextra's existing `docs.items.modules` metadata object and the current `/docs/modules` MDX routes.
- Produces: English sidebar labels and English overview headings/link labels with unchanged route destinations.

- [ ] **Step 1: Capture the expected labels and routes**

Verify that the intended metadata labels are exactly:

```text
Modules, Overview, Clients, Matters, Documents, Quotations, Calendar,
Tasks, Billing, Finance, Human Resources, Reports, Administration
```

Verify that the overview keeps these eleven module destinations:

```text
/docs/modules/clients
/docs/modules/matters
/docs/modules/documents
/docs/modules/quotations
/docs/modules/calendar
/docs/modules/tasks
/docs/modules/billing
/docs/modules/finance
/docs/modules/hr
/docs/modules/reports
/docs/modules/administration
```

- [ ] **Step 2: Update the Modules metadata**

Replace the `modules` entry in `docs/app/_meta.global.tsx` with:

```tsx
modules: { title: 'Modules', items: { index: 'Overview', clients: 'Clients', matters: 'Matters', documents: 'Documents', quotations: 'Quotations', calendar: 'Calendar', tasks: 'Tasks', billing: 'Billing', finance: 'Finance', hr: 'Human Resources', reports: 'Reports', administration: 'Administration' } },
```

- [ ] **Step 3: Update the Modules overview labels**

In `docs/app/docs/modules/page.mdx`, use these English headings:

```md
# Modules
## Documentation Boundary
## Available Module Documents
## Related Documents
```

Use English module link labels (`Clients` through `Administration`) and English related-document labels (`Plans & Pricing`, `Feature Comparison`, `Plan Rules`, `Roles`, `Permissions`). Keep the Thai descriptions and all link targets unchanged.

- [ ] **Step 4: Verify labels and routes**

Run:

```bash
rg -n "title: 'Modules'|index: 'Overview'|clients: 'Clients'|hr: 'Human Resources'" docs/app/_meta.global.tsx
rg -n '^# Modules$|^## Documentation Boundary$|^## Available Module Documents$|^## Related Documents$' docs/app/docs/modules/page.mdx
rg -o '/docs/modules/[a-z-]+' docs/app/docs/modules/page.mdx
git diff --check -- docs/app/_meta.global.tsx docs/app/docs/modules/page.mdx
```

Expected: English labels are present, all eleven destinations are listed once, and `git diff --check` exits successfully.

- [ ] **Step 5: Build the documentation**

Run:

```bash
pnpm build
```

from `docs/`.

Expected: Next.js completes the production build and the postbuild sitemap/pagefind steps without errors.

- [ ] **Step 6: Commit the implementation**

```bash
git add docs/app/_meta.global.tsx docs/app/docs/modules/page.mdx
git commit -m "docs: restore English modules navigation"
```
