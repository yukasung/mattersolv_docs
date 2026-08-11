import { QuestionsBrowser } from './questions-browser'
import { getLatestCommentDatesForIssues } from '../_lib/comments'
import {
  getAnswerState,
  getFilterOptions,
  getQuestions,
  questionHref,
  resolveAnswerState
} from '../_lib/questions'

export async function QuestionsHub() {
  const questions = getQuestions()
  const options = getFilterOptions(questions)
  const latestCommentDates = await getLatestCommentDatesForIssues(
    questions.map(({ id }) => id)
  )

  return (
    <QuestionsBrowser
      questions={questions.map((question) => ({
        id: question.id,
        title: question.title,
        priority: question.priority,
        status: question.status,
        answerState: resolveAnswerState(
          getAnswerState(question.description),
          Boolean(latestCommentDates[question.id])
        ),
        primaryModule: question.primaryModule,
        labels: question.labels,
        href: questionHref(question),
        linearUrl: question.url,
        latestCommentAt: latestCommentDates[question.id] ?? null
      }))}
      priorities={options.priorities}
      statuses={options.statuses}
    />
  )
}
