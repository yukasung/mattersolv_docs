import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getLatestCommentDates,
  validateCreateQuestionComment
} from './comments.ts'
import { POST } from '../../../api/question-comments/route.ts'

test('validates and normalizes a comment from a commenter', () => {
  assert.deepEqual(
    validateCreateQuestionComment({
      issueId: 'dev-187',
      commenterName: '  สมชาย  ',
      body: '  ควรเก็บ log 7 ปี  '
    }),
    {
      issueId: 'DEV-187',
      commenterName: 'สมชาย',
      body: 'ควรเก็บ log 7 ปี'
    }
  )
})

test('rejects invalid or blank comments', () => {
  for (const input of [
    { issueId: '', commenterName: 'สมชาย', body: 'ความคิดเห็น' },
    { issueId: 'DEV-187', commenterName: '', body: 'ความคิดเห็น' },
    { issueId: 'DEV-187', commenterName: 'สมชาย', body: '' },
    { issueId: 'not-an-issue', commenterName: 'สมชาย', body: 'ความคิดเห็น' }
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
      body: JSON.stringify({ issueId: 'invalid', commenterName: '', body: '' })
    })
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    error: 'กรุณากรอกชื่อผู้แสดงความคิดเห็นและความคิดเห็นให้ครบถ้วน'
  })
})
