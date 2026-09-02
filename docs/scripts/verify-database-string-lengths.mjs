import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const diagramUrl = new URL('../../database.ddb', import.meta.url)
const diagram = JSON.parse(await readFile(diagramUrl, 'utf8'))
const tables = new Map(diagram.tables.map((table) => [table.name, table]))

// Limits come from the frontend input contracts or an external code standard.
const boundedStrings = new Map([
  ['tenants.country_code', 2],
  ['tenant_profiles.company_email', 254],
  ['tenant_addresses.building', 255],
  ['tenant_addresses.road', 100],
  ['tenant_addresses.alley', 100],
  ['tenant_addresses.country_code', 2],
  ['tenant_number_sequences.prefix', 20],
  ['tenant_users.invited_email', 150],
  ['departments.code', 50],
  ['departments.code_key', 50],
  ['departments.name', 100],
  ['job_positions.code', 50],
  ['job_positions.code_key', 50],
  ['job_positions.name', 100],
  ['employees.employee_number', 50],
  ['employees.prefix_other', 50],
  ['employees.first_name', 100],
  ['employees.last_name', 100],
  ['employees.work_email', 254],
  ['employees.work_phone', 16],
  ['employees.work_mobile', 16],
  ['employees.private_email', 254],
  ['employees.private_phone', 16],
  ['employees.identity_number', 13],
  ['employees.language_proficiency', 200],
  ['employees.line_id', 20],
  ['employees.wechat_id', 20],
  ['employees.employee_number_key', 50],
  ['employees.employment_type', 20],
  ['employee_employment_versions.employment_type', 20],
  ['employee_employment_versions.change_reason', 255],
  ['employee_addresses.building', 255],
  ['employee_addresses.road', 100],
  ['employee_addresses.alley', 100],
  ['employee_addresses.postal_code', 5],
  ['employee_addresses.country_code', 2],
  ['plans.currency', 3],
  ['subscriptions.currency', 3],
  ['checkout_sessions.email', 150],
  ['checkout_sessions.currency', 3],
  ['pending_trial_applications.email', 150],
  ['pending_trial_applications.phone', 16],
  ['payment_transactions.currency', 3]
])

for (const [qualifiedName, expectedSize] of boundedStrings) {
  const [tableName, fieldName] = qualifiedName.split('.')
  const field = tables
    .get(tableName)
    ?.fields.find(({ name }) => name === fieldName)

  assert.ok(field, `${qualifiedName} must exist`)
  assert.equal(field.type, 'VARCHAR', `${qualifiedName} must use VARCHAR`)
  assert.equal(Number(field.size), expectedSize, `${qualifiedName} must use VARCHAR(${expectedSize})`)
}

for (const table of diagram.tables) {
  if (table.name.startsWith('auth_') || table.name === 'django_content_type') continue
  for (const field of table.fields.filter(({ type }) => type === 'VARCHAR')) {
    assert.ok(
      boundedStrings.has(`${table.name}.${field.name}`),
      `${table.name}.${field.name} must have a documented length contract`
    )
  }
}

console.log(`Verified ${boundedStrings.size} bounded MatterSolv string columns`)
