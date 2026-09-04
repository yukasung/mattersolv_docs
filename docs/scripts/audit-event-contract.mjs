// The vocabulary `audit_events.action` and `audit_events.entity_type` may use.
//
// `audit_events` is append-only, so a typo reaches the table and stays there.
// Registering the vocabulary here rather than in a database CHECK keeps adding
// an action a code change instead of a migration, matching how string lengths
// are governed in `database-string-lengths` — see ADR-001.

/** Domains an action name may open with. One per bounded area of the system. */
export const auditActionDomains = Object.freeze(['tenant'])

/**
 * Every action that may be written, keyed by the action string.
 *
 * `entityType` is the singular of the table the action acts on.
 * `requiresActor` marks the actions that may never be attributed to the system:
 * deleting, exporting, approving, changing permissions, and changing financial
 * data all need a person, per `docs/app/docs/roles/permissions/page.mdx`.
 */
export const auditActions = Object.freeze({
  'tenant.number_format_changed': Object.freeze({
    entityType: 'tenant_number_sequence',
    requiresActor: true,
    summary: 'Document number prefix or padding was changed for a tenant.'
  })
})

/**
 * Columns whose value must never reach `before_data` or `after_data` as
 * written. The table cannot be corrected, so an unmasked national ID recorded
 * here is permanent. Mask or hash at the write path instead.
 */
export const maskedAuditColumns = Object.freeze({
  employees: Object.freeze(['identity_number', 'identity_number_key'])
})

/** Key under which `after_data` carries the permissions that allowed the action. */
export const auditPermissionKey = 'granted_permissions'
