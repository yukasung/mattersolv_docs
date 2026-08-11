import snapshotData from '../_data/questions.snapshot.json' with { type: 'json' }
import { MODULES, type ModuleId } from './modules.ts'

export { MODULES, type ModuleId } from './modules.ts'
export type AnswerState = 'unanswered' | 'partial' | 'confirmed'

export interface Question {
  id: string
  title: string
  description: string
  priority: string
  url: string
  createdAt: string
  updatedAt: string
  status: string
  statusType: string
  parentId: string | null
  labels: string[]
  primaryModule: ModuleId
  relatedModules: ModuleId[]
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

export const questionSnapshot = {
  project: snapshot.project,
  projectId: snapshot.projectId,
  syncedAt: snapshot.syncedAt,
  issueCount: snapshot.issueCount
}

export function getQuestions(): Question[] {
  return snapshot.issues.slice()
}

export function getQuestionBySlug(slug: string): Question | undefined {
  const normalized = slug.trim().toLowerCase()
  return snapshot.issues.find(({ id }) => id.toLowerCase() === normalized)
}

export function questionHref(question: Pick<Question, 'id'>): string {
  return `/docs/questions/${question.id.toLowerCase()}`
}

export function displayQuestionTitle(title: string): string {
  return title.replace(/^\[คำถาม\]\s*/u, '')
}

export function getAnswerState(description: string): AnswerState {
  if (!/^##\s+คำตอบจากทีมทนาย\s*$/imu.test(description)) {
    return 'unanswered'
  }

  if (/สถานะคำตอบ:\*\*\s*ยืนยันแล้ว/iu.test(description)) {
    return 'confirmed'
  }

  return 'partial'
}

export function getModuleCounts(): Record<ModuleId, number> {
  const counts = Object.fromEntries(MODULES.map(({ id }) => [id, 0])) as Record<
    ModuleId,
    number
  >

  for (const question of snapshot.issues) {
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
  return snapshot.issues.filter(
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
