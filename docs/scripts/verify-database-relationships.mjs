import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// drawDB stores a relationship as start -> end, where start holds the foreign
// key and end is the referenced column. The editor's Edit panel lists them the
// other way round ("Primary: <end>" before "Foreign: <start>") while the
// cardinality still reads start -> end, so the panel invites reading the
// direction backwards. Picking a corrected-looking value there rewrites only
// the cardinality and leaves the tables untouched, which silently produces a
// diagram that contradicts the schema. These assertions make that fail here.

const diagramUrl = new URL('../../database.ddb', import.meta.url)
const diagram = await readFile(diagramUrl, 'utf8').then(JSON.parse)

const tables = new Map(diagram.tables.map((table) => [table.id, table]))
const fieldOf = (table, fieldId) =>
  table?.fields.find(({ id }) => id === fieldId)

// A column is unique when it says so itself or a single-column unique index
// covers it. Multi-column unique indexes do not constrain the column alone.
const isUnique = (table, field) =>
  Boolean(
    field.primary ||
      field.unique ||
      table.indices?.some(
        ({ unique, fields }) => unique && fields.length === 1 && fields[0] === field.name
      )
  )

let oneToOne = 0
for (const relationship of diagram.relationships) {
  const { name, cardinality } = relationship
  const startTable = tables.get(relationship.startTableId)
  const endTable = tables.get(relationship.endTableId)
  assert.ok(startTable, `${name} must start at a table in the diagram`)
  assert.ok(endTable, `${name} must end at a table in the diagram`)

  const startField = fieldOf(startTable, relationship.startFieldId)
  const endField = fieldOf(endTable, relationship.endFieldId)
  assert.ok(startField, `${name} must start at a field of ${startTable.name}`)
  assert.ok(endField, `${name} must end at a field of ${endTable.name}`)

  const from = `${startTable.name}.${startField.name}`
  const to = `${endTable.name}.${endField.name}`

  // A foreign key must reference something a single row is identified by.
  // This also catches a swapped relationship, whose end lands on a plain column.
  assert.ok(
    isUnique(endTable, endField),
    `${name} points at ${to}, which is neither a primary key nor unique; check that ${from} is the foreign key side`
  )

  // The foreign key side is "many" unless the column is unique, in which case
  // it is one-to-one. "One to many" would make the key holder the single side,
  // which a foreign key cannot express.
  assert.notEqual(
    cardinality,
    'one_to_many',
    `${name} is one_to_many, but ${from} holds the foreign key and cannot be the "one" side; use many_to_one, or Swap the keys if the direction is genuinely reversed`
  )
  assert.ok(
    ['many_to_one', 'one_to_one'].includes(cardinality),
    `${name} has unsupported cardinality ${cardinality}`
  )

  if (cardinality === 'one_to_one') {
    assert.ok(
      isUnique(startTable, startField),
      `${name} is one_to_one, but ${from} is not unique, so a tenant could hold several ${startTable.name} rows; make it unique or use many_to_one`
    )
    oneToOne += 1
  } else {
    assert.ok(
      !isUnique(startTable, startField),
      `${name} is many_to_one, but ${from} is unique, so it admits at most one row; use one_to_one`
    )
  }
}

console.log(
  `Verified ${diagram.relationships.length} relationship directions, ${oneToOne} of them one-to-one`
)
