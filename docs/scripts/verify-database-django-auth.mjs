import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { djangoOwnedTableNames } from './database-auth-contract.mjs'

const diagramUrl = new URL('../../database.ddb', import.meta.url)
const diagram = JSON.parse(await readFile(diagramUrl, 'utf8'))
const tables = new Map(diagram.tables.map((table) => [table.name, table]))

for (const tableName of djangoOwnedTableNames) {
  assert.ok(tables.has(tableName), `${tableName} must be represented in drawDB`)
}

for (const legacyTable of [
  'users',
  'roles',
  'permissions',
  'role_permissions',
  'tenant_user_roles'
]) {
  assert.ok(!tables.has(legacyTable), `${legacyTable} must not duplicate Django auth`)
}

for (const tableName of ['auth_user', 'auth_group', 'auth_permission']) {
  const primaryKey = tables
    .get(tableName)
    .fields.find(({ primary }) => primary)
  assert.equal(primaryKey?.type, 'BIGINT', `${tableName}.id must be BIGINT`)
  assert.notEqual(primaryKey?.default, 'uuidv7()')
  assert.match(tables.get(tableName).comment, /Django migrations/)
}

const userProfile = tables.get('user_profiles')
assert.ok(userProfile, 'user_profiles must extend auth_user without a custom user')
assert.equal(userProfile.fields.find(({ name }) => name === 'id')?.default, 'uuidv7()')
assert.equal(userProfile.fields.find(({ name }) => name === 'user_id')?.type, 'BIGINT')

for (const [tableName, fieldName] of [
  ['tenant_users', 'user_id'],
  ['checkout_sessions', 'buyer_user_id'],
  ['pending_trial_applications', 'resulting_user_id']
]) {
  assert.equal(
    tables.get(tableName).fields.find(({ name }) => name === fieldName)?.type,
    'BIGINT',
    `${tableName}.${fieldName} must match auth_user.id`
  )
}

for (const [tableName, fieldName] of [
  ['tenant_users', 'invited_email'],
  ['checkout_sessions', 'email'],
  ['pending_trial_applications', 'email']
]) {
  assert.match(
    tables.get(tableName).fields.find(({ name }) => name === fieldName)?.check ?? '',
    new RegExp(`char_length\\(${fieldName}\\) <= 150`),
    `${tableName}.${fieldName} must enforce the Django login-email limit`
  )
}

const tenantGroups = tables.get('tenant_groups')
assert.ok(tenantGroups, 'tenant_groups must scope Django groups to a tenant')
assert.equal(tenantGroups.fields.find(({ name }) => name === 'group_id')?.type, 'BIGINT')
assert.ok(tables.has('tenant_role_assignments'))
assert.ok(
  tables
    .get('tenant_invitations')
    .fields.some(({ name, type }) => name === 'tenant_group_id' && type === 'UUID')
)

const authNote = diagram.notes.find(
  ({ title }) => title === 'Django authentication contract'
)
assert.ok(authNote, 'Django authentication contract note must exist')
assert.match(authNote.content, /ModelBackend/)
assert.match(authNote.content, /150/)
assert.match(authNote.content, /username/)
assert.match(authNote.content, /tenant_role_assignments/)
assert.match(authNote.content, /[\u0E00-\u0E7F]/)

console.log('Verified Django-owned authentication and tenant authorization contract')
