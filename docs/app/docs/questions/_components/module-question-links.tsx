import Link from 'next/link'

import {
  getQuestionsForModule,
  moduleLabel,
  questionHref,
  type ModuleId
} from '../_lib/questions'

export function ModuleQuestionLinks({ module }: { module: ModuleId }) {
  const questions = getQuestionsForModule(module, { includeRelated: true })
  const primary = questions.filter(({ primaryModule }) => primaryModule === module)
  const related = questions.filter(({ primaryModule }) => primaryModule !== module)

  return (
    <details className="module-question-links">
      <summary>
        Questions for lawyer meeting ({primary.length} primary
        {related.length > 0 ? `, ${related.length} related` : ''})
      </summary>
      <p>
        คำถาม Requirement Clarification ที่เกี่ยวข้องกับ {moduleLabel(module)}
        โดยตรง แต่ละลิงก์เปิดรายละเอียดจาก Linear snapshot
      </p>
      <ul>
        {primary.map((question) => (
          <li key={question.id}>
            <Link href={questionHref(question)}>
              {question.id}: {question.title}
            </Link>
          </li>
        ))}
      </ul>
      {related.length > 0 && (
        <>
          <p><strong>Related questions</strong></p>
          <ul>
            {related.map((question) => (
              <li key={question.id}>
                <Link href={questionHref(question)}>
                  {question.id}: {question.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </details>
  )
}
