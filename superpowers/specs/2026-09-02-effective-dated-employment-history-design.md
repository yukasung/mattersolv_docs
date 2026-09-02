# MatterSolv Effective-Dated Employment History Design

**Date:** 2026-09-02

**Status:** Approved design

**Reference model:** Odoo 19 `hr.version`, adapted to MatterSolv's tenant-aware PostgreSQL and Django architecture

## Objective

MatterSolv must preserve an employee's employment changes over time instead of overwriting department, job position, manager, employment type, and contract dates on `employees`. The design follows Odoo's effective-dated version concept while retaining a denormalized current snapshot on `employees` for the existing frontend and common list queries.

The history table is the source of truth for employment assignments. The cached fields on `employees` are a transactionally synchronized projection of the selected current version.

## Scope

Each employment version records only employment data:

- department
- job position
- manager
- employment type
- contract start and end dates
- effective date
- change reason

Personal, contact, identity, private, and payroll data remain outside employment versions. `employment_start_date` and `departure_date` remain on `employees` because they describe the employee's overall lifecycle rather than one assignment version.

## Schema

### `employee_employment_versions`

This is a MatterSolv-owned, tenant-scoped table with the standard hybrid identifier pattern.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `BIGINT` | Identity primary key used by internal joins |
| `public_id` | `UUID` | Not null, unique, default `uuidv7()`; exposed outside the database |
| `tenant_id` | `BIGINT` | Not null; tenant ownership and RLS boundary |
| `employee_id` | `BIGINT` | Not null; employee whose employment state this version describes |
| `effective_from` | `DATE` | Not null; first tenant-local business date on which the version applies |
| `department_id` | `BIGINT` | Nullable tenant department reference |
| `job_position_id` | `BIGINT` | Nullable tenant job-position reference |
| `manager_employee_id` | `BIGINT` | Nullable self-domain employee reference |
| `employment_type` | `VARCHAR(20)` | Nullable stable code: `employee`, `worker`, `student`, `trainee`, `contractor`, or `freelance` |
| `contract_start_date` | `DATE` | Nullable date for the contract represented by this version |
| `contract_end_date` | `DATE` | Nullable; cannot precede `contract_start_date` |
| `change_reason` | `VARCHAR(255)` | Nullable human-readable explanation |
| `is_active` | `BOOLEAN` | Not null, default true; false means voided/corrected and excluded from selection |
| `recorded_by_tenant_user_id` | `BIGINT` | Not null; tenant membership that recorded the version |
| `created_at` | `TIMESTAMPTZ` | Not null |
| `updated_at` | `TIMESTAMPTZ` | Not null |

Required keys and indexes:

- `UNIQUE (tenant_id, id)` supports tenant-safe composite references.
- `UNIQUE (tenant_id, employee_id, id)` supports the current-version pointer from `employees`.
- Partial unique index on `(tenant_id, employee_id, effective_from) WHERE is_active` permits at most one active version for an employee on a given effective date while retaining voided corrections.
- Partial lookup index on `(tenant_id, employee_id, effective_from DESC) WHERE is_active` supports current and as-of selection.

Required constraints and relationships:

- `contract_end_date IS NULL OR (contract_start_date IS NOT NULL AND contract_end_date >= contract_start_date)`.
- Composite tenant foreign keys reference the employee, department, job position, manager employee, and recording tenant membership.
- The employee, department, job position, manager, and recording membership use restrictive deletion semantics. Normal lifecycle changes archive records; they do not erase employment history.
- The table has tenant RLS using the verified `app.tenant_id` context and the same forced-RLS policy as other tenant-owned tables.
- Runtime application roles may select, insert, and update versions but may not hard-delete them. Corrections set the old record inactive and create or activate the correct version, with an audit event.

### `employees` current snapshot

Add nullable `current_employment_version_id BIGINT` and retain the following cached current fields:

- `department_id`
- `job_position_id`
- `manager_employee_id`
- `employment_type`
- `contract_start_date`
- `contract_end_date`

The pointer is physically nullable so an employee and the employee's initial version can be inserted in one transaction. A deferred constraint trigger requires every committed employee to point to the correctly selected active version. Archived employees retain their pointer and history.

The pointer uses a three-column foreign key:

```sql
(tenant_id, id, current_employment_version_id)
    REFERENCES employee_employment_versions
        (tenant_id, employee_id, id)
```

This prevents a tenant from pointing an employee at another tenant's version and prevents one employee from pointing at another employee's version.

## Effective-Date Semantics

MatterSolv follows the useful Odoo behavior for past, current, and future versions:

1. Derive the business date on the server using `tenants.timezone`.
2. Select the active version with the greatest `effective_from` that is less than or equal to the business date.
3. If no version has started yet, select the earliest active future version. This supports provisioning an employee whose first day is in the future.

Temporal state such as `past`, `current`, or `future` is derived and is not persisted. `effective_to` is also not stored; the next active version's `effective_from` defines when the preceding assignment stops applying. Contract dates are independent of that version boundary.

As-of-date reports query `employee_employment_versions` directly. They do not use the cached snapshot on `employees`.

## Synchronization and Concurrency

Creating, correcting, voiding, or activating a version occurs in one Django transaction:

1. Lock the employee row with `SELECT ... FOR UPDATE`.
2. Validate tenant ownership, contract dates, the effective-date uniqueness rule, and manager relationships.
3. Write the version change.
4. Recompute the selected current version for the tenant-local business date.
5. Update `current_employment_version_id` and all cached employment fields together.
6. Record the tenant-scoped audit event.

A deferred PostgreSQL constraint trigger validates at commit that:

- the pointer resolves to the same tenant and employee;
- the pointed version is active and is the version selected by the effective-date rule; and
- every cached employment field exactly matches the pointed version, including null values.

The passage of time does not execute a database trigger. A daily idempotent Django scheduled job refreshes employees whose future version becomes current. Employment read/write services also perform a lazy refresh before returning or mutating current employment state, so correctness does not depend solely on the scheduler.

Manager-cycle validation has two layers:

- The existing deferred employee-manager trigger rejects cycles in the cached current hierarchy.
- Django validates a proposed future hierarchy when a version is created and validates it again when that version becomes current, because future cross-employee effective dates form a temporal rule that a simple row constraint cannot enforce safely.

## Frontend and API Contract

The existing employee API remains compatible. List and detail responses continue to expose the current department, job position, manager, employment type, and contract dates from the synchronized `employees` projection.

A later employment-history endpoint may expose versions by `public_id`, including past and future records. External clients never depend on the internal `BIGINT` identifiers. The client does not choose whether a future version is current; the backend derives that from the tenant-local business date.

## Migration and Provisioning

For each existing employee, the migration creates one active initial version:

- `effective_from` uses `employees.employment_start_date`.
- If the employment start date is absent, the migration uses the employee record's tenant-local creation date and records that fallback in the migration documentation.
- Current department, job position, manager, and any existing employment fields are copied into the version.
- The version is attributed to a designated system/provisioning tenant membership when the historical actor cannot be recovered.

The migration then backfills `current_employment_version_id`, validates the composite foreign keys, enables the deferred snapshot constraint trigger, and enables RLS. New employee provisioning always creates the employee and initial employment version atomically.

## Deletion and Correction Policy

Employment history is append-preserving:

- Employees with an employment version cannot be hard-deleted; normal removal archives the employee.
- Referenced departments, job positions, managers, and actor memberships cannot be hard-deleted while history depends on them; normal removal archives them.
- An incorrect version is not deleted. It is set to `is_active = false`, a corrected version is recorded, and the action is audited.
- Inactive versions never participate in current or as-of selection unless an explicit audit view requests voided records.

## Verification

Schema and runtime verification must cover:

- one active version per employee and effective date;
- selection of the latest active version on or before the tenant-local business date;
- earliest-future fallback when employment has not started;
- idempotent scheduled activation and lazy refresh;
- rejection of cross-tenant employee, department, position, manager, and actor references;
- rejection of a current pointer to another employee's version;
- rejection of snapshot values that differ from the pointed version;
- contract date ordering;
- RLS isolation and denial of runtime hard deletes;
- preservation of archived employee history;
- current manager-cycle rejection;
- future hierarchy validation at creation and activation;
- correct initial-version migration and fallback-date behavior; and
- unchanged frontend current-employment contract.

## Deliberate Differences from Odoo

MatterSolv adopts Odoo's effective-dated version concept and future-version behavior, but does not copy the Odoo schema directly:

- Every employment version is tenant-owned and protected by composite tenant foreign keys and RLS.
- MatterSolv uses hybrid `BIGINT`/UUID v7 identifiers for domain tables.
- Django services own atomic updates, authorization, audit recording, tenant-local date resolution, and scheduled activation.
- Personal, private, identity, and payroll fields are not duplicated into employment history.
- `employees` remains an explicit current-state projection to preserve the existing API and fast common queries.
