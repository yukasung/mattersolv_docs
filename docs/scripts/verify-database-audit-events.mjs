import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  auditActionDomains,
  auditActions,
  maskedAuditColumns
} from './audit-event-contract.mjs'

// `audit_events` has a SELECT and an INSERT policy and no others, so nothing
// written to it can be corrected later. A mistyped action or an unmasked
// national ID is permanent. These assertions are the only thing standing
// between the registry and that table — see ADR-001.

const diagramUrl = new URL('../../database.ddb', import.meta.url)
const settingsVerifierUrl = new URL('./verify-database-tenant-settings.sql', import.meta.url)
const [diagram, settingsVerifier] = await Promise.all([
  readFile(diagramUrl, 'utf8').then(JSON.parse),
  readFile(settingsVerifierUrl, 'utf8')
])

const tables = new Map(diagram.tables.map((table) => [table.name, table]))

/**
 * The singular of a table name: `tenant_addresses` to `tenant_address`,
 * `tenant_number_sequences` to `tenant_number_sequence`.
 *
 * Derive the singular from the table rather than testing whether the entity
 * type plus a suffix happens to name one — appending `es` to a name with a
 * dropped letter can land back on a real table and wave a typo through.
 */
const singularOf = (tableName) =>
  /(?:s|x|z|ch|sh)es$/.test(tableName)
    ? tableName.slice(0, -2)
    : tableName.endsWith('s')
      ? tableName.slice(0, -1)
      : tableName

const entityTypes = new Map(
  [...tables.keys()].map((tableName) => [singularOf(tableName), tables.get(tableName)])
)
const tableForEntityType = (entityType) => entityTypes.get(entityType)

const actionPattern = /^([a-z][a-z0-9_]*)\.([a-z][a-z0-9_]*)$/

// The permissions rule requires an audit event for deleting, exporting,
// approving, changing permissions, and changing financial data. Those are
// never the system acting alone, so each needs a named actor.
const actorRequiringVerbs = ['deleted', 'exported', 'approved', 'permissions_changed']

assert.ok(auditActionDomains.length > 0, 'at least one audit domain must be declared')
for (const domain of auditActionDomains) {
  assert.match(domain, /^[a-z][a-z0-9_]*$/, `audit domain ${domain} must be snake_case`)
}

const actionNames = Object.keys(auditActions)
assert.ok(actionNames.length > 0, 'the audit action registry must not be empty')

for (const [action, entry] of Object.entries(auditActions)) {
  const match = actionPattern.exec(action)
  assert.ok(match, `${action} must be named <domain>.<verb_phrase> in snake_case`)

  const [, domain, verbPhrase] = match
  assert.ok(
    auditActionDomains.includes(domain),
    `${action} opens with undeclared domain "${domain}"; add it to auditActionDomains or rename the action`
  )
  // Past tense: an audit row records something that already happened.
  assert.match(
    verbPhrase,
    /_?[a-z0-9_]*ed$/,
    `${action} must end in a past-tense verb, because an audit row records a completed change`
  )

  assert.ok(entry.summary, `${action} must carry a summary explaining when it is written`)

  const table = tableForEntityType(entry.entityType)
  assert.ok(
    table,
    `${action} names entityType "${entry.entityType}", which matches no table in the diagram`
  )

  if (actorRequiringVerbs.some((verb) => verbPhrase.endsWith(verb))) {
    assert.equal(
      entry.requiresActor,
      true,
      `${action} deletes, exports, approves or changes permissions, so it must set requiresActor`
    )
  }
}

// Whatever the database already forces, the registry must agree with. The
// action CHECK on audit_events demands an actor for the actions it names.
const auditTable = tables.get('audit_events')
assert.ok(auditTable, 'audit_events must exist in the diagram')
const actionCheck = auditTable.fields.find(({ name }) => name === 'action')?.check ?? ''
for (const action of actionNames) {
  if (!actionCheck.includes(action)) continue
  assert.ok(
    actionCheck.includes('actor_tenant_user_id IS NOT NULL'),
    `the database CHECK names ${action}; confirm what it constrains before trusting the registry`
  )
  assert.equal(
    auditActions[action].requiresActor,
    true,
    `the database CHECK forces an actor for ${action}, so the registry must require one too`
  )
}

// An action exercised by the runtime verifier but missing here would mean the
// registry is already behind the system it claims to describe. Read only the
// audit_events inserts: dotted strings elsewhere in the file are RLS settings
// such as 'app.tenant_id', not actions.
const auditInserts = settingsVerifier
  .split(/INSERT INTO audit_events/)
  .slice(1)
  .map((chunk) => chunk.split(';')[0])
assert.ok(auditInserts.length > 0, 'the runtime verifier must exercise audit_events')

let exercisedActions = 0
for (const insert of auditInserts) {
  for (const [, action] of insert.matchAll(/'([a-z][a-z0-9_]*\.[a-z][a-z0-9_]*)'/g)) {
    assert.ok(
      action in auditActions,
      `verify-database-tenant-settings.sql writes audit action ${action}, which is not registered`
    )
    exercisedActions += 1
  }
}
assert.ok(exercisedActions > 0, 'no audit action was found in the audit_events inserts')

for (const [tableName, columns] of Object.entries(maskedAuditColumns)) {
  const table = tables.get(tableName)
  assert.ok(table, `maskedAuditColumns names table ${tableName}, which does not exist`)
  for (const column of columns) {
    assert.ok(
      table.fields.some(({ name }) => name === column),
      `maskedAuditColumns names ${tableName}.${column}, which does not exist`
    )
  }
}

const maskedCount = Object.values(maskedAuditColumns).flat().length
console.log(
  `Verified ${actionNames.length} audit actions and ${maskedCount} masked columns`
)
