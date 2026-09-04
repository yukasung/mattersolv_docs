import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const diagramUrl = new URL('../../database.ddb', import.meta.url)
const isolationUrl = new URL('./mattersolv-phase0-tenant-isolation.sql', import.meta.url)
const runtimeVerifierUrl = new URL('./verify-database-tenant-settings.sql', import.meta.url)
const concurrencyVerifierUrl = new URL('./verify-database-tenant-settings-concurrency.mjs', import.meta.url)
const [diagram, isolation, runtimeVerifier, concurrencyVerifier] = await Promise.all([
  readFile(diagramUrl, 'utf8').then(JSON.parse),
  readFile(isolationUrl, 'utf8'),
  readFile(runtimeVerifierUrl, 'utf8'),
  readFile(concurrencyVerifierUrl, 'utf8')
])

const tables = new Map(diagram.tables.map((table) => [table.name, table]))
const field = (tableName, fieldName) =>
  tables.get(tableName)?.fields.find(({ name }) => name === fieldName)
const index = (tableName, indexName) =>
  tables.get(tableName)?.indices.find(({ name }) => name === indexName)

for (const tableName of [
  'tenant_profiles',
  'tenant_addresses',
  'tenant_number_sequences',
  'audit_events'
]) {
  assert.ok(tables.has(tableName), `${tableName} must exist`)
  assert.equal(field(tableName, 'id')?.type, 'BIGINT')
  assert.equal(field(tableName, 'public_id')?.default, 'uuidv7()')
  assert.equal(field(tableName, 'tenant_id')?.type, 'BIGINT')
  assert.match(isolation, new RegExp(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`))
  assert.match(isolation, new RegExp(`ALTER TABLE "${tableName}" FORCE ROW LEVEL SECURITY;`))
}

assert.equal(field('tenant_profiles', 'company_email')?.type, 'VARCHAR')
assert.equal(Number(field('tenant_profiles', 'company_email')?.size), 254)
assert.equal(field('tenant_profiles', 'website')?.type, 'TEXT')
assert.deepEqual(index('tenant_profiles', 'uq_tenant_profiles_tenant')?.fields, ['tenant_id'])
assert.equal(index('tenant_profiles', 'uq_tenant_profiles_tenant')?.unique, true)

assert.match(field('tenant_addresses', 'address_type')?.check ?? '', /registered/)
assert.deepEqual(
  index('tenant_addresses', 'uq_tenant_addresses_type')?.fields,
  ['tenant_id', 'address_type']
)
assert.equal(index('tenant_addresses', 'uq_tenant_addresses_type')?.unique, true)

// VARCHAR(5) alone still admits 'abcde'; the postal code must be five digits.
// employee_addresses carries the same rule and the two must not drift apart.
for (const tableName of ['tenant_addresses', 'employee_addresses']) {
  assert.match(field(tableName, 'postal_code')?.check ?? '', /\^\[0-9\]\{5\}\$/)
}

const sequenceKey = field('tenant_number_sequences', 'sequence_key')
assert.match(sequenceKey?.check ?? '', /'client'/)
assert.match(sequenceKey?.check ?? '', /'employee'/)
assert.match(sequenceKey?.check ?? '', /'matter'/)
assert.match(sequenceKey?.check ?? '', /'quotation'/)
assert.equal(field('tenant_number_sequences', 'prefix')?.type, 'VARCHAR')
assert.equal(Number(field('tenant_number_sequences', 'prefix')?.size), 20)
assert.match(field('tenant_number_sequences', 'prefix')?.check ?? '', /btrim\(prefix\)/)
assert.equal(field('tenant_number_sequences', 'next_number')?.type, 'BIGINT')
assert.equal(field('tenant_number_sequences', 'next_number')?.default, '1')
assert.match(field('tenant_number_sequences', 'next_number')?.check ?? '', />= 1/)
assert.equal(field('tenant_number_sequences', 'padding')?.type, 'SMALLINT')
assert.equal(field('tenant_number_sequences', 'padding')?.default, '5')
assert.match(field('tenant_number_sequences', 'padding')?.check ?? '', /BETWEEN 1 AND 12/)
assert.deepEqual(
  index('tenant_number_sequences', 'uq_tenant_number_sequences_key')?.fields,
  ['tenant_id', 'sequence_key']
)
assert.equal(index('tenant_number_sequences', 'uq_tenant_number_sequences_key')?.unique, true)

assert.equal(field('audit_events', 'actor_tenant_user_id')?.type, 'BIGINT')
assert.equal(field('audit_events', 'before_data')?.type, 'JSONB')
assert.equal(field('audit_events', 'before_data')?.default, '{}')
assert.equal(field('audit_events', 'after_data')?.type, 'JSONB')
assert.equal(field('audit_events', 'after_data')?.default, '{}')
assert.equal(field('audit_events', 'occurred_at')?.type, 'TIMESTAMPTZ')
assert.match(field('audit_events', 'action')?.check ?? '', /actor_tenant_user_id IS NOT NULL/)
assert.match(field('audit_events', 'action')?.check ?? '', /jsonb_typeof\(before_data->'prefix'\) = 'string'/)
assert.match(field('audit_events', 'action')?.check ?? '', /jsonb_typeof\(after_data->'padding'\) = 'number'/)
assert.match(field('audit_events', 'action')?.check ?? '', /::integer BETWEEN 1 AND 12/)
assert.ok(
  !diagram.tables.some((table) =>
    table.fields.some(({ name, type }) => type === 'JSONB' && /prefix/i.test(name))
  ),
  'number prefixes must not be stored in generic JSONB settings'
)

const contractNote = diagram.notes.find(({ title }) => title === 'Tenant settings and number sequences')
assert.ok(contractNote, 'Tenant settings and number sequences note must exist')
assert.match(contractNote.content, /CUS-/)
assert.match(contractNote.content, /EMP-/)
assert.match(contractNote.content, /MAT-/)
assert.match(contractNote.content, /QT-/)
assert.match(contractNote.content, /lpad/)
assert.match(contractNote.content, /atomic/i)
assert.match(contractNote.content, /gap/i)

assert.match(runtimeVerifier, /tenant-settings-a/)
assert.match(runtimeVerifier, /Duplicate sequence key was accepted/)
assert.match(runtimeVerifier, /RLS allowed Tenant A to update Tenant B/)
assert.match(runtimeVerifier, /Append-only audit event was updated/)
assert.match(runtimeVerifier, /tenant_settings_allocation_results/)
assert.match(runtimeVerifier, /Sequence rewind was accepted/)
assert.match(runtimeVerifier, /Incomplete number format audit event was accepted/)
assert.match(runtimeVerifier, /Malformed number format audit event was accepted/)
assert.match(runtimeVerifier, /Runtime role recreated a number sequence/)
assert.match(isolation, /CREATE TRIGGER tenant_number_sequences_no_rewind/)
assert.match(isolation, /NEW\.next_number < OLD\.next_number/)
assert.match(concurrencyVerifier, /Promise\.all/)
assert.match(concurrencyVerifier, /UPDATE tenant_number_sequences/)
assert.match(concurrencyVerifier, /RETURNING next_number - 1 AS issued_number/)
assert.match(concurrencyVerifier, /assert\.equal\(count, totalTransactions\)/)

console.log('Verified typed tenant settings, number sequences, and audit events')
