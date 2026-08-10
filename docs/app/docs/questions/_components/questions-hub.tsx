import { QuestionsBrowser } from './questions-browser'
import {
  getAnswerState,
  getFilterOptions,
  getQuestions,
  questionHref,
  questionSnapshot
} from '../_lib/questions'

export function QuestionsHub() {
  const questions = getQuestions()
  const options = getFilterOptions(questions)
  const syncedAt = new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok'
  }).format(new Date(questionSnapshot.syncedAt))

  return (
    <>
      <aside className="questions-notice">
        <strong>ข้อมูลจาก Linear แบบอ่านอย่างเดียว</strong>
        <span>
          {questionSnapshot.issueCount} คำถาม · อัปเดตล่าสุด {syncedAt}
        </span>
        <span>
          เมื่อได้ข้อสรุปจากทีมทนาย ให้พิมพ์ในแชตว่า “บันทึกคำตอบ DEV-145”
          พร้อมรายละเอียด ระบบ Docs จะไม่เขียนข้อมูลกลับไปยัง Linear โดยตรง
        </span>
      </aside>

      <QuestionsBrowser
        questions={questions.map((question) => ({
          id: question.id,
          title: question.title,
          priority: question.priority,
          status: question.status,
          answerState: getAnswerState(question.description),
          primaryModule: question.primaryModule,
          labels: question.labels,
          href: questionHref(question),
          linearUrl: question.url
        }))}
        priorities={options.priorities}
        statuses={options.statuses}
      />
    </>
  )
}
