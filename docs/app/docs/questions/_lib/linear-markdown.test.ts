import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { displayHeading, extractMeetingQuestion } from './meeting-content.ts'

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

test('Linear description styles preserve heading hierarchy and visible bullet lists', async () => {
  const styles = await readFile(new URL('../../../globals.css', import.meta.url), 'utf8')

  assert.match(styles, /\.linear-description h2\s*\{[^}]*margin-top:/s)
  assert.match(styles, /\.linear-description ul\s*\{[^}]*list-style:\s*disc/s)
  assert.match(styles, /\.linear-description ul\s*\{[^}]*padding-inline-start:/s)
})
