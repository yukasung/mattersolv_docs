'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import {
  MODULES,
  type ModuleId
} from '../_lib/modules.ts'
import { displayQuestionTitle, type AnswerState } from '../_lib/questions'

export interface BrowserQuestion {
  id: string
  title: string
  priority: string
  status: string
  answerState: AnswerState
  primaryModule: ModuleId
  labels: string[]
  href: string
  linearUrl: string
  latestCommentAt: string | null
}

const answerLabels: Record<AnswerState, string> = {
  unanswered: 'ยังไม่มีคำตอบ',
  answered: 'ตอบแล้ว'
}

function formatLatestCommentDate(date: string): string {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok'
  }).format(new Date(date))
}

export function QuestionsBrowser({
  questions,
  priorities,
  statuses
}: {
  questions: BrowserQuestion[]
  priorities: string[]
  statuses: string[]
}) {
  const [query, setQuery] = useState('')
  const [module, setModule] = useState<ModuleId | 'all'>('all')
  const [priority, setPriority] = useState('all')
  const [status, setStatus] = useState('all')
  const [answer, setAnswer] = useState<AnswerState | 'all'>('all')

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('th')
    return questions.filter((question) => {
      const searchable = [question.id, question.title, ...question.labels]
        .join(' ')
        .toLocaleLowerCase('th')
      return (
        (!normalized || searchable.includes(normalized)) &&
        (module === 'all' || question.primaryModule === module) &&
        (priority === 'all' || question.priority === priority) &&
        (status === 'all' || question.status === status) &&
        (answer === 'all' || question.answerState === answer)
      )
    })
  }, [answer, module, priority, query, questions, status])

  const groups = MODULES.map((moduleDefinition) => ({
    module: moduleDefinition,
    questions: filtered.filter(
      (question) => question.primaryModule === moduleDefinition.id
    )
  })).filter(({ questions: groupQuestions }) => groupQuestions.length > 0)

  return (
    <div className="questions-browser">
      <div className="questions-filter-panel">
        <label className="questions-search">
          <span>ค้นหาคำถาม</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาจาก DEV-145 หรือข้อความคำถาม"
          />
        </label>

        <label>
          <span>โมดูล</span>
          <select
            value={module}
            onChange={(event) => setModule(event.target.value as ModuleId | 'all')}
          >
            <option value="all">ทั้งหมด</option>
            {MODULES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>สถานะคำตอบ</span>
          <select
            value={answer}
            onChange={(event) =>
              setAnswer(event.target.value as AnswerState | 'all')
            }
          >
            <option value="all">ทั้งหมด</option>
            <option value="unanswered">ยังไม่มีคำตอบ</option>
            <option value="answered">ตอบแล้ว</option>
          </select>
        </label>
      </div>

      <p className="questions-result-count" aria-live="polite">
        แสดง {filtered.length} จาก {questions.length} คำถาม
      </p>

      {groups.length === 0 ? (
        <div className="questions-empty">ไม่พบคำถามที่ตรงกับตัวกรอง</div>
      ) : (
        groups.map(({ module: groupModule, questions: groupQuestions }) => (
          <details className="questions-group" key={groupModule.id} open>
            <summary>
              <span>{groupModule.label}</span>
              <span>{groupQuestions.length} รายการ</span>
            </summary>
            <div className="questions-list">
                  {groupQuestions.map((question) => (
                    <article className="question-row" key={question.id}>
                      <div className="question-row-heading">
                        <Link href={question.href}>
                          {displayQuestionTitle(question.title)}
                        </Link>
                    <span className={`answer-badge answer-${question.answerState}`}>
                      {answerLabels[question.answerState]}
                    </span>
                  </div>
                  <div className="question-meta">
                    <span>{question.id}</span>
                    <span>{question.priority}</span>
                    {question.latestCommentAt && (
                      <span>
                        ความเห็นล่าสุด {formatLatestCommentDate(question.latestCommentAt)}
                      </span>
                    )}
                    <a href={question.linearUrl} target="_blank" rel="noreferrer">
                      เปิดใน Linear ↗
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </details>
        ))
      )}
    </div>
  )
}
