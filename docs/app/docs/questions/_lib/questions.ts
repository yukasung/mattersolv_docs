import snapshotData from '../_data/questions.snapshot.json' with { type: 'json' }
import { employeeQuestions } from './employees.questions.ts'
import { MODULES, type ModuleId } from './modules.ts'

export { MODULES, type ModuleId } from './modules.ts'
export type AnswerState = 'unanswered' | 'answered'

export interface Question {
  id: string
  title: string
  description: string
  priority: string
  url?: string
  createdAt: string
  updatedAt: string
  status: string
  statusType: string
  parentId: string | null
  labels: string[]
  primaryModule: ModuleId
  relatedModules: ModuleId[]
  source?: 'html'
}

export interface QuestionFilters {
  query?: string
  module?: ModuleId | 'all'
  priority?: string | 'all'
  status?: string | 'all'
  answer?: AnswerState | 'all'
}

interface QuestionSnapshot {
  project: string
  projectId: string
  syncedAt: string
  issueCount: number
  issues: Question[]
}

const snapshot = snapshotData as QuestionSnapshot

const htmlQuestions: Question[] = [
  {
    id: 'DEV-190',
    title:
      '[คำถาม] กรณีหนึ่งคดีมีลูกความหลายราย การออกใบเสนอราคาและใบวางบิลควรออกในนามใคร?',
    description: `## เหตุผลที่ต้องสอบถาม

หนึ่งคดีอาจมีลูกความหลายราย จึงต้องกำหนดผู้รับใบเสนอราคาและใบวางบิลให้ชัดเจน

## คำถาม

กรณีหนึ่งคดีมีลูกความหลายราย การออกใบเสนอราคาและใบวางบิลควรออกในนามใคร?

## ตัวเลือก

* ออกในนามลูกความหลักเพียงรายเดียว
* แยกออกให้ลูกความแต่ละราย
* สามารถเลือกได้ว่าจะออกให้รายใด หรือแบ่งออกหลายราย

## ผลกระทบ

* การออกใบเสนอราคาและใบวางบิล
* การกำหนดผู้ชำระเงินของคดี`,
    priority: 'High',
    createdAt: '',
    updatedAt: '',
    status: 'Backlog',
    statusType: 'backlog',
    parentId: 'html',
    labels: ['ลูกความ', 'ใบเสนอราคา', 'ใบวางบิล'],
    primaryModule: 'clients',
    relatedModules: ['quotations', 'billing'],
    source: 'html'
  },
  {
    id: 'DEV-191',
    title:
      '[คำถาม] ลูกความหลายรายที่อยู่ในคดีเดียวกัน สามารถเห็นข้อมูลคดีได้เหมือนกันทั้งหมดหรือไม่?',
    description: `## เหตุผลที่ต้องสอบถาม

คดีหนึ่งอาจมีลูกความหลายราย จึงต้องกำหนดขอบเขตการเข้าดูข้อมูลคดีของลูกความแต่ละรายให้ชัดเจน

## คำถาม

ลูกความหลายรายที่อยู่ในคดีเดียวกัน สามารถเห็นข้อมูลคดีได้เหมือนกันทั้งหมดหรือไม่?

## ตัวเลือก

* เห็นข้อมูลทั้งหมดเหมือนกัน
* เห็นเฉพาะข้อมูลที่เกี่ยวข้องกับตนเอง
* กำหนดสิทธิ์การเข้าถึงแยกเป็นรายบุคคล
* ลูกความไม่สามารถเข้าดูข้อมูลคดีโดยตรง

## ผลกระทบ

* การรักษาความลับของข้อมูลคดี
* สิทธิ์การเข้าถึงข้อมูลของลูกความ
* การออกแบบหน้าลูกความสำหรับติดตามคดี`,
    priority: 'High',
    createdAt: '',
    updatedAt: '',
    status: 'Backlog',
    statusType: 'backlog',
    parentId: 'html',
    labels: ['ลูกความ', 'สิทธิ์การเข้าถึง', 'ข้อมูลคดี'],
    primaryModule: 'clients',
    relatedModules: [],
    source: 'html'
  },
  {
    id: 'DEV-192',
    title: '[คำถาม] หากลูกความรายหนึ่งถอนตัวออกจากคดี ควรจัดการอย่างไร?',
    description: `## เหตุผลที่ต้องสอบถาม

คดีหนึ่งอาจมีลูกความหลายราย จึงต้องกำหนดผลของการถอนตัวของลูกความรายหนึ่งต่อสถานะของคดีให้ชัดเจน

## คำถาม

หากลูกความรายหนึ่งถอนตัวออกจากคดี ควรจัดการอย่างไร?

## ตัวเลือก

* ถอนเฉพาะลูกความรายนั้น และคดียังคงดำเนินต่อ
* ปิดคดีทั้งหมด
* ให้ทนายหรือผู้ดูแลเป็นผู้กำหนดว่าจะดำเนินการต่อหรือปิดคดี

## ผลกระทบ

* สถานะของลูกความและคดี
* การมอบหมายงานให้ทนายและผู้ดูแล
* ประวัติการดำเนินคดีของลูกความ`,
    priority: 'High',
    createdAt: '',
    updatedAt: '',
    status: 'Backlog',
    statusType: 'backlog',
    parentId: 'html',
    labels: ['ลูกความ', 'คดี', 'สถานะคดี'],
    primaryModule: 'clients',
    relatedModules: [],
    source: 'html'
  },
  {
    id: 'DEV-193',
    title: '[คำถาม] ลูกความแต่ละรายควรมีรหัสลูกความแยกกันหรือไม่?',
    description: `## เหตุผลที่ต้องสอบถาม

ต้องกำหนดหลักเกณฑ์การออกรหัสลูกความให้ชัดเจน เพื่อระบุตัวตนและเชื่อมข้อมูลของลูกความแต่ละรายได้อย่างถูกต้อง

## คำถาม

ลูกความแต่ละรายควรมีรหัสลูกความแยกกันหรือไม่?

## ตัวเลือก

* แยกรหัสลูกความคนละรหัสเสมอ
* ใช้รหัสเดียวกันหากอยู่ในคดีเดียวกัน
* ขึ้นอยู่กับประเภทลูกความ เช่น บุคคล/บริษัท
* ไม่จำเป็นต้องมีรหัสลูกความ

## ผลกระทบ

* การระบุตัวตนและค้นหาข้อมูลลูกความ
* การเชื่อมลูกความเข้ากับคดีและเอกสาร
* รายงานข้อมูลลูกความ`,
    priority: 'High',
    createdAt: '',
    updatedAt: '',
    status: 'Backlog',
    statusType: 'backlog',
    parentId: 'html',
    labels: ['ลูกความ', 'รหัสลูกความ'],
    primaryModule: 'clients',
    relatedModules: [],
    source: 'html'
  },
  {
    id: 'DEV-194',
    title:
      '[คำถาม] ลูกความหลายรายที่อยู่ในคดีเดียวกัน ควรใช้หมายเลขคดี/เลขที่งานอย่างไร?',
    description: `## เหตุผลที่ต้องสอบถาม

คดีหนึ่งอาจมีลูกความหลายราย จึงต้องกำหนดความสัมพันธ์ระหว่างหมายเลขคดี เลขที่งาน และลูกความแต่ละรายให้ชัดเจน

## คำถาม

ลูกความหลายรายที่อยู่ในคดีเดียวกัน ควรใช้หมายเลขคดี/เลขที่งานอย่างไร?

## ตัวเลือก

* ใช้หมายเลขคดีหรือเลขที่งานเดียวกันทั้งหมด
* แยกเลขที่งานตามลูกความแต่ละราย
* ใช้หมายเลขคดีเดียวกัน แต่มีเลขที่งานย่อยแยกตามลูกความ

## ผลกระทบ

* การค้นหาและอ้างอิงคดี
* การเชื่อมข้อมูลลูกความกับคดี
* รายงานสถานะและภาระงาน`,
    priority: 'High',
    createdAt: '',
    updatedAt: '',
    status: 'Backlog',
    statusType: 'backlog',
    parentId: 'html',
    labels: ['ลูกความ', 'หมายเลขคดี', 'เลขที่งาน'],
    primaryModule: 'clients',
    relatedModules: [],
    source: 'html'
  }
]

const localQuestions: Question[] = [...htmlQuestions, ...employeeQuestions]

function isPublishedQuestion(question: Question): boolean {
  return question.parentId !== null
}

export const questionSnapshot = {
  project: snapshot.project,
  projectId: snapshot.projectId,
  syncedAt: snapshot.syncedAt,
  issueCount: snapshot.issueCount
}

export function getQuestions(): Question[] {
  return [...snapshot.issues.filter(isPublishedQuestion), ...localQuestions]
}

export function getQuestionBySlug(slug: string): Question | undefined {
  const normalized = slug.trim().toLowerCase()
  return getQuestions().find(
    (question) => question.id.toLowerCase() === normalized
  )
}

export function getHtmlQuestionsForModule(module: ModuleId): Question[] {
  return localQuestions.filter(({ primaryModule }) => primaryModule === module)
}

export function questionHref(question: Pick<Question, 'id'>): string {
  return `/docs/questions/${question.id.toLowerCase()}`
}

export function displayQuestionTitle(title: string): string {
  return title.replace(/^\[(?:คำถาม|หัวข้อ)\]\s*/u, '')
}

export function getAnswerState(description: string): AnswerState {
  if (!/^##\s+คำตอบจากทีมทนาย\s*$/imu.test(description)) {
    return 'unanswered'
  }

  return 'answered'
}

export function resolveAnswerState(
  sourceState: AnswerState,
  hasComments: boolean
): AnswerState {
  if (sourceState === 'unanswered' && hasComments) {
    return 'answered'
  }

  return sourceState
}

export function getModuleCounts(): Record<ModuleId, number> {
  const counts = Object.fromEntries(MODULES.map(({ id }) => [id, 0])) as Record<
    ModuleId,
    number
  >

  for (const question of getQuestions()) {
    counts[question.primaryModule] += 1
  }

  return counts
}

export function getQuestionGroups(questions: Question[]) {
  return MODULES.map((module) => ({
    module,
    questions: questions.filter(
      ({ primaryModule }) => primaryModule === module.id
    )
  })).filter(({ questions: moduleQuestions }) => moduleQuestions.length > 0)
}

export function getFilterOptions(questions: Question[]) {
  const priorityOrder = ['Urgent', 'High', 'Medium', 'Low', 'No priority']
  const priorities = [...new Set(questions.map(({ priority }) => priority))].sort(
    (left, right) =>
      priorityOrder.indexOf(left) - priorityOrder.indexOf(right)
  )
  const statuses = [...new Set(questions.map(({ status }) => status))].sort()

  return { priorities, statuses }
}

export function getQuestionsForModule(
  module: ModuleId,
  { includeRelated = false }: { includeRelated?: boolean } = {}
): Question[] {
  return getQuestions().filter(
    (question) =>
      question.primaryModule === module ||
      (includeRelated && question.relatedModules.includes(module))
  )
}

export function filterQuestions(
  questions: Question[],
  filters: QuestionFilters
): Question[] {
  const query = filters.query?.trim().toLocaleLowerCase('th') ?? ''

  return questions.filter((question) => {
    const searchable = [
      question.id,
      question.title,
      question.description,
      ...question.labels
    ]
      .join('\n')
      .toLocaleLowerCase('th')

    return (
      (!query || searchable.includes(query)) &&
      (!filters.module ||
        filters.module === 'all' ||
        question.primaryModule === filters.module) &&
      (!filters.priority ||
        filters.priority === 'all' ||
        question.priority === filters.priority) &&
      (!filters.status ||
        filters.status === 'all' ||
        question.status === filters.status) &&
      (!filters.answer ||
        filters.answer === 'all' ||
        getAnswerState(question.description) === filters.answer)
    )
  })
}

export function moduleLabel(module: ModuleId): string {
  return MODULES.find(({ id }) => id === module)?.label ?? module
}
