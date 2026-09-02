import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [diagram, isolation, runtimeVerifier] = await Promise.all([
  readFile(new URL('../../database.ddb', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('./mattersolv-phase0-tenant-isolation.sql', import.meta.url), 'utf8'),
  readFile(new URL('./verify-database-hr-organization.sql', import.meta.url), 'utf8')
])
const tables = new Map(diagram.tables.map((table) => [table.name, table]))
const table = (name) => { const value = tables.get(name); assert.ok(value, `${name} must exist`); return value }
const field = (tableName, fieldName) => table(tableName).fields.find(({ name }) => name === fieldName)
const index = (tableName, indexName) => table(tableName).indices.find(({ name }) => name === indexName)
const relationship = (name) => diagram.relationships.find((item) => item.name === name)

for (const tableName of ['departments', 'job_positions']) {
  assert.equal(field(tableName, 'id')?.type, 'BIGINT')
  assert.equal(field(tableName, 'id')?.primary, true)
  assert.equal(field(tableName, 'id')?.increment, true)
  assert.equal(field(tableName, 'public_id')?.type, 'UUID')
  assert.equal(field(tableName, 'public_id')?.default, 'uuidv7()')
  assert.equal(field(tableName, 'public_id')?.unique, true)
  assert.equal(field(tableName, 'tenant_id')?.type, 'BIGINT')
  assert.equal(field(tableName, 'tenant_id')?.notNull, true)
  for (const [name, size] of [['code', 50], ['code_key', 50], ['name', 100]]) {
    assert.equal(field(tableName, name)?.type, 'VARCHAR')
    assert.equal(Number(field(tableName, name)?.size), size)
  }
  assert.match(field(tableName, 'code_key')?.check ?? '', /lower\(btrim\(code\)\)/)
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
for (const code of ['court', 'civil', 'criminal', 'accounting', 'managingPartner', 'partner', 'seniorEmployee', 'employee', 'assistantEmployee']) {
  assert.match(seedNote.content, new RegExp(code))
}

assert.equal(field('employees', 'department'), undefined)
assert.equal(field('employees', 'position'), undefined)
for (const [name, notNull] of [['department_id', false], ['job_position_id', false], ['manager_employee_id', false]]) {
  assert.equal(field('employees', name)?.type, 'BIGINT')
  assert.equal(field('employees', name)?.notNull, notNull)
}
assert.match(field('employees', 'manager_employee_id')?.check ?? '', /manager_employee_id <> id/)

for (const [name, deleteConstraint] of [
  ['fk_departments_tenant_id', 'Restrict'], ['fk_departments_parent_department_id', 'Restrict'],
  ['fk_job_positions_tenant_id', 'Restrict'], ['fk_employees_department_id', 'Restrict'],
  ['fk_employees_job_position_id', 'Restrict'], ['fk_employees_manager_employee_id', 'Restrict']
]) {
  assert.ok(relationship(name), `${name} must exist`)
  assert.equal(relationship(name).deleteConstraint, deleteConstraint)
}

for (const [name, fields] of [
  ['idx_employees_tenant_department', ['tenant_id', 'department_id']],
  ['idx_employees_tenant_job_position', ['tenant_id', 'job_position_id']],
  ['idx_employees_tenant_manager', ['tenant_id', 'manager_employee_id']]
]) assert.deepEqual(index('employees', name)?.fields, fields)

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
  'ON DELETE RESTRICT;',
  'CREATE CONSTRAINT TRIGGER departments_no_cycle',
  'CREATE CONSTRAINT TRIGGER employees_manager_no_cycle'
]) assert.ok(isolation.includes(expected), `missing HR constraint: ${expected}`)

for (const expected of [
  'Cross-tenant department was accepted', 'Duplicate normalized department code was accepted',
  'Department cycle was accepted', 'Employee manager cycle was accepted', 'Self-manager was accepted',
  'Deleting an in-use job position was accepted', 'Deleting a referenced manager was accepted',
  'RLS exposed Tenant B departments to Tenant A'
]) assert.match(runtimeVerifier, new RegExp(expected))

console.log('Verified tenant HR organization diagram contract')
