import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [diagram, isolation, runtimeVerifier, databaseDoc, employeesDoc] = await Promise.all([
  readFile(new URL('../../database.ddb', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('./mattersolv-phase0-tenant-isolation.sql', import.meta.url), 'utf8'),
  readFile(new URL('./verify-database-employment-history.sql', import.meta.url), 'utf8'),
  readFile(new URL('../app/docs/database/page.mdx', import.meta.url), 'utf8'),
  readFile(new URL('../app/docs/modules/employees/page.mdx', import.meta.url), 'utf8')
])
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

const versions = table('employee_employment_versions')
assert.equal(field(versions.name, 'id')?.type, 'BIGINT')
assert.equal(field(versions.name, 'id')?.primary, true)
assert.equal(field(versions.name, 'id')?.increment, true)
assert.equal(field(versions.name, 'public_id')?.type, 'UUID')
assert.equal(field(versions.name, 'public_id')?.default, 'uuidv7()')
assert.equal(field(versions.name, 'public_id')?.unique, true)

for (const name of [
  'tenant_id', 'employee_id', 'department_id', 'job_position_id',
  'manager_employee_id', 'recorded_by_tenant_user_id'
]) assert.equal(field(versions.name, name)?.type, 'BIGINT')

for (const name of [
  'tenant_id', 'employee_id', 'effective_from', 'is_active',
  'recorded_by_tenant_user_id', 'created_at', 'updated_at'
]) assert.equal(field(versions.name, name)?.notNull, true)

for (const name of [
  'department_id', 'job_position_id', 'manager_employee_id',
  'employment_type', 'contract_start_date', 'contract_end_date', 'change_reason'
]) assert.equal(field(versions.name, name)?.notNull, false)

assert.equal(field(versions.name, 'effective_from')?.type, 'DATE')
assert.equal(field(versions.name, 'employment_type')?.type, 'VARCHAR')
assert.equal(Number(field(versions.name, 'employment_type')?.size), 20)
assert.match(
  field(versions.name, 'employment_type')?.check ?? '',
  /employee.*worker.*student.*trainee.*contractor.*freelance/
)
assert.match(
  field(versions.name, 'manager_employee_id')?.check ?? '',
  /manager_employee_id <> employee_id/
)
assert.equal(field(versions.name, 'change_reason')?.type, 'VARCHAR')
assert.equal(Number(field(versions.name, 'change_reason')?.size), 255)
assert.match(
  field(versions.name, 'contract_end_date')?.check ?? '',
  /contract_start_date IS NOT NULL/
)
assert.match(
  field(versions.name, 'contract_end_date')?.check ?? '',
  /contract_end_date >= contract_start_date/
)
assert.equal(field(versions.name, 'is_active')?.default, 'true')

assert.deepEqual(
  index(versions.name, 'uq_employee_employment_versions_tenant_id')?.fields,
  ['tenant_id', 'id']
)
assert.equal(
  index(versions.name, 'uq_employee_employment_versions_tenant_id')?.unique,
  true
)
assert.deepEqual(
  index(versions.name, 'uq_employee_employment_versions_tenant_employee_id')?.fields,
  ['tenant_id', 'employee_id', 'id']
)
assert.equal(
  index(versions.name, 'uq_employee_employment_versions_tenant_employee_id')?.unique,
  true
)
assert.deepEqual(
  index(versions.name, 'idx_employee_employment_versions_lookup')?.fields,
  ['tenant_id', 'employee_id', 'effective_from']
)

for (const name of [
  'current_employment_version_id', 'department_id', 'job_position_id',
  'manager_employee_id', 'employment_type', 'contract_start_date',
  'contract_end_date'
]) assert.equal(field('employees', name)?.notNull, false)

assert.equal(field('employees', 'current_employment_version_id')?.type, 'BIGINT')
assert.equal(field('employees', 'employment_type')?.type, 'VARCHAR')
assert.equal(Number(field('employees', 'employment_type')?.size), 20)
assert.match(
  field('employees', 'employment_type')?.check ?? '',
  /employee.*worker.*student.*trainee.*contractor.*freelance/
)
assert.equal(field('employees', 'contract_start_date')?.type, 'DATE')
assert.equal(field('employees', 'contract_end_date')?.type, 'DATE')
assert.match(
  field('employees', 'contract_end_date')?.check ?? '',
  /contract_end_date >= contract_start_date/
)
assert.deepEqual(
  index('employees', 'idx_employees_tenant_current_employment_version')?.fields,
  ['tenant_id', 'current_employment_version_id']
)

for (const [name, deleteConstraint] of [
  ['fk_employee_employment_versions_tenant_id', 'Restrict'],
  ['fk_employee_employment_versions_employee_id', 'Restrict'],
  ['fk_employee_employment_versions_department_id', 'Restrict'],
  ['fk_employee_employment_versions_job_position_id', 'Restrict'],
  ['fk_employee_employment_versions_manager_employee_id', 'Restrict'],
  ['fk_employee_employment_versions_recorded_by_tenant_user_id', 'Restrict'],
  ['fk_employees_current_employment_version_id', 'Restrict'],
  ['fk_employees_manager_employee_id', 'Restrict']
]) {
  assert.ok(relationship(name), `${name} must exist`)
  assert.equal(relationship(name).deleteConstraint, deleteConstraint)
}

const partialIndexNote = diagram.notes.find(
  ({ title }) => title === 'Required partial and expression indexes'
)
assert.ok(partialIndexNote)
assert.match(
  partialIndexNote.content,
  /uq_employee_employment_versions_active_effective_date/
)
assert.match(partialIndexNote.content, /WHERE is_active/)

for (const expected of [
  'uq_employee_employment_versions_active_effective_date',
  'idx_employee_employment_versions_active_lookup',
  'chk_employees_contract_dates',
  'chk_employee_employment_versions_contract_dates',
  'WHERE is_active',
  'DEFERRABLE INITIALLY DEFERRED',
  'CREATE OR REPLACE FUNCTION select_employee_employment_version',
  'CREATE OR REPLACE FUNCTION validate_employee_employment_snapshot',
  'CREATE CONSTRAINT TRIGGER employees_employment_snapshot_consistent',
  'CREATE CONSTRAINT TRIGGER employee_employment_versions_snapshot_consistent',
  'ALTER TABLE "employee_employment_versions" ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE "employee_employment_versions" FORCE ROW LEVEL SECURITY;',
  'CREATE POLICY tenant_isolation_select ON "employee_employment_versions"',
  'CREATE POLICY tenant_isolation_insert ON "employee_employment_versions"',
  'CREATE POLICY tenant_isolation_update ON "employee_employment_versions"'
]) assert.ok(isolation.includes(expected), `missing employment history SQL: ${expected}`)

for (const expected of [
  /FOREIGN KEY \("tenant_id", "employee_id"\)\s+REFERENCES "employees" \("tenant_id", "id"\)/,
  /FOREIGN KEY \("tenant_id", "department_id"\)\s+REFERENCES "departments" \("tenant_id", "id"\)/,
  /FOREIGN KEY \("tenant_id", "job_position_id"\)\s+REFERENCES "job_positions" \("tenant_id", "id"\)/,
  /FOREIGN KEY \("tenant_id", "manager_employee_id"\)\s+REFERENCES "employees" \("tenant_id", "id"\)/,
  /FOREIGN KEY \("tenant_id", "recorded_by_tenant_user_id"\)\s+REFERENCES "tenant_users" \("tenant_id", "id"\)/,
  /FOREIGN KEY \("tenant_id", "id", "current_employment_version_id"\)\s+REFERENCES "employee_employment_versions" \("tenant_id", "employee_id", "id"\)/
]) assert.match(isolation, expected)

assert.doesNotMatch(
  isolation,
  /CREATE POLICY tenant_isolation_delete ON "employee_employment_versions"/
)

for (const expected of [
  'Duplicate active effective date was accepted',
  'Cross-tenant employment reference was accepted',
  'Cross-tenant recorder was accepted',
  'Current pointer accepted another employee version',
  'Snapshot mismatch was accepted',
  'Invalid contract date range was accepted',
  'Self-manager version was accepted',
  'Latest effective version was not selected',
  'Earliest future version was not selected',
  'Inactive version participated in selection',
  'Current manager cycle was accepted',
  'Archiving employee removed employment history',
  'Runtime role deleted employment history',
  'RLS exposed Tenant B employment history to Tenant A'
]) assert.match(runtimeVerifier, new RegExp(expected))

for (const expected of [
  '## Effective-Dated Employment History',
  '`employee_employment_versions` เป็น source of truth',
  '`tenants.timezone`',
  'Daily idempotent job',
  'lazy-refresh',
  'As-of report',
  'SELECT id FROM employees',
  'docs/scripts/verify-database-employment-history.sql'
]) assert.match(databaseDoc, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

for (const expected of [
  '`employee_employment_versions`',
  'อดีต ปัจจุบัน และอนาคต',
  'frontend ไม่กำหนด current state เอง',
  'ไม่รวมข้อมูลส่วนตัว',
  'Job Position เป็นข้อมูล HR เท่านั้น'
]) assert.match(employeesDoc, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

console.log('Verified effective-dated employment history diagram contract')
