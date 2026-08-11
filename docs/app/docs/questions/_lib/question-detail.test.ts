import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('question detail keeps the decision prompt without duplicate title or answer help', async () => {
  const component = await readFile(
    new URL('../_components/question-detail.tsx', import.meta.url),
    'utf8'
  )

  assert.match(component, /question-meeting-summary/)
  assert.doesNotMatch(component, /<h1>\{question\.title\}<\/h1>/)
  assert.doesNotMatch(component, /question-answer-help/)
  assert.doesNotMatch(component, /บันทึกข้อสรุปหลังประชุม/)
})

test('question detail provides immutable comments with a remembered commenter name', async () => {
  const [detail, comments] = await Promise.all([
    readFile(
      new URL('../_components/question-detail.tsx', import.meta.url),
      'utf8'
    ),
    readFile(
      new URL('../_components/question-comments.tsx', import.meta.url),
      'utf8'
    )
  ])

  assert.match(detail, /<QuestionComments[\s\S]*issueId=\{question\.id\}/)
  assert.match(comments, /COMMENTER_NAME_STORAGE_KEY = 'mattersolv\.commenter-name'/)
  assert.match(comments, /localStorage\.getItem\(COMMENTER_NAME_STORAGE_KEY\)/)
  assert.match(comments, /localStorage\.setItem\(COMMENTER_NAME_STORAGE_KEY/)
  assert.match(comments, /aria-label="ความคิดเห็น"/)
  assert.match(comments, /aria-label="ชื่อผู้แสดงความเห็น"/)
  assert.match(comments, /aria-label="ความคิดเห็น"/)
  assert.match(comments, /aria-label="ชื่อผู้แสดงความเห็น"/)
  assert.doesNotMatch(comments, /<label>|question-comments-field-label/)
  assert.match(comments, /className="question-comments-actions"/)
  assert.doesNotMatch(comments, /ล้างชื่อที่จำไว้|clearSavedCommenterName|localStorage\.removeItem/)
  assert.doesNotMatch(comments, /Turnstile|turnstile/i)
  assert.doesNotMatch(comments, /ทนาย|lawyer/i)
  assert.doesNotMatch(comments, /dangerouslySetInnerHTML/)
})

test('question detail updates an unanswered badge when comments are present', async () => {
  const [detail, comments] = await Promise.all([
    readFile(
      new URL('../_components/question-detail.tsx', import.meta.url),
      'utf8'
    ),
    readFile(
      new URL('../_components/question-comments.tsx', import.meta.url),
      'utf8'
    )
  ])

  assert.match(detail, /resolveAnswerState\(sourceAnswerState, hasComments\)/)
  assert.match(detail, /onCommentPresenceChange=\{setHasComments\}/)
  assert.match(
    comments,
    /onCommentPresenceChange\(Boolean\(payload\.comments\?\.length\)\)/
  )
  assert.match(comments, /onCommentPresenceChange\(true\)/)
  assert.doesNotMatch(detail, /รอยืนยันเพิ่มเติม|ยืนยันแล้ว/)
})

test('comment inputs have visible form controls without undefined Nextra colors', async () => {
  const styles = await readFile(
    new URL('../../../globals.css', import.meta.url),
    'utf8'
  )

  assert.match(
    styles,
    /\.question-comments-form input,[\s\S]*?min-height:\s*2\.75rem/s
  )
  assert.match(
    styles,
    /\.question-comments-form input,[\s\S]*?border:\s*1px solid color-mix\(in srgb, currentColor 18%, transparent\)/s
  )
  assert.doesNotMatch(styles, /--nextra-border/)
  assert.doesNotMatch(styles, /--nextra-primary;/)
})

test('comment field appears before the commenter name field', async () => {
  const comments = await readFile(
    new URL('../_components/question-comments.tsx', import.meta.url),
    'utf8'
  )

  const formStart = comments.indexOf('<form className="question-comments-form"')
  const commentField = comments.indexOf('name="body"', formStart)
  const nameField = comments.indexOf('name="commenterName"', formStart)

  assert.ok(formStart >= 0)
  assert.ok(commentField > formStart)
  assert.ok(nameField > commentField)
})

test('comment and commenter name remain required without a visible asterisk', async () => {
  const comments = await readFile(
    new URL('../_components/question-comments.tsx', import.meta.url),
    'utf8'
  )

  assert.match(
    comments,
    /<textarea[\s\S]*?placeholder="ความคิดเห็น"[\s\S]*?required/
  )
  assert.match(
    comments,
    /<input[\s\S]*?placeholder="ชื่อผู้แสดงความเห็น"[\s\S]*?required/
  )
  assert.doesNotMatch(comments, /question-comments-placeholder|aria-hidden="true">\*</)
})

test('comment form and comment history have distinct spacing without an empty status gap', async () => {
  const styles = await readFile(
    new URL('../../../globals.css', import.meta.url),
    'utf8'
  )

  assert.match(
    styles,
    /\.question-comments-list\s*\{[^}]*margin-top:\s*1\.5rem/s
  )
  assert.match(
    styles,
    /\.question-comments-status:empty\s*\{[^}]*display:\s*none/s
  )
})

test('comment text appears before subdued author and date metadata', async () => {
  const comments = await readFile(
    new URL('../_components/question-comments.tsx', import.meta.url),
    'utf8'
  )

  const cardStart = comments.indexOf('<article className="question-comment"')
  const body = comments.indexOf('<p>{comment.body}</p>', cardStart)
  const metadata = comments.indexOf(
    '<footer className="question-comment-meta">',
    cardStart
  )

  assert.ok(cardStart >= 0)
  assert.ok(body > cardStart)
  assert.ok(metadata > body)
  assert.match(comments, /className="question-comment-author"/)
  assert.doesNotMatch(comments, /<strong>\{comment\.commenterName\}<\/strong>/)
})
