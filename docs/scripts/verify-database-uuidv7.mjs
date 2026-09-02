import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { djangoOwnedTableNames } from './database-auth-contract.mjs'

const diagramUrl = new URL('../../database.ddb', import.meta.url)
const diagram = JSON.parse(await readFile(diagramUrl, 'utf8'))

assert.equal(diagram.database, 'postgresql')

const djangoOwnedTables = new Set(djangoOwnedTableNames)
const matterSolvTables = diagram.tables.filter(
  ({ name }) => !djangoOwnedTables.has(name)
)

for (const table of matterSolvTables) {
  const primaryKeys = table.fields.filter(({ primary }) => primary)

  assert.equal(
    primaryKeys.length,
    1,
    `${table.name} must have exactly one primary key`
  )
  assert.equal(primaryKeys[0].type, 'UUID', `${table.name}.id must remain UUID`)
  assert.equal(
    primaryKeys[0].default,
    'uuidv7()',
    `${table.name}.id must default to PostgreSQL 18 uuidv7()`
  )
}

const identifierNote = diagram.notes.find(
  ({ title }) => title === 'PostgreSQL version and identifiers'
)
assert.ok(identifierNote, 'PostgreSQL identifier policy note must exist')
assert.match(identifierNote.content, /PostgreSQL 18/)
assert.match(identifierNote.content, /uuidv7\(\)/)
assert.match(identifierNote.content, /[\u0E00-\u0E7F]/)

console.log(
  `Verified PostgreSQL 18 uuidv7() defaults for ${matterSolvTables.length} MatterSolv-owned tables and ${djangoOwnedTables.size} Django-owned exceptions`
)
