# MatterSolv Phase 0.1 HR Organization Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize employee departments and positions into tenant-owned catalogs and add a tenant-safe employee manager hierarchy.

**Architecture:** Add `departments` and `job_positions` as hybrid-ID, tenant-owned entities in drawDB. Replace employee text values with internal `BIGINT` references while retaining stable codes at the API boundary, and enforce tenant equality, RLS, lifecycle, and acyclic hierarchies in the existing Phase 0 companion migration.

**Tech Stack:** PostgreSQL 18, drawDB JSON (`database.ddb`), Node.js static verifiers, `psql` runtime verification, Nextra documentation.

## Global Constraints

- Work in the current `docs` repository; do not create a Git worktree.
- Execute inline; repository instructions prohibit subagent-driven execution.
- Preserve all pre-existing dirty files and stage only files named by each task.
- MatterSolv-owned entity tables use `BIGINT` identity primary keys plus `public_id UUID NOT NULL UNIQUE DEFAULT uuidv7()`.
- All tenant-owned references use composite `(tenant_id, id)` foreign-key contracts and PostgreSQL RLS based on verified `app.tenant_id`.
- Keep the existing frontend employee API fields `department` and `position` as stable codes; do not add frontend CRUD in this plan.
- Use bounded `VARCHAR(50)` for codes, `VARCHAR(100)` for catalog names, and `TIMESTAMPTZ` for event timestamps.
- Catalog records and employees are archived for normal lifecycle operations; hard deletion is exceptional.
- Do not start the Clients module in this plan.

---

## File map

- `database.ddb`: physical diagram, fields, indexes, relationships, comments, and People & HR layout.
- `docs/scripts/verify-database-hr-organization.mjs`: focused static contract for the diagram, companion migration, seeds, and runtime test artifact.
- `docs/scripts/mattersolv-phase0-tenant-isolation.sql`: composite tenant FKs, RLS, cycle triggers, and manager delete behavior.
- `docs/scripts/verify-database-hr-organization.sql`: executable PostgreSQL 18 behavioral checks.
- `docs/scripts/database-identifier-contract.mjs`: entity identifier ownership catalog.
- `docs/scripts/verify-database-tenant-isolation.mjs`: exhaustive RLS, composite FK, and tenant deletion references.
- `docs/scripts/verify-database-string-lengths.mjs`: bounded-string registry.
- `docs/scripts/verify-database-layout.mjs`: People & HR domain membership and non-overlap checks.
- `docs/package.json`: focused verifier command.
- `docs/app/docs/database/page.mdx`: persistence, migration, RLS, and test contract.
- `docs/app/docs/modules/employees/page.mdx`: employee organization model and current single-primary-position boundary.

---

### Task 1: Lock the diagram contract and add the HR organization entities

**Files:**
- Create: `docs/scripts/verify-database-hr-organization.mjs`
- Modify: `docs/package.json`
- Modify: `database.ddb`
- Modify: `docs/scripts/database-identifier-contract.mjs`
- Modify: `docs/scripts/verify-database-string-lengths.mjs`
- Modify: `docs/scripts/verify-database-layout.mjs`

**Interfaces:**
- Consumes: the existing drawDB table/field/index JSON format and hybrid identifier lists.
- Produces: diagram tables `departments` and `job_positions`; employee fields `department_id`, `job_position_id`, and `manager_employee_id`; command `npm run database:hr-organization:verify`.

- [ ] **Step 1: Write the failing focused verifier**

Create `docs/scripts/verify-database-hr-organization.mjs` with helpers that resolve tables, fields, indexes, and drawDB relationships by name. The assertions must include this exact contract:

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const diagram = JSON.parse(
  await readFile(new URL('../../database.ddb', import.meta.url), 'utf8')
)
const tables = new Map(diagram.tables.map((table) => [table.name, table]))
const table = (name) => {
  const value = tables.get(name)
  assert.ok(value, `${name} must exist`)
  return value
}
const field = (tableName, fieldName) =>
  table(tableName).fields.find(({ name }) => name === fieldName)
const index = (tableName, indexName) =>
  table(tableName).indices.find(({ name }) => name === indexName)
const relationship = (name) =>
  diagram.relationships.find((item) => item.name === name)

for (const tableName of ['departments', 'job_positions']) {
  assert.equal(field(tableName, 'id')?.type, 'BIGINT')
  assert.equal(field(tableName, 'id')?.primary, true)
  assert.equal(field(tableName, 'id')?.increment, true)
  assert.equal(field(tableName, 'public_id')?.type, 'UUID')
  assert.equal(field(tableName, 'public_id')?.default, 'uuidv7()')
  assert.equal(field(tableName, 'public_id')?.unique, true)
  assert.equal(field(tableName, 'tenant_id')?.type, 'BIGINT')
  assert.equal(field(tableName, 'tenant_id')?.notNull, true)
  assert.equal(field(tableName, 'code')?.type, 'VARCHAR')
  assert.equal(Number(field(tableName, 'code')?.size), 50)
  assert.equal(field(tableName, 'code_key')?.type, 'VARCHAR')
  assert.equal(Number(field(tableName, 'code_key')?.size), 50)
  assert.match(field(tableName, 'code_key')?.check ?? '', /lower\(btrim\(code\)\)/)
  assert.equal(field(tableName, 'name')?.type, 'VARCHAR')
  assert.equal(Number(field(tableName, 'name')?.size), 100)
  assert.match(field(tableName, 'name')?.check ?? '', /btrim\(name\).*<> ''/)
  assert.match(field(tableName, 'status')?.check ?? '', /active.*archived/)
  assert.match(field(tableName, 'status')?.check ?? '', /archived_at IS NOT NULL/)
  assert.deepEqual(index(tableName, `uq_${tableName}_tenant_id`)?.fields, ['tenant_id', 'id'])
  assert.equal(index(tableName, `uq_${tableName}_tenant_id`)?.unique, true)
  assert.deepEqual(index(tableName, `uq_${tableName}_tenant_code_key`)?.fields, ['tenant_id', 'code_key'])
  assert.equal(index(tableName, `uq_${tableName}_tenant_code_key`)?.unique, true)
  assert.deepEqual(index(tableName, `idx_${tableName}_tenant_status`)?.fields, ['tenant_id', 'status'])
}

assert.equal(field('departments', 'parent_department_id')?.type, 'BIGINT')
assert.equal(field('departments', 'parent_department_id')?.notNull, false)
assert.deepEqual(index('departments', 'idx_departments_tenant_parent')?.fields, ['tenant_id', 'parent_department_id'])
assert.equal(field('job_positions', 'department_id'), undefined)

const seedNote = diagram.notes.find(({ title }) => title === 'Seed catalog')
assert.ok(seedNote, 'Seed catalog note must exist')
for (const code of [
  'court', 'civil', 'criminal', 'accounting', 'managingPartner',
  'partner', 'seniorEmployee', 'employee', 'assistantEmployee'
]) assert.match(seedNote.content, new RegExp(code))

assert.equal(field('employees', 'department'), undefined)
assert.equal(field('employees', 'position'), undefined)
assert.equal(field('employees', 'department_id')?.type, 'BIGINT')
assert.equal(field('employees', 'department_id')?.notNull, true)
assert.equal(field('employees', 'job_position_id')?.type, 'BIGINT')
assert.equal(field('employees', 'job_position_id')?.notNull, true)
assert.equal(field('employees', 'manager_employee_id')?.type, 'BIGINT')
assert.equal(field('employees', 'manager_employee_id')?.notNull, false)
assert.match(field('employees', 'manager_employee_id')?.check ?? '', /manager_employee_id <> id/)

for (const [name, deleteConstraint] of [
  ['fk_departments_tenant_id', 'Restrict'],
  ['fk_departments_parent_department_id', 'Restrict'],
  ['fk_job_positions_tenant_id', 'Restrict'],
  ['fk_employees_department_id', 'Restrict'],
  ['fk_employees_job_position_id', 'Restrict'],
  ['fk_employees_manager_employee_id', 'Set null']
]) {
  assert.ok(relationship(name), `${name} must exist`)
  assert.equal(relationship(name).deleteConstraint, deleteConstraint)
}

for (const [name, fields] of [
  ['idx_employees_tenant_department', ['tenant_id', 'department_id']],
  ['idx_employees_tenant_job_position', ['tenant_id', 'job_position_id']],
  ['idx_employees_tenant_manager', ['tenant_id', 'manager_employee_id']]
]) {
  assert.deepEqual(index('employees', name)?.fields, fields)
}

console.log('Verified tenant HR organization diagram contract')
```

Add the command to `docs/package.json`:

```json
"database:hr-organization:verify": "node scripts/verify-database-hr-organization.mjs"
```

- [ ] **Step 2: Run the verifier and observe the expected failure**

Run: `npm run database:hr-organization:verify`

Expected: FAIL with `AssertionError: departments must exist`.

- [ ] **Step 3: Add the two catalog tables and replace employee text fields**

Edit `database.ddb` using its existing JSON shape. Add `departments` with these fields:

```text
id BIGINT PK identity NOT NULL
public_id UUID UNIQUE NOT NULL DEFAULT uuidv7()
tenant_id BIGINT NOT NULL
code VARCHAR(50) NOT NULL
code_key VARCHAR(50) NOT NULL CHECK code_key = lower(btrim(code))
name VARCHAR(100) NOT NULL CHECK btrim(name) <> ''
parent_department_id BIGINT NULL
status TEXT NOT NULL DEFAULT active
  CHECK status IN ('active','archived')
    AND ((status = 'archived') = (archived_at IS NOT NULL))
archived_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

Add these `departments` indexes:

```text
uq_departments_tenant_id UNIQUE (tenant_id, id)
uq_departments_tenant_code_key UNIQUE (tenant_id, code_key)
idx_departments_tenant_status (tenant_id, status)
idx_departments_tenant_parent (tenant_id, parent_department_id)
```

Add `job_positions` with the same fields except `parent_department_id`, and these indexes:

```text
uq_job_positions_tenant_id UNIQUE (tenant_id, id)
uq_job_positions_tenant_code_key UNIQUE (tenant_id, code_key)
idx_job_positions_tenant_status (tenant_id, status)
```

Replace `employees.department` and `employees.position` with:

```text
department_id BIGINT NOT NULL
job_position_id BIGINT NOT NULL
manager_employee_id BIGINT NULL CHECK manager_employee_id IS NULL OR manager_employee_id <> id
```

Add the three composite employee indexes asserted in Step 1. Add drawDB relationships with the exact names and delete behaviors in Step 1. Use `#059669` for both new tables.

Extend the existing `Seed catalog` note with the four department codes and
five position codes asserted in Step 1. Extend `Composite tenant foreign-key
contract` to name the new department parent, employee department, employee
position, and employee manager relationships. Increase only those note heights
needed to contain the new text, keeping each at or below 480.

Arrange the People & HR area without changing its bounding box:

```text
employees:          x=1520, y=1630
departments:        x=1790, y=1630
job_positions:      x=2030, y=1630
employee_addresses: x=1790, y=2150
```

- [ ] **Step 4: Register identifiers, bounded strings, and layout ownership**

Add both tables to `publicIdentifierTableNames` in
`docs/scripts/database-identifier-contract.mjs`:

```js
'departments',
'job_positions',
```

Add these entries to `boundedStrings` in
`docs/scripts/verify-database-string-lengths.mjs`:

```js
['departments.code', 50],
['departments.code_key', 50],
['departments.name', 100],
['job_positions.code', 50],
['job_positions.code_key', 50],
['job_positions.name', 100],
```

Change the People & HR list in `docs/scripts/verify-database-layout.mjs` to:

```js
['People & HR', [
  'employees', 'departments', 'job_positions', 'employee_addresses'
]],
```

- [ ] **Step 5: Run focused diagram verification**

Run:

```bash
npm run database:hr-organization:verify
npm run database:identifiers:verify
npm run database:string-lengths:verify
npm run database:layout:verify
```

Expected: all four commands PASS and report both new tables in their contracts.

- [ ] **Step 6: Commit the diagram contract**

```bash
git add database.ddb docs/package.json \
  docs/scripts/verify-database-hr-organization.mjs \
  docs/scripts/database-identifier-contract.mjs \
  docs/scripts/verify-database-string-lengths.mjs \
  docs/scripts/verify-database-layout.mjs
git commit -m "feat: normalize tenant HR organization schema"
```

---

### Task 2: Enforce tenant-safe relationships, RLS, and acyclic hierarchies

**Files:**
- Modify: `docs/scripts/verify-database-hr-organization.mjs`
- Modify: `docs/scripts/mattersolv-phase0-tenant-isolation.sql`
- Create: `docs/scripts/verify-database-hr-organization.sql`
- Modify: `docs/scripts/verify-database-tenant-isolation.mjs`

**Interfaces:**
- Consumes: `UNIQUE (tenant_id, id)` keys from Task 1 and transaction setting `app.tenant_id`.
- Produces: composite FK names `fk_departments_parent_tenant`, `fk_employees_department_tenant`, `fk_employees_job_position_tenant`, and `fk_employees_manager_tenant`; deferred cycle constraints `departments_no_cycle` and `employees_manager_no_cycle`.

- [ ] **Step 1: Extend the focused verifier before changing the migration**

Read the companion migration and runtime SQL from the focused verifier:

```js
const isolation = await readFile(
  new URL('./mattersolv-phase0-tenant-isolation.sql', import.meta.url),
  'utf8'
)
const runtimeVerifier = await readFile(
  new URL('./verify-database-hr-organization.sql', import.meta.url),
  'utf8'
)

for (const tableName of ['departments', 'job_positions']) {
  assert.match(isolation, new RegExp(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`))
  assert.match(isolation, new RegExp(`ALTER TABLE "${tableName}" FORCE ROW LEVEL SECURITY;`))
  assert.match(isolation, new RegExp(`CREATE POLICY tenant_isolation ON "${tableName}"`))
}
for (const expected of [
  'FOREIGN KEY ("tenant_id", "parent_department_id") REFERENCES "departments" ("tenant_id", "id")',
  'FOREIGN KEY ("tenant_id", "department_id") REFERENCES "departments" ("tenant_id", "id")',
  'FOREIGN KEY ("tenant_id", "job_position_id") REFERENCES "job_positions" ("tenant_id", "id")',
  'FOREIGN KEY ("tenant_id", "manager_employee_id") REFERENCES "employees" ("tenant_id", "id")',
  'ON DELETE SET NULL ("manager_employee_id")',
  'CREATE CONSTRAINT TRIGGER departments_no_cycle',
  'CREATE CONSTRAINT TRIGGER employees_manager_no_cycle'
]) assert.ok(isolation.includes(expected), `missing HR constraint: ${expected}`)

for (const expected of [
  'Cross-tenant department was accepted',
  'Duplicate normalized department code was accepted',
  'Department cycle was accepted',
  'Employee manager cycle was accepted',
  'Self-manager was accepted',
  'Deleting an in-use job position was accepted',
  'Manager deletion did not clear manager_employee_id',
  'RLS exposed Tenant B departments to Tenant A'
]) assert.match(runtimeVerifier, new RegExp(expected))
```

Create `docs/scripts/verify-database-hr-organization.sql` with
`\set ON_ERROR_STOP on` and create two tenants plus a department and position
for each tenant with this deterministic setup:

```sql
INSERT INTO tenants (slug, name)
VALUES ('hr-org-a', 'HR Organization A')
RETURNING id AS tenant_a_id \gset
INSERT INTO tenants (slug, name)
VALUES ('hr-org-b', 'HR Organization B')
RETURNING id AS tenant_b_id \gset

INSERT INTO departments (tenant_id, code, code_key, name)
VALUES
  (:'tenant_a_id', 'civil', 'civil', 'Civil'),
  (:'tenant_a_id', 'criminal', 'criminal', 'Criminal')
RETURNING id;
INSERT INTO departments (tenant_id, code, code_key, name)
VALUES (:'tenant_b_id', 'civil', 'civil', 'Civil')
RETURNING id AS tenant_b_department_id \gset

INSERT INTO job_positions (tenant_id, code, code_key, name)
VALUES (:'tenant_a_id', 'employee', 'employee', 'Employee')
RETURNING id AS tenant_a_position_id \gset
INSERT INTO job_positions (tenant_id, code, code_key, name)
VALUES (:'tenant_b_id', 'employee', 'employee', 'Employee')
RETURNING id AS tenant_b_position_id \gset

SELECT id AS tenant_a_department_id FROM departments
WHERE tenant_id = :'tenant_a_id' AND code_key = 'civil' \gset

INSERT INTO employees (
  tenant_id, employee_number, employee_number_key, prefix,
  first_name, last_name, work_email, work_phone,
  department_id, job_position_id, employment_start_date,
  identity_document_type, identity_number
) VALUES (
  :'tenant_a_id', 'EMP-MGR', 'emp-mgr', 'mr',
  'Manager', 'One', 'manager@example.test', '+66810000001',
  :'tenant_a_department_id', :'tenant_a_position_id', DATE '2026-01-01',
  'national_id', '1000000000001'
) RETURNING id AS manager_employee_id \gset

INSERT INTO employees (
  tenant_id, employee_number, employee_number_key, prefix,
  first_name, last_name, work_email, work_phone,
  department_id, job_position_id, manager_employee_id,
  employment_start_date, identity_document_type, identity_number
) VALUES (
  :'tenant_a_id', 'EMP-SUB', 'emp-sub', 'ms',
  'Subordinate', 'One', 'subordinate@example.test', '+66810000002',
  :'tenant_a_department_id', :'tenant_a_position_id', :'manager_employee_id',
  DATE '2026-01-01', 'national_id', '1000000000002'
) RETURNING id AS subordinate_employee_id \gset
```

Use independent PostgreSQL anonymous blocks that deliberately perform each invalid
operation and raise the exact messages above if PostgreSQL accepts it. Catch
`foreign_key_violation`, `unique_violation`, and `check_violation` only for the
operation intended to produce that SQLSTATE. Force deferred triggers with:

```sql
SET CONSTRAINTS departments_no_cycle IMMEDIATE;
SET CONSTRAINTS employees_manager_no_cycle IMMEDIATE;
```

For delete behavior, create one subordinate, delete its manager, and assert:

```sql
IF (SELECT manager_employee_id FROM employees WHERE employee_number = 'EMP-SUB') IS NOT NULL THEN
    RAISE EXCEPTION 'Manager deletion did not clear manager_employee_id';
END IF;
```

For RLS, create a `NOSUPERUSER NOBYPASSRLS` runtime role, set Tenant A's
verified internal ID, query `departments`, and raise:

```sql
IF EXISTS (SELECT 1 FROM departments WHERE tenant_id = tenant_b) THEN
    RAISE EXCEPTION 'RLS exposed Tenant B departments to Tenant A';
END IF;
```

- [ ] **Step 2: Run the focused verifier and observe the expected failure**

Run: `npm run database:hr-organization:verify`

Expected: FAIL with `missing HR constraint` or a missing RLS policy because the
existing companion migration does not yet cover the new tables.

- [ ] **Step 3: Add composite foreign keys and precise manager delete semantics**

Add these idempotent constraints inside the existing transaction in
`docs/scripts/mattersolv-phase0-tenant-isolation.sql`:

```sql
ALTER TABLE "departments"
    DROP CONSTRAINT IF EXISTS "fk_departments_parent_tenant";
ALTER TABLE "departments"
    ADD CONSTRAINT "fk_departments_parent_tenant"
    FOREIGN KEY ("tenant_id", "parent_department_id")
    REFERENCES "departments" ("tenant_id", "id")
    ON DELETE RESTRICT;

ALTER TABLE "employees"
    DROP CONSTRAINT IF EXISTS "fk_employees_department_tenant";
ALTER TABLE "employees"
    ADD CONSTRAINT "fk_employees_department_tenant"
    FOREIGN KEY ("tenant_id", "department_id")
    REFERENCES "departments" ("tenant_id", "id")
    ON DELETE RESTRICT;

ALTER TABLE "employees"
    DROP CONSTRAINT IF EXISTS "fk_employees_job_position_tenant";
ALTER TABLE "employees"
    ADD CONSTRAINT "fk_employees_job_position_tenant"
    FOREIGN KEY ("tenant_id", "job_position_id")
    REFERENCES "job_positions" ("tenant_id", "id")
    ON DELETE RESTRICT;

ALTER TABLE "employees"
    DROP CONSTRAINT IF EXISTS "fk_employees_manager_tenant";
ALTER TABLE "employees"
    ADD CONSTRAINT "fk_employees_manager_tenant"
    FOREIGN KEY ("tenant_id", "manager_employee_id")
    REFERENCES "employees" ("tenant_id", "id")
    ON DELETE SET NULL ("manager_employee_id");
```

- [ ] **Step 4: Add deferred cycle checks**

Add two `RETURNS trigger` functions. Each function starts at `NEW`'s proposed
parent/manager and follows the tenant-scoped chain with a recursive CTE. Raise
SQLSTATE `23514` if `NEW.id` is reached:

```sql
CREATE OR REPLACE FUNCTION reject_department_hierarchy_cycle()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.parent_department_id IS NULL THEN RETURN NEW; END IF;
    IF EXISTS (
        WITH RECURSIVE ancestors AS (
            SELECT id, parent_department_id
            FROM departments
            WHERE tenant_id = NEW.tenant_id AND id = NEW.parent_department_id
          UNION
            SELECT department.id, department.parent_department_id
            FROM departments AS department
            JOIN ancestors ON department.id = ancestors.parent_department_id
            WHERE department.tenant_id = NEW.tenant_id
        )
        SELECT 1 FROM ancestors WHERE id = NEW.id
    ) THEN
        RAISE EXCEPTION 'department hierarchy cannot contain a cycle'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS departments_no_cycle ON departments;
CREATE CONSTRAINT TRIGGER departments_no_cycle
AFTER INSERT OR UPDATE OF parent_department_id ON departments
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION reject_department_hierarchy_cycle();
```

Create `reject_employee_manager_cycle()` and
`employees_manager_no_cycle` with the same structure, substituting
`employees`, `manager_employee_id`, and the message
`employee reporting line cannot contain a cycle`.

- [ ] **Step 5: Add RLS policies for both catalogs**

Add the standard full-DML tenant policy for each table:

```sql
ALTER TABLE "departments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "departments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "departments";
CREATE POLICY tenant_isolation ON "departments"
    FOR ALL TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint)
    WITH CHECK ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);

ALTER TABLE "job_positions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_positions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "job_positions";
CREATE POLICY tenant_isolation ON "job_positions"
    FOR ALL TO PUBLIC
    USING ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint)
    WITH CHECK ("tenant_id" IS NOT NULL AND "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::bigint);
```

- [ ] **Step 6: Expand the exhaustive tenant-isolation registry**

In `docs/scripts/verify-database-tenant-isolation.mjs`:

- add `departments` and `job_positions` to `tenantTables`;
- add the four new composite relationships from Step 3 to
  `compositeForeignKeys`; and
- add `departments.tenant_id` and `job_positions.tenant_id` to
  `expectedTenantReferences`.

Use these entries:

```js
['departments', 'parent_department_id', 'departments'],
['employees', 'department_id', 'departments'],
['employees', 'job_position_id', 'job_positions'],
['employees', 'manager_employee_id', 'employees'],
```

- [ ] **Step 7: Run focused and isolation verification**

Run:

```bash
npm run database:hr-organization:verify
npm run database:tenant-isolation:verify
```

Expected: both commands PASS. If a disposable PostgreSQL 18 database and a
fresh drawDB schema export are available, also run:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f docs/scripts/mattersolv-phase0-tenant-isolation.sql \
  -f docs/scripts/verify-database-hr-organization.sql
```

Expected: the last line is
`Verified tenant HR organization constraints, RLS, and lifecycle`.

- [ ] **Step 8: Commit executable integrity rules**

```bash
git add docs/scripts/verify-database-hr-organization.mjs \
  docs/scripts/verify-database-hr-organization.sql \
  docs/scripts/mattersolv-phase0-tenant-isolation.sql \
  docs/scripts/verify-database-tenant-isolation.mjs
git commit -m "feat: enforce tenant HR organization integrity"
```

---

### Task 3: Document provisioning, migration, and API compatibility

**Files:**
- Modify: `docs/app/docs/database/page.mdx`
- Modify: `docs/app/docs/modules/employees/page.mdx`

**Interfaces:**
- Consumes: schema and SQL contracts from Tasks 1 and 2.
- Produces: operator-facing migration rules and product-facing explanation of primary department, primary position, and manager relationships.

- [ ] **Step 1: Add the HR organization persistence section**

Add `## Employee Organization Data` before `## PostgreSQL Partitioning` in
`docs/app/docs/database/page.mdx`. Include these exact rules:

```markdown
## Employee Organization Data

`departments` และ `job_positions` เป็น master data แยกตาม Tenant ส่วน
`employees` เก็บ `department_id`, `job_position_id` และ
`manager_employee_id` เป็น internal `BIGINT` references ห้ามเก็บชื่อแผนกหรือ
ตำแหน่งซ้ำบน Employee record

- Department และ Position ใช้ stable code ที่ไม่ซ้ำแบบ case-insensitive ภายใน Tenant
- Position ไม่ผูกกับ Department เดียว เพื่อให้ตำแหน่งเดียวกันใช้ได้หลายทีม
- การสร้างหรือย้าย Employee เลือกได้เฉพาะ catalog record ที่ active
- การ archive catalog ไม่ทำลาย Employee เดิม แต่ห้ามใช้กับ assignment ใหม่
- Manager และ parent Department ต้องอยู่ Tenant เดียวกันและห้ามเกิดวงจร
- การลบ Department หรือ Position ที่ถูกใช้งานต้องถูก Foreign Key ปฏิเสธ

API Employee ยังคงใช้ `department` และ `position` เป็น stable code เพื่อรักษา
frontend contract ส่วน Backend resolve code เป็น internal ID ภายใต้ Tenant context
ก่อนบันทึก
```

Document the seven-step backfill order from the approved design spec, and add
the HR runtime SQL file to `Required Database Tests`.

- [ ] **Step 2: Align the Employees domain documentation**

In `docs/app/docs/modules/employees/page.mdx`:

- state that an employee has one primary department, one primary position,
  and an optional manager in Phase 0.1;
- explain that catalogs are tenant-owned and archivable;
- clarify the current phrase `หลายตำแหน่ง` as future employment-history or
  secondary-role scope, not the current physical schema; and
- retain the rule that job position never grants authorization directly.

Use this wording in the profile section:

```markdown
- เก็บแผนกหลักหนึ่งรายการ ตำแหน่งหลักหนึ่งรายการ และหัวหน้างานที่ไม่บังคับ
  โดยทั้งหมดต้องอยู่ใน Workspace เดียวกัน
- โครงสร้าง Phase 0.1 ยังไม่เก็บประวัติการย้ายแผนกหรือตำแหน่งรองหลายรายการ
  หากต้องใช้ต้องออกแบบ temporal assignment แยกจาก Employee record
```

- [ ] **Step 3: Run documentation verification**

Run:

```bash
npm run database:hr-organization:verify
npm run build
git diff --check
```

Expected: focused verification and production documentation build PASS;
`git diff --check` prints no output.

- [ ] **Step 4: Commit documentation**

```bash
git add docs/app/docs/database/page.mdx docs/app/docs/modules/employees/page.mdx
git commit -m "docs: describe tenant HR organization model"
```

---

### Task 4: Run the full database regression suite and review the final diff

**Files:**
- Verify only; modify an earlier task's file only when a failing assertion identifies a regression in this feature.

**Interfaces:**
- Consumes: all Phase 0.1 changes.
- Produces: evidence that authentication, commercial, identifiers, layout, strings, tenant isolation, tenant settings, and documentation remain valid.

- [ ] **Step 1: Run every static database verifier**

```bash
npm run database:django-auth:verify
npm run database:commercial-constraints:verify
npm run database:tenant-isolation:verify
npm run database:identifiers:verify
npm run database:layout:verify
npm run database:string-lengths:verify
npm run database:tenant-settings:verify
npm run database:hr-organization:verify
```

Expected: all eight commands exit 0.

- [ ] **Step 2: Validate the diagram JSON and whitespace**

```bash
node -e "JSON.parse(require('node:fs').readFileSync('database.ddb', 'utf8')); console.log('database.ddb JSON valid')"
git diff --check
```

Expected: `database.ddb JSON valid`; the whitespace check prints no output.

- [ ] **Step 3: Run the documentation build**

Run: `npm run build`

Expected: Next.js production build and postbuild complete successfully.

- [ ] **Step 4: Review scope and history**

```bash
git status --short
git diff HEAD~3 --stat
git log --oneline -4
```

Expected: only pre-existing user-owned dirty files remain; the three new
feature commits cover diagram, integrity SQL, and documentation. Do not stage
or clean unrelated files.

- [ ] **Step 5: Create a repair commit only if verification required a fix**

If Step 1–3 required a feature-scoped correction, stage only those corrected
files and commit:

```bash
git commit -m "fix: complete HR organization verification"
```

If no correction was required, do not create an empty commit.
