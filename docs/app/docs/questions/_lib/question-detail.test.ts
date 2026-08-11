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

test('question detail provides immutable lawyer comments with a remembered name', async () => {
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

  assert.match(detail, /<QuestionComments issueId=\{question\.id\} \/>/)
  assert.match(comments, /localStorage\.getItem\('mattersolv\.lawyer-name'\)/)
  assert.match(comments, /localStorage\.setItem\('mattersolv\.lawyer-name'/)
  assert.match(comments, /localStorage\.removeItem\('mattersolv\.lawyer-name'\)/)
  assert.doesNotMatch(comments, /dangerouslySetInnerHTML/)
})

test('lawyer comment inputs have visible form controls without undefined Nextra colors', async () => {
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
