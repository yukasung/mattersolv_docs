import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getLatestCommentDates,
  validateCreateQuestionComment
} from './comments.ts'
import { POST } from '../../../api/question-comments/route.ts'

test('validates and normalizes a lawyer comment', () => {
  assert.deepEqual(
    validateCreateQuestionComment({
      issueId: 'dev-187',
      lawyerName: '  ทนายสมชาย  ',
      body: '  ควรเก็บ log 7 ปี  '
    }),
    {
      issueId: 'DEV-187',
      lawyerName: 'ทนายสมชาย',
      body: 'ควรเก็บ log 7 ปี'
    }
  )
})

test('rejects invalid or blank lawyer comments', () => {
  for (const input of [
    { issueId: '', lawyerName: 'ทนายสมชาย', body: 'ความเห็น' },
    { issueId: 'DEV-187', lawyerName: '', body: 'ความเห็น' },
    { issueId: 'DEV-187', lawyerName: 'ทนายสมชาย', body: '' },
    { issueId: 'not-an-issue', lawyerName: 'ทนายสมชาย', body: 'ความเห็น' }
  ]) {
    assert.throws(() => validateCreateQuestionComment(input))
  }
})

test('uses the newest timestamp for each issue', () => {
  assert.deepEqual(
    getLatestCommentDates([
      { issueId: 'DEV-187', createdAt: '2026-08-11T02:00:00.000Z' },
      { issueId: 'DEV-187', createdAt: '2026-08-11T05:00:00.000Z' },
      { issueId: 'DEV-168', createdAt: '2026-08-10T01:00:00.000Z' }
    ]),
    {
      'DEV-187': '2026-08-11T05:00:00.000Z',
      'DEV-168': '2026-08-10T01:00:00.000Z'
    }
  )
})

test('returns a client-safe Thai validation error', async () => {
  const response = await POST(
    new Request('https://example.test/api/question-comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ issueId: 'invalid', lawyerName: '', body: '' })
    })
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    error: 'กรุณากรอกชื่อทนายและความเห็นให้ครบถ้วน'
  })
})
