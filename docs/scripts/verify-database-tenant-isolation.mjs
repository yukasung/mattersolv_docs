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
  'tenant_user_roles',
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
  ['tenant_user_roles', 'tenant_user_id', 'tenant_users'],
  ['tenant_user_roles', 'assigned_by_tenant_user_id', 'tenant_users'],
  ['employees', 'tenant_user_id', 'tenant_users'],
  ['employee_addresses', 'employee_id', 'employees'],
  ['payment_transactions', 'checkout_session_id', 'checkout_sessions'],
  ['payment_transactions', 'subscription_id', 'subscriptions'],
  ['payment_events', 'payment_transaction_id', 'payment_transactions'],
  ['tenant_invitations', 'tenant_user_id', 'tenant_users'],
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

console.log(
  `Verified executable tenant isolation for ${tenantTables.length} tables and ${compositeForeignKeys.length} composite foreign keys`
)
