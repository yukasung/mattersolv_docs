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
  'tenant_profiles',
  'tenant_addresses',
  'departments',
  'job_positions',
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

for (const statement of [
  'ALTER TABLE "tenant_number_sequences" ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE "tenant_number_sequences" FORCE ROW LEVEL SECURITY;',
  'CREATE POLICY tenant_isolation_select ON "tenant_number_sequences"',
  'CREATE POLICY tenant_isolation_update ON "tenant_number_sequences"'
]) {
  assert.ok(migration.includes(statement), `tenant_number_sequences isolation must include: ${statement}`)
}
assert.doesNotMatch(migration, /CREATE POLICY tenant_isolation_insert ON "tenant_number_sequences"/)
assert.doesNotMatch(migration, /CREATE POLICY tenant_isolation_delete ON "tenant_number_sequences"/)

for (const statement of [
  'ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE "audit_events" FORCE ROW LEVEL SECURITY;',
  'CREATE POLICY tenant_isolation_select ON "audit_events"',
  'CREATE POLICY tenant_isolation_insert ON "audit_events"'
]) {
  assert.ok(migration.includes(statement), `audit_events isolation must include: ${statement}`)
}
assert.doesNotMatch(migration, /CREATE POLICY tenant_isolation_update ON "audit_events"/)
assert.doesNotMatch(migration, /CREATE POLICY tenant_isolation_delete ON "audit_events"/)

for (const statement of [
  'ALTER TABLE "employee_employment_versions" ENABLE ROW LEVEL SECURITY;',
  'ALTER TABLE "employee_employment_versions" FORCE ROW LEVEL SECURITY;',
  'CREATE POLICY tenant_isolation_select ON "employee_employment_versions"',
  'CREATE POLICY tenant_isolation_insert ON "employee_employment_versions"',
  'CREATE POLICY tenant_isolation_update ON "employee_employment_versions"'
]) {
  assert.ok(
    migration.includes(statement),
    `employment history isolation must include: ${statement}`
  )
}
assert.doesNotMatch(
  migration,
  /CREATE POLICY tenant_isolation_delete ON "employee_employment_versions"/
)

const compositeForeignKeys = [
  ['tenant_users', 'invited_by_tenant_user_id', 'tenant_users'],
  ['tenant_role_assignments', 'tenant_user_id', 'tenant_users'],
  ['tenant_role_assignments', 'tenant_group_id', 'tenant_groups'],
  ['tenant_role_assignments', 'assigned_by_tenant_user_id', 'tenant_users'],
  ['employees', 'tenant_user_id', 'tenant_users'],
  ['departments', 'parent_department_id', 'departments'],
  ['employees', 'department_id', 'departments'],
  ['employees', 'job_position_id', 'job_positions'],
  ['employees', 'manager_employee_id', 'employees'],
  ['employee_employment_versions', 'employee_id', 'employees'],
  ['employee_employment_versions', 'department_id', 'departments'],
  ['employee_employment_versions', 'job_position_id', 'job_positions'],
  ['employee_employment_versions', 'manager_employee_id', 'employees'],
  ['employee_employment_versions', 'recorded_by_tenant_user_id', 'tenant_users'],
  ['audit_events', 'actor_tenant_user_id', 'tenant_users'],
  ['employee_addresses', 'employee_id', 'employees'],
  ['payment_transactions', 'checkout_session_id', 'checkout_sessions'],
  ['payment_transactions', 'subscription_id', 'subscriptions'],
  ['payment_events', 'payment_transaction_id', 'payment_transactions'],
  ['tenant_invitations', 'tenant_user_id', 'tenant_users'],
  ['tenant_invitations', 'tenant_group_id', 'tenant_groups'],
  ['tenant_invitations', 'invited_by_tenant_user_id', 'tenant_users']
]

for (const [table, field, parent] of compositeForeignKeys) {
  const expected = new RegExp(
    `FOREIGN KEY \\(\"tenant_id\", \"${field}\"\\)\\s+` +
    `REFERENCES \"${parent}\" \\(\"tenant_id\", \"id\"\\)`
  )
  assert.match(
    migration,
    expected,
    `${table}.${field} must use a composite tenant foreign key`
  )
}

assert.match(
  migration,
  /FOREIGN KEY \("tenant_id", "id", "current_employment_version_id"\)\s+REFERENCES "employee_employment_versions" \("tenant_id", "employee_id", "id"\)/
)

assert.match(migration, /current_setting\('app\.tenant_id', true\)/)
assert.match(migration, /current_setting\('app\.tenant_id', true\), ''\)::bigint/)
assert.doesNotMatch(migration, /current_setting\('app\.tenant_id'.*::uuid/)
assert.match(migration, /"tenant_id" IS NOT NULL/)

const note = diagram.notes.find(
  ({ title }) => title === 'Tenant isolation and PostgreSQL RLS'
)
assert.ok(note, 'Tenant isolation note must exist')
assert.match(note.content, /mattersolv-phase0-tenant-isolation\.sql/)
assert.match(note.content, /X-Tenant-ID/)
assert.match(note.content, /BIGINT/)
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
  'audit_events.tenant_id',
  'checkout_sessions.tenant_id',
  'departments.tenant_id',
  'employee_addresses.tenant_id',
  'employee_employment_versions.tenant_id',
  'employees.tenant_id',
  'job_positions.tenant_id',
  'payment_events.tenant_id',
  'payment_transactions.tenant_id',
  'pending_trial_applications.resulting_tenant_id',
  'subscriptions.tenant_id',
  'tenant_addresses.tenant_id',
  'tenant_entitlement_overrides.tenant_id',
  'tenant_groups.tenant_id',
  'tenant_invitations.tenant_id',
  'tenant_number_sequences.tenant_id',
  'tenant_profiles.tenant_id',
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

// Membership archival must be as unambiguous as tenant archival: a membership is
// archived exactly when archived_at is set, never one without the other.
const tenantUsers = diagram.tables.find(({ name }) => name === 'tenant_users')
const tenantUserArchivedAt = tenantUsers?.fields.find(
  ({ name }) => name === 'archived_at'
)
assert.equal(tenantUserArchivedAt?.type, 'TIMESTAMPTZ')
assert.equal(tenantUserArchivedAt?.notNull, false)
const tenantUserStatus = tenantUsers?.fields.find(({ name }) => name === 'status')
assert.match(
  tenantUserStatus?.check ?? '',
  /status = 'archived'.*archived_at IS NOT NULL/
)

// auth_group.name is built as "{tenant_uuid}:{role_code}" into a VARCHAR(150),
// so an unbounded role code would break tenant provisioning at insert time.
const tenantGroups = diagram.tables.find(({ name }) => name === 'tenant_groups')
const tenantGroupCode = tenantGroups?.fields.find(({ name }) => name === 'code')
assert.match(tenantGroupCode?.check ?? '', /char_length\(code\) <= 50/)

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
  `Verified executable tenant isolation for ${tenantTables.length + 1} tables, ${compositeForeignKeys.length} composite foreign keys, and ${tenantReferences.length} restrictive tenant references`
)
