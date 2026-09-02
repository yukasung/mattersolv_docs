import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const diagramUrl = new URL('../../database.ddb', import.meta.url)
const diagram = JSON.parse(await readFile(diagramUrl, 'utf8'))

assert.equal(diagram.database, 'postgresql')
assert.equal(diagram.tables.length, 19)
assert.equal(diagram.relationships.length, 34)

for (const table of diagram.tables) {
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

const notes = diagram.notes.map(({ content }) => content).join('\n')
assert.match(notes, /PostgreSQL 18/)
assert.match(notes, /uuidv7\(\)/)

console.log(
  `Verified PostgreSQL 18 uuidv7() defaults for ${diagram.tables.length} tables`
)
