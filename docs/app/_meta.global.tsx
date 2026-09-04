import type { ReactNode } from 'react'

const Section = ({ children }: { children: ReactNode }) => (
  <span className="x:text-xs x:font-semibold x:uppercase x:tracking-normal x:text-gray-500 dark:x:text-gray-400">
    {children}
  </span>
)

export default {
  index: { type: 'page', display: 'hidden' },
  docs: {
    type: 'page',
    title: 'MatterSolv',
    href: '/docs',
    items: {
      index: 'Overview',
      scope: 'Scope',
      workflow: 'Business Workflow',
      plans: { title: 'Plans & Pricing', items: { index: 'Overview', pricing: 'Pricing', 'subscription-access': 'Signup & Access', 'feature-comparison': 'Feature Comparison', 'plan-rules': 'Plan Rules' } },
      roles: { title: 'Roles', items: { index: 'Overview', roles: 'User Roles', permissions: 'Permissions' } },
      modules: { title: 'Modules', items: { index: 'Overview', clients: 'Clients', matters: 'Matters', documents: 'Documents', quotations: 'Quotations', calendar: 'Calendar', tasks: 'Tasks', billing: 'Billing', finance: 'Finance', employees: 'Employees', hr: 'Human Resources', reports: 'Reports', administration: { title: 'Administration', items: { index: 'Overview', 'user-accounts': 'User Accounts' } } } },
      reference: { title: 'Reference', items: { 'menu-map': 'Application Menu Map', courts: 'Courts & Court Forms', requirements: 'Requirement Register' } },
      _technical: { type: 'separator', title: <Section>Technical</Section> },
      architecture: { title: 'Architecture', items: { index: 'Overview', 'technology-stack': 'Technology Stack', 'scalability-capacity': 'Scalability & Capacity' } },
      development: { title: 'Development', items: { workflow: 'Development Workflow', rules: 'Development Rules', 'design-system': 'Design System', 'component-library': 'Component Library' } },
      database: { title: 'Database', items: { index: 'Overview', 'django-auth': 'Django Authentication', 'tenant-authorization': 'Tenant & Authorization', 'audit-events': 'Audit Events' } },
      api: { title: 'API' },
      questions: { title: 'Questions' }
    }
  }
}
