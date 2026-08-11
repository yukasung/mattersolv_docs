'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import { LinearMarkdown } from './linear-markdown'
import { extractMeetingQuestion } from '../_lib/meeting-content'
import {
  getAnswerState,
  getQuestionBySlug,
  moduleLabel
} from '../_lib/questions'

const answerLabels = {
  unanswered: 'ยังไม่มีคำตอบ',
  partial: 'รอยืนยันเพิ่มเติม',
  confirmed: 'ยืนยันแล้ว'
} as const

export function QuestionDetail() {
  const params = useParams<{ issueId?: string }>()
  const question = getQuestionBySlug(params.issueId ?? '')

  if (!question) {
    return <p>ไม่พบคำถามนี้ กรุณากลับไปตรวจสอบจากหน้าคำถามทั้งหมด</p>
  }

  const answerState = getAnswerState(question.description)
  const meetingQuestion = extractMeetingQuestion(question.description)

  return (
    <article className="question-detail">
      <Link className="questions-back" href="/docs/questions">
        ← กลับไปหน้าคำถามทั้งหมด
      </Link>

      <div className="question-detail-heading">
        <span className="question-id">{question.id}</span>
        <span className={`answer-badge answer-${answerState}`}>
          {answerLabels[answerState]}
        </span>
      </div>

      <div className="question-detail-meta">
        <span>โมดูล: {moduleLabel(question.primaryModule)}</span>
        <span>ความสำคัญ: {question.priority}</span>
        <span>สถานะใน Linear: {question.status}</span>
      </div>

      {meetingQuestion && (
        <aside className="question-meeting-summary">
          <p>{meetingQuestion}</p>
        </aside>
      )}

      <LinearMarkdown content={question.description} />

      <section className="question-source-meta">
        {question.relatedModules.length > 0 && (
          <p>
            <strong>โมดูลที่เกี่ยวข้อง:</strong>{' '}
            {question.relatedModules.map(moduleLabel).join(', ')}
          </p>
        )}
        <a href={question.url} target="_blank" rel="noreferrer">
          เปิด Issue ต้นทางใน Linear ↗
        </a>
      </section>
    </article>
  )
}
