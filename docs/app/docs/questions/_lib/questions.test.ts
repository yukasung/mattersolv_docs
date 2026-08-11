import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  displayQuestionTitle,
  filterQuestions,
  getAnswerState,
  getFilterOptions,
  getModuleCounts,
  getQuestionBySlug,
  getQuestionGroups,
  getQuestions,
  questionHref
} from './questions.ts'

test('displayQuestionTitle removes the question prefix used by Linear', () => {
  assert.equal(
    displayQuestionTitle('[คำถาม] ลูกความเห็นข้อมูลอะไรได้บ้างในระบบ'),
    'ลูกความเห็นข้อมูลอะไรได้บ้างในระบบ'
  )
  assert.equal(displayQuestionTitle('หัวข้อทั่วไป'), 'หัวข้อทั่วไป')
})

test('question hub displays titles without the Linear question prefix', async () => {
  const component = await readFile(
    new URL('../_components/questions-browser.tsx', import.meta.url),
    'utf8'
  )

  assert.match(component, /displayQuestionTitle\(question\.title\)/)
  assert.doesNotMatch(component, /<span>\{question\.status\}<\/span>/)
})

test('question hub displays the latest lawyer comment time', async () => {
  const [hub, browser] = await Promise.all([
    readFile(
      new URL('../_components/questions-hub.tsx', import.meta.url),
      'utf8'
    ),
    readFile(
      new URL('../_components/questions-browser.tsx', import.meta.url),
      'utf8'
    )
  ])

  assert.match(hub, /getLatestCommentDatesForIssues/)
  assert.match(browser, /latestCommentAt: string \| null/)
  assert.match(browser, /ความเห็นล่าสุด/)
})

test('snapshot contains every Linear main issue and sub-issue exactly once', () => {
  const questions = getQuestions()
  const ids = questions.map(({ id }) => id)

  assert.equal(questions.length, 89)
  assert.equal(new Set(ids).size, 89)
  assert.equal(questions.filter(({ parentId }) => !parentId).length, 2)
  assert.equal(questions.filter(({ parentId }) => parentId).length, 87)
})

test('primary classifications match the approved meeting groups', () => {
  assert.deepEqual(getModuleCounts(), {
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
  })
})

test('detail lookup and href use a stable lowercase Linear identifier', () => {
  const question = getQuestionBySlug('dev-145')

  assert.equal(question?.id, 'DEV-145')
  assert.equal(questionHref(question!), '/docs/questions/dev-145')
})

test('related modules are based on the question subject, not incidental description words', () => {
  assert.deepEqual(getQuestionBySlug('dev-145')?.relatedModules, [])
  assert.deepEqual(
    getQuestionBySlug('dev-147')?.relatedModules.sort(),
    ['billing', 'documents', 'quotations']
  )
})

test('answer state is derived from the standardized lawyer-answer section', () => {
  assert.equal(getAnswerState('## คำถาม\nคำถามเดิม'), 'unanswered')
  assert.equal(
    getAnswerState(
      '## คำตอบจากทีมทนาย\n\n**สถานะคำตอบ:** รอยืนยันเพิ่มเติม'
    ),
    'partial'
  )
  assert.equal(
    getAnswerState('## คำตอบจากทีมทนาย\n\n**สถานะคำตอบ:** ยืนยันแล้ว'),
    'confirmed'
  )
})

test('meeting filters match Thai text and combine module, priority, and status', () => {
  const byText = filterQuestions(getQuestions(), { query: 'การลา' })
  assert.ok(byText.some(({ id }) => id === 'DEV-145'))

  const urgentMatters = filterQuestions(getQuestions(), {
    module: 'matters',
    priority: 'Urgent',
    status: 'Backlog'
  })
  assert.ok(urgentMatters.length > 0)
  assert.ok(urgentMatters.every(({ primaryModule }) => primaryModule === 'matters'))
  assert.ok(urgentMatters.every(({ priority }) => priority === 'Urgent'))
  assert.ok(urgentMatters.every(({ status }) => status === 'Backlog'))
})

test('meeting groups follow module navigation order and contain every issue', () => {
  const groups = getQuestionGroups(getQuestions())

  assert.equal(groups[0]?.module.id, 'clients')
  assert.equal(groups.at(-1)?.module.id, 'other')
  assert.equal(
    groups.reduce((total, group) => total + group.questions.length, 0),
    89
  )
})

test('filter options come from the snapshot rather than hard-coded issue values', () => {
  const options = getFilterOptions(getQuestions())

  assert.ok(options.priorities.includes('Urgent'))
  assert.ok(options.priorities.includes('No priority'))
  assert.deepEqual(options.statuses, ['Backlog'])
})
