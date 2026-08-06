# DEV-178 Frontend Access-Control Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add frontend-only, tenant-safe access-control contracts and fixture provisioning helpers for DEV-178.

**Architecture:** A UI-independent `access-control` module consumes default template data, returns workspace-owned copies, validates member assignments, and decides only whether a plan may show individual overrides. It has no transport, persistence, or enforcement layer.

**Tech Stack:** TypeScript 5.7, Vitest 3.2, React/Vite; no new dependencies.

## Global Constraints

- Implement frontend contracts, fixture helpers, and tests only; no API endpoint, schema, migration, or server-side authorization.
- Every profile, member and assignment uses `workspaceId`; never infer access from a job title or profile name.
- Individual overrides are limited to `PRO` and `ENTERPRISE`.
- Copy the permission-code array when provisioning a profile.
- Do not modify user-owned `src/shared/ui/`.

---

### Task 1: Define workspace-scoped contracts and plan gating

**Files:**

- Create: `frontend/src/modules/access-control/contracts.test.ts`
- Create: `frontend/src/modules/access-control/contracts.ts`

**Interfaces:**

- Produces `PlanTier`, `WorkspaceAccessProfileTemplate`, `WorkspaceAccessProfile`, `WorkspaceMember`, `MemberRoleAssignment`, `IndividualPermissionOverride`, `AccessScope`, `AuthorizationDecision`, and `RolePermissionAuditMetadata`.
- Produces `canUseIndividualOverride(plan: PlanTier): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
import { canUseIndividualOverride } from "./contracts";

it("allows individual overrides only on PRO or higher", () => {
  expect(canUseIndividualOverride("STANDARD")).toBe(false);
  expect(canUseIndividualOverride("PRO")).toBe(true);
  expect(canUseIndividualOverride("ENTERPRISE")).toBe(true);
});
```

- [ ] **Step 2: Run the test and confirm it is red**

Run: `cd frontend && corepack pnpm test --run src/modules/access-control/contracts.test.ts`

Expected: FAIL because `./contracts` does not exist.

- [ ] **Step 3: Add the smallest contract module**

```ts
export type PlanTier = "ESSENTIALS" | "STANDARD" | "PRO" | "ENTERPRISE";

export function canUseIndividualOverride(plan: PlanTier): boolean {
  return plan === "PRO" || plan === "ENTERPRISE";
}
```

Add the named records with mandatory `workspaceId`. Define
`AuthorizationDecision` as `{ allowed: boolean; failedRule?: "account" |
"plan" | "permission" | "scope" | "workflow" }`; do not add an evaluator.

- [ ] **Step 4: Run the test and confirm it is green**

Run: `cd frontend && corepack pnpm test --run src/modules/access-control/contracts.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/access-control/contracts.ts src/modules/access-control/contracts.test.ts
git commit -m "feat: add frontend access-control contracts"
```

### Task 2: Provision independent workspace profile fixtures

**Files:**

- Modify: `frontend/src/modules/access-control/contracts.test.ts`
- Modify: `frontend/src/modules/access-control/contracts.ts`

**Interfaces:**

- Consumes `WorkspaceAccessProfileTemplate` and `createId(): string`.
- Produces `provisionWorkspaceAccessProfiles(workspaceId, templates, createId): WorkspaceAccessProfile[]`.

- [ ] **Step 1: Write failing provisioning tests**

```ts
const templates = [{ key: "admin", name: "Admin", permissionCodes: ["member.view"] }];
const first = provisionWorkspaceAccessProfiles("workspace-a", templates, sequenceId("a"));
const second = provisionWorkspaceAccessProfiles("workspace-b", templates, sequenceId("b"));

expect(first[0]).toMatchObject({ workspaceId: "workspace-a", name: "Admin" });
expect(second[0]).toMatchObject({ workspaceId: "workspace-b", name: "Admin" });
expect(first[0].id).not.toBe(second[0].id);
expect(first[0].permissionCodes).not.toBe(templates[0].permissionCodes);
```

- [ ] **Step 2: Run the test and confirm it is red**

Run: `cd frontend && corepack pnpm test --run src/modules/access-control/contracts.test.ts`

Expected: FAIL because `provisionWorkspaceAccessProfiles` is not exported.

- [ ] **Step 3: Add the provisioning helper**

```ts
export function provisionWorkspaceAccessProfiles(
  workspaceId: string,
  templates: readonly WorkspaceAccessProfileTemplate[],
  createId: () => string,
): WorkspaceAccessProfile[] {
  return templates.map((template) => ({
    id: createId(), workspaceId, templateKey: template.key, name: template.name,
    permissionCodes: [...template.permissionCodes], source: "default",
  }));
}
```

- [ ] **Step 4: Run the test and confirm it is green**

Run: `cd frontend && corepack pnpm test --run src/modules/access-control/contracts.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/access-control/contracts.ts src/modules/access-control/contracts.test.ts
git commit -m "feat: provision workspace access-profile fixtures"
```

### Task 3: Validate same-workspace member assignment

**Files:**

- Modify: `frontend/src/modules/access-control/contracts.test.ts`
- Modify: `frontend/src/modules/access-control/contracts.ts`

**Interfaces:**

- Produces `validateMemberRoleAssignment(assignment, member, profiles): string | undefined`.

- [ ] **Step 1: Write failing isolation tests**

```ts
const error = validateMemberRoleAssignment(
  { workspaceId: "workspace-a", memberId: "member-a", profileIds: ["profile-b"] },
  { id: "member-a", workspaceId: "workspace-a", active: true },
  [{ id: "profile-b", workspaceId: "workspace-b", name: "Admin", templateKey: "admin", source: "default", permissionCodes: [] }],
);
expect(error).toBe("ไม่สามารถกำหนด Access Profile ข้าม Workspace ได้");
```

Also test a member from another workspace and a valid same-workspace
assignment returning `undefined`.

- [ ] **Step 2: Run the test and confirm it is red**

Run: `cd frontend && corepack pnpm test --run src/modules/access-control/contracts.test.ts`

Expected: FAIL because `validateMemberRoleAssignment` is not exported.

- [ ] **Step 3: Add the validator**

```ts
export function validateMemberRoleAssignment(
  assignment: MemberRoleAssignment,
  member: WorkspaceMember,
  profiles: readonly WorkspaceAccessProfile[],
): string | undefined {
  if (member.workspaceId !== assignment.workspaceId) return "ไม่สามารถกำหนดสมาชิกข้าม Workspace ได้";
  if (profiles.some((profile) => profile.workspaceId !== assignment.workspaceId)) {
    return "ไม่สามารถกำหนด Access Profile ข้าม Workspace ได้";
  }
}
```

- [ ] **Step 4: Run the test and confirm it is green**

Run: `cd frontend && corepack pnpm test --run src/modules/access-control/contracts.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/access-control/contracts.ts src/modules/access-control/contracts.test.ts
git commit -m "feat: validate workspace role assignments"
```

### Task 4: Document the backend boundary and verify

**Files:**

- Create: `docs/requirements/access-control/frontend-contract-boundary.md`

- [ ] **Step 1: Document the adapter boundary**

State that DEV-178 fixtures are local only. A future backend must provision the
six profiles, enforce tenant isolation and plan eligibility, persist audit
events, and return authorization failures; this ticket introduces none of
those runtime behaviours.

- [ ] **Step 2: Run complete verification**

Run: `cd frontend && corepack pnpm test --run src/modules/access-control/contracts.test.ts && corepack pnpm test --run && corepack pnpm typecheck && corepack pnpm lint && corepack pnpm build && git diff --check`

Expected: the contract tests and full suite pass; report separately any
pre-existing failure caused by user-owned untracked files.

- [ ] **Step 3: Commit**

```bash
git add src/modules/access-control docs/requirements/access-control/frontend-contract-boundary.md
git commit -m "docs: clarify frontend authorization boundary"
```

## Self-Review

- Spec coverage: Types, independent workspace copies, same-workspace validation, PRO gating, and the deferred backend boundary are all assigned.
- Placeholder scan: no implementation behaviour is left unnamed; backend work is explicitly deferred.
- Type consistency: all tenant checks use the `workspaceId` records declared in Task 1.
