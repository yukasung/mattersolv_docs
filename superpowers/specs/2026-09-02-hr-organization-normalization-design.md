# MatterSolv Phase 0.1 HR Organization Normalization Design

## Goal

Complete the Phase 0 employee foundation before starting the Clients module.
Replace duplicated department and position text on `employees` with
tenant-owned reference data, and add a tenant-safe employee reporting line.

Odoo 19 `hr.department`, `hr.job`, and the `hr.employee.parent_id` reporting
relationship are domain references only. MatterSolv keeps its existing SaaS
tenant isolation, Django authentication boundary, hybrid identifiers, and
frontend API contract.

## Scope

This change covers:

- `departments` and `job_positions` master tables;
- `employees.department_id`, `employees.job_position_id`, and
  `employees.manager_employee_id`;
- tenant-safe foreign keys, RLS, lifecycle constraints, indexes, seed
  contracts, migration guidance, diagram layout, and schema verifiers; and
- compatibility with the current frontend employee contract.

It does not add a Django backend, department/position administration pages,
employment history, work schedules, recruitment, payroll, or the Clients
module.

## Chosen model

Use two independent tenant-owned catalogs. A position does not belong to one
department. This permits positions such as Partner or Senior Employee to be
used across multiple departments and matches the existing frontend behavior.

Alternatives rejected:

- Scoping every position to a department duplicates common positions and
  complicates employee transfers.
- Introducing a temporal employee-assignment table now would support complete
  organization history, but that behavior has not been requested and would
  expand Phase 0.1 unnecessarily.

## Tables

### `departments`

`departments` is owned by one tenant and contains:

- `id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, the internal join key;
- `public_id UUID NOT NULL UNIQUE DEFAULT uuidv7()`, the API identifier;
- `tenant_id BIGINT NOT NULL`;
- `code VARCHAR(50) NOT NULL`, the stable API/business code;
- `code_key VARCHAR(50) NOT NULL`, populated as
  `lower(btrim(code))` by the application and protected by a check;
- `name VARCHAR(100) NOT NULL` with a non-blank check;
- nullable `parent_department_id BIGINT` for an organization hierarchy;
- `status` constrained to `active` or `archived`;
- nullable `archived_at`, required exactly when status is `archived`; and
- `created_at` and `updated_at` as non-null `TIMESTAMPTZ` values.

Required keys and indexes are:

- `UNIQUE (tenant_id, id)` for composite tenant foreign keys;
- `UNIQUE (tenant_id, code_key)` to prevent case-only duplicates;
- an index on `(tenant_id, status)` for active catalog reads; and
- an index on `(tenant_id, parent_department_id)` for hierarchy traversal.

The parent relationship uses
`FOREIGN KEY (tenant_id, parent_department_id) REFERENCES departments
(tenant_id, id)`. A deferred constraint trigger rejects direct and indirect
hierarchy cycles.

### `job_positions`

`job_positions` has the same ownership, hybrid ID, code/code-key, name,
lifecycle, timestamps, `UNIQUE (tenant_id, id)`,
`UNIQUE (tenant_id, code_key)`, and `(tenant_id, status)` index as
`departments`. It has no `department_id` because the catalogs are independent.

### `employees`

Remove the text columns `department` and `position`. Add:

- `department_id BIGINT NOT NULL`;
- `job_position_id BIGINT NOT NULL`; and
- `manager_employee_id BIGINT NULL`.

All three references are tenant-safe composite foreign keys:

- `(tenant_id, department_id) -> departments (tenant_id, id)`;
- `(tenant_id, job_position_id) -> job_positions (tenant_id, id)`; and
- `(tenant_id, manager_employee_id) -> employees (tenant_id, id)`.

Department and position deletion uses `RESTRICT`; records in use must be
archived instead. The manager relationship uses PostgreSQL column-list
`ON DELETE SET NULL (manager_employee_id)` so deleting a manager never clears
the employee's required `tenant_id`. Add indexes on each composite access
path. A row check rejects `manager_employee_id = id`, and a deferred
constraint trigger rejects longer reporting-line cycles.

## Tenant isolation and lifecycle

Both catalogs use the same verified internal `tenant_id` RLS context as the
other MatterSolv-owned tables. Django must validate active membership before
setting `SET LOCAL app.tenant_id`; the request header is never trusted as the
database context directly.

RLS is enabled and forced for `departments` and `job_positions`. Select,
insert, update, and delete policies compare each row's `tenant_id` with the
verified transaction setting. Composite foreign keys provide a second layer
of protection against cross-tenant references.

Archiving keeps historical employee relationships intact. Creating or moving
an employee may resolve only active catalog entries. Existing employees may
continue to reference an archived entry so historical data remains readable.

## Provisioning and frontend contract

Provision each tenant with the current frontend choices:

- departments: `court`, `civil`, `criminal`, and `accounting`;
- positions: `managingPartner`, `partner`, `seniorEmployee`, `employee`, and
  `assistantEmployee`.

The existing employee API fields `department` and `position` remain stable
codes. A future Django service resolves those codes against active catalog
rows in the current tenant when writing, and joins the references back to
codes when reading. This avoids breaking the frontend while internal database
joins use `BIGINT` keys.

Tenant-specific display names and catalog administration require a later API
and UI change. Phase 0.1 establishes the persistence contract without adding
an unimplemented frontend workflow.

## Migration contract

For a deployment containing employee data, the Django migration must:

1. Create both catalogs and their RLS/constraint support.
2. Insert one catalog row per distinct normalized department and position code
   for each tenant, plus any missing provisioning defaults.
3. Add nullable employee foreign-key columns and backfill them by tenant and
   normalized code.
4. Fail the migration if a source value cannot be mapped unambiguously.
5. Add and validate the composite foreign keys and hierarchy checks.
6. Change department and position foreign keys to `NOT NULL`.
7. Drop the old `employees.department` and `employees.position` text columns.

These steps run inside a controlled migration transaction. No production data
is silently assigned to a fallback department or position.

## Error behavior

The future service layer distinguishes:

- unknown or archived department/position code;
- a reference belonging to another tenant;
- duplicate catalog code after normalization;
- an employee managing themself;
- a department hierarchy cycle; and
- an employee reporting-line cycle.

Database constraints remain authoritative even when application validation is
also present.

## Verification

Schema verification must prove:

- both catalogs contain the required hybrid IDs, bounded strings, lifecycle
  checks, unique keys, and indexes;
- `employees.department` and `employees.position` no longer exist;
- all new employee references are indexed composite tenant foreign keys;
- UUID v7 and hybrid-ID verification includes both new entity tables;
- RLS is enabled and forced and rejects tenant A access to tenant B rows;
- duplicate normalized codes fail within one tenant but the same code works
  in different tenants;
- department and employee cycles are rejected;
- self-management is rejected;
- deleting an in-use department or position is restricted; and
- deleting an employee referenced as manager clears only
  `manager_employee_id`.

Existing authentication, commercial, tenant settings, string length, diagram
layout, and frontend type/test/build checks must continue to pass.

## Diagram layout

Place `departments` and `job_positions` in the People & HR region above or to
the left of `employees`. Keep the self-referencing relationship paths outside
the table cluster where possible, and update the People & HR layout verifier
to make the three-table organization visually distinguishable from Employee
Addresses.
