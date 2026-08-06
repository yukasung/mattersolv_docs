# DEV-178 Frontend Access-Control Contract Design

## Goal

Provide a frontend-only domain contract and deterministic fixture data for
workspace-scoped access profiles, member role assignments, individual
permission overrides, scopes, authorization outcomes, and audit metadata.

## Scope

- Reuse the system permission catalogue already exposed by the Access Profile
  frontend module.
- Model the six default templates as workspace-owned copies, not shared system
  records.
- Provide pure validation and provisioning helpers that frontend fixtures and
  future API adapters can use.
- Cover workspace isolation and the PRO-or-higher override rule with tests.
- Add an implementation-facing contract document for the future backend.

## Explicitly out of scope

- No API route, database schema or migration, server-side provisioning job, or
  runtime authorization enforcement.
- No new UI route or screen in this ticket. Existing access-profile UI remains
  the consumer of its current fixture model until the next frontend issue
  connects it to this contract.

## Design

`frontend/src/modules/access-control/contracts.ts` is a UI-independent
TypeScript boundary. It defines `PlanTier`, workspace-owned `AccessProfile`,
`MemberRoleAssignment`, `IndividualPermissionOverride`, `AccessScope`,
`AuthorizationDecision`, and `RolePermissionAuditMetadata`.

The module exposes three pure helpers:

1. `provisionWorkspaceAccessProfiles` creates a new array of six profile
   copies for a provided workspace id. Its caller supplies an id factory, so
   fixture tests remain deterministic. It copies permission-code arrays rather
   than retaining template references.
2. `validateMemberRoleAssignment` returns a clear validation error when the
   member or any assigned profile belongs to another workspace.
3. `canUseIndividualOverride` permits only `PRO` and `ENTERPRISE`.

The contract deliberately represents an authorization result but does not
evaluate it; enforcement and UI gates belong to DEV-180. This keeps the
frontend fixture layer honest about what it can verify without a backend.

## Data flow

When a workspace fixture is created, its caller invokes the provisioning
helper with the workspace id and six system templates. The resulting
workspace-owned profiles can then be selected in a same-workspace member
assignment. An individual override may be shown only when the active plan
passes `canUseIndividualOverride`. A future API adapter will replace the
fixture source without changing the consumer types.

## Error handling and tests

- Reject an assignment when either the member or selected profile workspace id
  differs from the assignment workspace id.
- Verify two provisioning calls produce distinct profile ids and independent
  permission arrays.
- Verify `STANDARD` cannot use individual overrides and `PRO` can.
- Keep all data fixtures local to the frontend; never claim that these checks
  enforce access on the server.

