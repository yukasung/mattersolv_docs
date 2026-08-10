import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const snapshotUrl = new URL(
  '../app/docs/questions/_data/questions.snapshot.json',
  import.meta.url
)
const snapshot = JSON.parse(await readFile(snapshotUrl, 'utf8'))

const expectedCounts = {
  clients: 6,
  matters: 24,
  documents: 7,
  quotations: 11,
  calendar: 3,
  tasks: 2,
  billing: 5,
  finance: 1,
  hr: 3,
  reports: 4,
  administration: 18,
  other: 5
}

assert.equal(snapshot.project, 'Legal ERP — Requirement Clarification')
assert.equal(snapshot.issueCount, 89)
assert.equal(snapshot.issues.length, 89)
assert.equal(new Set(snapshot.issues.map(({ id }) => id)).size, 89)
assert.equal(snapshot.issues.filter(({ parentId }) => !parentId).length, 2)
assert.equal(snapshot.issues.filter(({ parentId }) => parentId).length, 87)
assert.ok(snapshot.issues.every(({ description }) => description.trim().length > 0))
assert.ok(snapshot.issues.every(({ url }) => url.startsWith('https://linear.app/')))

const actualCounts = Object.fromEntries(
  Object.keys(expectedCounts).map((module) => [
    module,
    snapshot.issues.filter(({ primaryModule }) => primaryModule === module).length
  ])
)
assert.deepEqual(actualCounts, expectedCounts)

console.log(
  `Verified ${snapshot.issueCount} read-only Linear issues synced at ${snapshot.syncedAt}`
)
console.log(actualCounts)
