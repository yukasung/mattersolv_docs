import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migrationUrl = new URL(
  './mattersolv-phase0-tenant-isolation.sql',
  import.meta.url
)
const diagramUrl = new URL('../../database.ddb', import.meta.url)
const [migration, diagram] = await Promise.all([
  readFile(migrationUrl, 'utf8'),
  readFile(diagramUrl, 'utf8').then(JSON.parse)
])

const tenantTables = [
  'tenants',
  'tenant_users',
  'tenant_groups',
  'tenant_role_assignments',
  'employees',
  'employee_addresses',
  'subscriptions',
  'tenant_entitlement_overrides',
  'checkout_sessions',
  'payment_transactions',
  'payment_events',
  'tenant_invitations'
]

for (const table of tenantTables) {
  assert.match(
    migration,
    new RegExp(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`)
  )
  assert.match(
    migration,
    new RegExp(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`)
  )
  assert.match(
    migration,
    new RegExp(`CREATE POLICY tenant_isolation ON "${table}"`)
  )
}

const compositeForeignKeys = [
  ['tenant_users', 'invited_by_tenant_user_id', 'tenant_users'],
  ['tenant_role_assignments', 'tenant_user_id', 'tenant_users'],
  ['tenant_role_assignments', 'tenant_group_id', 'tenant_groups'],
  ['tenant_role_assignments', 'assigned_by_tenant_user_id', 'tenant_users'],
  ['employees', 'tenant_user_id', 'tenant_users'],
  ['employee_addresses', 'employee_id', 'employees'],
  ['payment_transactions', 'checkout_session_id', 'checkout_sessions'],
  ['payment_transactions', 'subscription_id', 'subscriptions'],
  ['payment_events', 'payment_transaction_id', 'payment_transactions'],
  ['tenant_invitations', 'tenant_user_id', 'tenant_users'],
  ['tenant_invitations', 'tenant_group_id', 'tenant_groups'],
  ['tenant_invitations', 'invited_by_tenant_user_id', 'tenant_users']
]

for (const [table, field, parent] of compositeForeignKeys) {
  const expected = `FOREIGN KEY ("tenant_id", "${field}") REFERENCES "${parent}" ("tenant_id", "id")`
  assert.ok(
    migration.includes(expected),
    `${table}.${field} must use a composite tenant foreign key`
  )
}

assert.match(migration, /current_setting\('app\.tenant_id', true\)/)
assert.match(migration, /"tenant_id" IS NOT NULL/)

const note = diagram.notes.find(
  ({ title }) => title === 'Tenant isolation and PostgreSQL RLS'
)
assert.ok(note, 'Tenant isolation note must exist')
assert.match(note.content, /mattersolv-phase0-tenant-isolation\.sql/)
assert.match(note.content, /[\u0E00-\u0E7F]/)

const tablesById = new Map(diagram.tables.map((table) => [table.id, table]))
const fieldsById = new Map(
  diagram.tables.flatMap((table) =>
    table.fields.map((field) => [field.id, field])
  )
)
const tenants = diagram.tables.find(({ name }) => name === 'tenants')
const tenantReferences = diagram.relationships.filter(
  ({ endTableId }) => endTableId === tenants?.id
)
const expectedTenantReferences = [
  'checkout_sessions.tenant_id',
  'employee_addresses.tenant_id',
  'employees.tenant_id',
  'payment_events.tenant_id',
  'payment_transactions.tenant_id',
  'pending_trial_applications.resulting_tenant_id',
  'subscriptions.tenant_id',
  'tenant_entitlement_overrides.tenant_id',
  'tenant_groups.tenant_id',
  'tenant_invitations.tenant_id',
  'tenant_role_assignments.tenant_id',
  'tenant_users.tenant_id'
]
const actualTenantReferences = tenantReferences
  .map(
    ({ startTableId, startFieldId }) =>
      `${tablesById.get(startTableId)?.name}.${fieldsById.get(startFieldId)?.name}`
  )
  .sort()

assert.deepEqual(
  actualTenantReferences,
  expectedTenantReferences,
  'the tenant deletion guard must cover every direct tenant reference'
)
for (const relationship of tenantReferences) {
  assert.ok(
    ['Restrict', 'No action'].includes(relationship.deleteConstraint),
    `${relationship.name} must reject deleting a referenced tenant`
  )
}

const archivedAt = tenants?.fields.find(({ name }) => name === 'archived_at')
assert.equal(archivedAt?.type, 'TIMESTAMPTZ')
assert.equal(archivedAt?.notNull, false)
const tenantStatus = tenants?.fields.find(({ name }) => name === 'status')
assert.match(
  tenantStatus?.check ?? '',
  /status = 'archived'.*archived_at IS NOT NULL/
)

const lifecycleNote = diagram.notes.find(
  ({ title }) => title === 'Tenant lifecycle and deletion safety'
)
assert.ok(lifecycleNote, 'Tenant lifecycle and deletion safety note must exist')
assert.match(lifecycleNote.content, /RESTRICT|NO ACTION/)
assert.match(lifecycleNote.content, /archived_at/)
assert.match(lifecycleNote.content, /app\.tenant_id/)
assert.match(lifecycleNote.content, /Legal Hold/)
assert.match(lifecycleNote.content, /[\u0E00-\u0E7F]/)

console.log(
  `Verified executable tenant isolation for ${tenantTables.length} tables, ${compositeForeignKeys.length} composite foreign keys, and ${tenantReferences.length} restrictive tenant references`
)
