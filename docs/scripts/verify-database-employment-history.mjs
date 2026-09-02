import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const diagram = JSON.parse(await readFile(
  new URL('../../database.ddb', import.meta.url),
  'utf8'
))
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

console.log('Verified effective-dated employment history diagram contract')
