import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const diagramUrl = new URL('../../database.ddb', import.meta.url)
const diagram = JSON.parse(await readFile(diagramUrl, 'utf8'))

const expectedAreas = new Map([
  ['Django Authentication', '#dbeafe'],
  ['Tenant & Authorization', '#ede9fe'],
  ['People & HR', '#dcfce7'],
  ['Plans & Billing', '#ffedd5']
])

const tablesByArea = new Map([
  ['Django Authentication', [
    'django_content_type', 'auth_permission', 'auth_group_permissions',
    'auth_group', 'auth_user_user_permissions', 'auth_user_groups',
    'auth_user', 'user_profiles'
  ]],
  ['Tenant & Authorization', [
    'tenants', 'tenant_users', 'tenant_groups', 'tenant_role_assignments',
    'tenant_invitations'
  ]],
  ['People & HR', ['employees', 'employee_addresses']],
  ['Plans & Billing', [
    'plans', 'features', 'plan_entitlements', 'subscriptions',
    'tenant_entitlement_overrides', 'checkout_sessions',
    'payment_transactions', 'payment_events', 'pending_trial_applications'
  ]]
])

assert.equal(diagram.subjectAreas.length, expectedAreas.size)
for (const area of diagram.subjectAreas) {
  const expectedColor = expectedAreas.get(area.name)
  assert.ok(expectedColor, `unexpected subject area: ${area.name}`)
  assert.equal(area.color, expectedColor, `${area.name} must retain its domain colour`)
}

const areas = new Map(diagram.subjectAreas.map((area) => [area.name, area]))
const authArea = areas.get('Django Authentication')
const tenantArea = areas.get('Tenant & Authorization')
const peopleArea = areas.get('People & HR')
const billingArea = areas.get('Plans & Billing')

assert.equal(authArea.y, tenantArea.y, 'top domains must share a baseline')
assert.ok(authArea.x + authArea.width + 80 <= tenantArea.x, 'top domains need separation')
assert.ok(
  Math.max(authArea.y + authArea.height, tenantArea.y + tenantArea.height) + 50 <= peopleArea.y,
  'People & HR must sit below the top domains'
)
assert.equal(peopleArea.x, tenantArea.x, 'People & HR must align with Tenant & Authorization')
assert.ok(peopleArea.x + peopleArea.width + 100 <= billingArea.x, 'bottom domains need separation')
assert.equal(peopleArea.y, billingArea.y, 'bottom domains must share a baseline')

const tableWidth = 220
const tableHeight = (table) => 57 + table.fields.length * 36
const tables = new Map(diagram.tables.map((table) => [table.name, table]))
const assignedTableNames = [...tablesByArea.values()].flat().sort()
assert.deepEqual(
  assignedTableNames,
  [...tables.keys()].sort(),
  'every table must belong to exactly one domain island'
)

for (const [areaName, tableNames] of tablesByArea) {
  const area = diagram.subjectAreas.find(({ name }) => name === areaName)
  for (const tableName of tableNames) {
    const table = tables.get(tableName)
    assert.ok(table, `${tableName} must exist in ${areaName}`)
    assert.ok(table.x >= area.x + 30 && table.y >= area.y + 30, `${tableName} needs padding inside ${areaName}`)
    assert.ok(table.x + tableWidth <= area.x + area.width - 30, `${tableName} exceeds ${areaName} width`)
    assert.ok(table.y + tableHeight(table) <= area.y + area.height - 30, `${tableName} exceeds ${areaName} height`)
  }
}

for (const [index, left] of diagram.tables.entries()) {
  for (const right of diagram.tables.slice(index + 1)) {
    const overlaps =
      left.x < right.x + tableWidth &&
      left.x + tableWidth > right.x &&
      left.y < right.y + tableHeight(right) &&
      left.y + tableHeight(left) > right.y
    assert.equal(overlaps, false, `${left.name} overlaps ${right.name}`)
  }
}

const canvasBottom = Math.max(
  ...diagram.subjectAreas.map(({ y, height }) => y + height)
)
const notes = [...diagram.notes].sort((left, right) => left.x - right.x)
for (const [index, note] of notes.entries()) {
  assert.ok(note.y >= canvasBottom + 160, `${note.title} must stay below the domain islands`)
  assert.ok(note.width >= 320, `${note.title} must be wide enough to read`)
  assert.ok(note.height >= 200, `${note.title} height must fit its content`)
  assert.ok(note.height <= 480, `${note.title} must not become an excessively tall column`)
  if (index > 0) {
    const previous = notes[index - 1]
    assert.ok(previous.x + previous.width + 40 <= note.x, `${note.title} overlaps the previous note`)
  }
}

console.log(
  `Verified ${diagram.tables.length} tables in ${diagram.subjectAreas.length} domain islands and ${diagram.notes.length} notes outside the relationship canvas`
)
