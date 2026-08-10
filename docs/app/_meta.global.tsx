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
    title: 'Legal Practice ERP Platform',
    href: '/docs',
    items: {
      index: 'Overview',
      scope: 'Scope',
      workflow: 'Business Workflow',
      plans: { title: 'Plans & Pricing', items: { index: 'Overview', pricing: 'Pricing', 'subscription-access': 'Signup & Access', 'feature-comparison': 'Feature Comparison', 'plan-rules': 'Plan Rules' } },
      roles: { title: 'Roles', items: { index: 'Overview', roles: 'User Roles', permissions: 'Permissions' } },
      modules: { title: 'โมดูล', items: { index: 'ภาพรวม', clients: 'ลูกค้า', matters: 'คดีและงานกฎหมาย', documents: 'เอกสาร', quotations: 'ใบเสนอราคา', calendar: 'ปฏิทินนัดหมาย', tasks: 'งาน', billing: 'การวางบิล', finance: 'การเงินและบัญชี', hr: 'บุคลากร', reports: 'รายงาน', administration: 'การดูแลระบบ' } },
      reference: { title: 'Reference', items: { 'menu-map': 'Application Menu Map', courts: 'Courts & Court Forms', requirements: 'Requirement Register' } },
      _technical: { type: 'separator', title: <Section>Technical</Section> },
      architecture: { title: 'Architecture', items: { index: 'Overview', 'technology-stack': 'Technology Stack', 'scalability-capacity': 'Scalability & Capacity' } },
      development: { title: 'Development', items: { workflow: 'Development Workflow', rules: 'Development Rules' } },
      database: { title: 'Database' },
      api: { title: 'API' }
    }
  }
}
