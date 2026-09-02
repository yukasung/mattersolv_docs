import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migrationUrl = new URL(
  './mattersolv-phase0-commercial-constraints.sql',
  import.meta.url
)
const diagramUrl = new URL('../../database.ddb', import.meta.url)
const [migration, diagram] = await Promise.all([
  readFile(migrationUrl, 'utf8'),
  readFile(diagramUrl, 'utf8').then(JSON.parse)
])

const indexDefinition = migration.match(
  /CREATE UNIQUE INDEX IF NOT EXISTS "uq_subscriptions_current_per_tenant"\s+ON "subscriptions" \("tenant_id"\)\s+WHERE "status" IN \(([^)]+)\);/
)
assert.ok(indexDefinition, 'Current-subscription partial unique index must exist')

const indexedStatuses = [...indexDefinition[1].matchAll(/'([^']+)'/g)]
  .map(([, status]) => status)
  .sort()
assert.deepEqual(indexedStatuses, [
  'active',
  'past_due',
  'suspended',
  'trialing'
])

const note = diagram.notes.find(
  ({ title }) => title === 'Required partial and expression indexes'
)
assert.ok(note, 'Partial-index note must exist')
assert.match(note.content, /mattersolv-phase0-commercial-constraints\.sql/)
assert.match(note.content, /[\u0E00-\u0E7F]/)

console.log('Verified one current subscription per tenant constraint')
