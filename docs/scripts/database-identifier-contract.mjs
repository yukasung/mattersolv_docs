export const publicIdentifierTableNames = Object.freeze([
  'tenants',
  'tenant_users',
  'employees',
  'employee_addresses',
  'plans',
  'features',
  'subscriptions',
  'checkout_sessions',
  'pending_trial_applications',
  'payment_transactions',
  'payment_events',
  'tenant_invitations',
  'user_profiles'
])

export const internalOnlyTableNames = Object.freeze([
  'tenant_groups',
  'tenant_role_assignments',
  'plan_entitlements',
  'tenant_entitlement_overrides'
])

export const matterSolvOwnedTableNames = Object.freeze([
  ...publicIdentifierTableNames,
  ...internalOnlyTableNames
])
