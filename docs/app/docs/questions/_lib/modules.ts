export const MODULES = [
  { id: 'clients', label: 'Clients', href: '/docs/modules/clients' },
  { id: 'matters', label: 'Matters', href: '/docs/modules/matters' },
  { id: 'documents', label: 'Documents', href: '/docs/modules/documents' },
  { id: 'quotations', label: 'Quotations', href: '/docs/modules/quotations' },
  { id: 'calendar', label: 'Calendar', href: '/docs/modules/calendar' },
  { id: 'tasks', label: 'Tasks', href: '/docs/modules/tasks' },
  { id: 'billing', label: 'Billing', href: '/docs/modules/billing' },
  { id: 'finance', label: 'Finance', href: '/docs/modules/finance' },
  { id: 'hr', label: 'Human Resources', href: '/docs/modules/hr' },
  { id: 'reports', label: 'Reports', href: '/docs/modules/reports' },
  {
    id: 'administration',
    label: 'Administration',
    href: '/docs/modules/administration'
  },
  { id: 'other', label: 'Other', href: null }
] as const

export type ModuleId = (typeof MODULES)[number]['id']
