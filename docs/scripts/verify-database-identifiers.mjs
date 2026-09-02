import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { djangoOwnedTableNames } from './database-auth-contract.mjs'
import {
  internalOnlyTableNames,
  matterSolvOwnedTableNames,
  publicIdentifierTableNames
} from './database-identifier-contract.mjs'

const diagramUrl = new URL('../../database.ddb', import.meta.url)
const diagram = JSON.parse(await readFile(diagramUrl, 'utf8'))

assert.equal(diagram.database, 'postgresql')

const tables = new Map(diagram.tables.map((table) => [table.name, table]))
const djangoOwnedTables = new Set(djangoOwnedTableNames)
const matterSolvTables = new Set(matterSolvOwnedTableNames)

assert.deepEqual(
  [...tables.keys()].filter((name) => !djangoOwnedTables.has(name)).sort(),
  [...matterSolvTables].sort(),
  'every non-Django table must have an explicit identifier policy'
)

for (const tableName of matterSolvTables) {
  const table = tables.get(tableName)
  const primaryKeys = table.fields.filter(({ primary }) => primary)

  assert.equal(
    primaryKeys.length,
    1,
    `${table.name} must have exactly one primary key`
  )
  assert.equal(primaryKeys[0].name, 'id', `${table.name}.id must be the primary key`)
  assert.equal(primaryKeys[0].type, 'BIGINT', `${table.name}.id must be BIGINT`)
  assert.equal(primaryKeys[0].increment, true, `${table.name}.id must be identity`)
  assert.notEqual(primaryKeys[0].default, 'uuidv7()')
}

for (const tableName of publicIdentifierTableNames) {
  const publicId = tables
    .get(tableName)
    .fields.find(({ name }) => name === 'public_id')
  assert.ok(publicId, `${tableName}.public_id must exist`)
  assert.equal(publicId.type, 'UUID')
  assert.equal(publicId.default, 'uuidv7()')
  assert.equal(publicId.notNull, true)
  assert.equal(publicId.unique, true)
  assert.equal(publicId.primary, false)
}

for (const tableName of internalOnlyTableNames) {
  assert.ok(
    !tables.get(tableName).fields.some(({ name }) => name === 'public_id'),
    `${tableName} must not expose a redundant public UUID`
  )
}

const tablesById = new Map(diagram.tables.map((table) => [table.id, table]))
const fieldsById = new Map(
  diagram.tables.flatMap((table) =>
    table.fields.map((field) => [field.id, field])
  )
)

for (const relationship of diagram.relationships) {
  const parentTable = tablesById.get(relationship.endTableId)
  const parentField = fieldsById.get(relationship.endFieldId)
  if (!matterSolvTables.has(parentTable?.name) || parentField?.name !== 'id') continue

  const childTable = tablesById.get(relationship.startTableId)
  const childField = fieldsById.get(relationship.startFieldId)
  assert.equal(
    childField?.type,
    'BIGINT',
    `${childTable?.name}.${childField?.name} must match ${parentTable.name}.id`
  )
}

const identifierNote = diagram.notes.find(
  ({ title }) => title === 'PostgreSQL version and identifiers'
)
assert.ok(identifierNote, 'PostgreSQL identifier policy note must exist')
assert.match(identifierNote.content, /PostgreSQL 18/)
assert.match(identifierNote.content, /uuidv7\(\)/)
assert.match(identifierNote.content, /BIGINT/)
assert.match(identifierNote.content, /public_id/)
assert.match(identifierNote.content, /[\u0E00-\u0E7F]/)

console.log(
  `Verified hybrid BIGINT/UUID v7 identifiers for ${matterSolvTables.size} MatterSolv-owned tables and ${djangoOwnedTables.size} Django-owned tables`
)
