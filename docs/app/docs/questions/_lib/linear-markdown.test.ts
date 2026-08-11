import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  displayHeading,
  extractMeetingQuestion,
  omitDecisionQuestionSection
} from './meeting-content.ts'

test('extractMeetingQuestion takes the decision question from a Linear description', () => {
  const content = `## เหตุผลที่ต้องสอบถาม\nรายละเอียด\n\n## คำถาม\nลูกความจะเห็นข้อมูลใดได้บ้างเมื่อเข้าสู่ระบบด้วยตนเอง?\n\n## ตัวเลือก\n- เห็นเฉพาะสถานะ`

  assert.equal(
    extractMeetingQuestion(content),
    'ลูกความจะเห็นข้อมูลใดได้บ้างเมื่อเข้าสู่ระบบด้วยตนเอง?'
  )
})

test('displayHeading uses concise Thai labels for the meeting detail', () => {
  assert.equal(displayHeading('เหตุผลที่ต้องสอบถาม'), 'ทำไมต้องตัดสินใจ')
  assert.equal(displayHeading('คำถาม'), 'คำถามที่ต้องตัดสินใจ')
  assert.equal(displayHeading('ตัวเลือก'), 'ทางเลือกที่ควรพิจารณา')
  assert.equal(displayHeading('ผลกระทบ'), 'ผลต่อระบบ')
  assert.equal(displayHeading('ที่มา'), 'ข้อมูลอ้างอิง')
})

test('omitDecisionQuestionSection removes only the repeated decision-question section', () => {
  const content = `## เหตุผลที่ต้องสอบถาม
รายละเอียด

## คำถาม
ลูกความเห็นข้อมูลอะไรได้บ้าง?

## ตัวเลือก
* เห็นสถานะคดี`

  assert.equal(
    omitDecisionQuestionSection(content),
    `## เหตุผลที่ต้องสอบถาม
รายละเอียด

## ตัวเลือก
* เห็นสถานะคดี`
  )
})

test('Linear description styles preserve heading hierarchy and visible bullet lists', async () => {
  const styles = await readFile(new URL('../../../globals.css', import.meta.url), 'utf8')

  assert.match(styles, /\.linear-description h2\s*\{[^}]*margin-top:/s)
  assert.match(styles, /\.linear-description ul\s*\{[^}]*list-style:\s*disc/s)
  assert.match(styles, /\.linear-description ul\s*\{[^}]*padding-inline-start:/s)
})

test('choice sections with multiple items render as numbered lists without checkboxes', async () => {
  const [component, styles] = await Promise.all([
    readFile(
      new URL('../_components/linear-markdown.tsx', import.meta.url),
      'utf8'
    ),
    readFile(new URL('../../../globals.css', import.meta.url), 'utf8')
  ])

  assert.match(component, /let listIsChoice = false/)
  assert.match(component, /listIsChoice && list\.length > 1/)
  assert.match(component, /<ol key=\{`ol-\$\{blocks\.length\}`\}>/)
  assert.doesNotMatch(component, /type="checkbox"/)
  assert.match(
    styles,
    /\.linear-description ol\s*\{[^}]*list-style:\s*decimal/s
  )
})
