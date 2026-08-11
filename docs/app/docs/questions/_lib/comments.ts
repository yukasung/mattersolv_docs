export interface QuestionComment {
  id: string
  issueId: string
  lawyerName: string
  body: string
  createdAt: string
}

export interface CreateQuestionCommentInput {
  issueId: string
  lawyerName: string
  body: string
}

const ISSUE_ID_PATTERN = /^[A-Z]+-\d+$/u
const MAX_LAWYER_NAME_LENGTH = 120
const MAX_COMMENT_BODY_LENGTH = 4_000
const MAX_SUBMISSIONS_PER_WINDOW = 5
const SUBMISSION_WINDOW_MINUTES = 10

export class CommentConfigurationError extends Error {}

export class CommentRateLimitError extends Error {}

let databaseClient: Client | undefined

function getDatabaseClient(): Client {
  if (databaseClient) {
    return databaseClient
  }

  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url || !authToken) {
    throw new CommentConfigurationError('Comment storage is not configured')
  }

  databaseClient = createClient({ url, authToken })
  return databaseClient
}

function normalizeIssueId(issueId: string): string {
  const normalizedIssueId = issueId.trim().toUpperCase()
  if (!ISSUE_ID_PATTERN.test(normalizedIssueId)) {
    throw new Error('Invalid issue ID')
  }
  return normalizedIssueId
}

function getIpHash(ipAddress: string): string {
  const salt = process.env.COMMENT_IP_HASH_SALT
  if (!salt) {
    throw new CommentConfigurationError('Comment IP hashing is not configured')
  }

  return createHash('sha256').update(`${salt}:${ipAddress}`).digest('hex')
}

function rowToComment(row: Record<string, unknown>): QuestionComment {
  return {
    id: String(row.id),
    issueId: String(row.issue_id),
    lawyerName: String(row.lawyer_name),
    body: String(row.body),
    createdAt: String(row.created_at)
  }
}

export function validateCreateQuestionComment(
  input: CreateQuestionCommentInput
): CreateQuestionCommentInput {
  const issueId = normalizeIssueId(input.issueId)
  const lawyerName = input.lawyerName.trim()
  const body = input.body.trim()

  if (!ISSUE_ID_PATTERN.test(issueId)) {
    throw new Error('Invalid issue ID')
  }

  if (!lawyerName || lawyerName.length > MAX_LAWYER_NAME_LENGTH) {
    throw new Error('Invalid lawyer name')
  }

  if (!body || body.length > MAX_COMMENT_BODY_LENGTH) {
    throw new Error('Invalid comment body')
  }

  return { issueId, lawyerName, body }
}

export function isCommentStorageConfigured(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN)
}

export async function getCommentsForIssue(issueId: string): Promise<QuestionComment[]> {
  const normalizedIssueId = normalizeIssueId(issueId)
  const result = await getDatabaseClient().execute({
    sql: `
      SELECT id, issue_id, lawyer_name, body, created_at
      FROM question_comments
      WHERE issue_id = ?
      ORDER BY created_at DESC
    `,
    args: [normalizedIssueId]
  })

  return (result.rows as unknown as Record<string, unknown>[]).map(rowToComment)
}

export async function getLatestCommentDatesForIssues(
  issueIds: string[]
): Promise<Record<string, string>> {
  if (issueIds.length === 0 || !isCommentStorageConfigured()) {
    return {}
  }

  const normalizedIssueIds = issueIds.map(normalizeIssueId)
  const placeholders = normalizedIssueIds.map(() => '?').join(', ')
  const result = await getDatabaseClient().execute({
    sql: `
      SELECT issue_id, MAX(created_at) AS created_at
      FROM question_comments
      WHERE issue_id IN (${placeholders})
      GROUP BY issue_id
    `,
    args: normalizedIssueIds
  })

  return getLatestCommentDates(
    (result.rows as unknown as Record<string, unknown>[]).map((row) => ({
      issueId: String(row.issue_id),
      createdAt: String(row.created_at)
    }))
  )
}

export async function createQuestionComment(
  input: CreateQuestionCommentInput,
  ipAddress: string
): Promise<QuestionComment> {
  const comment = validateCreateQuestionComment(input)
  const client = getDatabaseClient()
  const ipHash = getIpHash(ipAddress)
  const windowStart = new Date(
    Date.now() - SUBMISSION_WINDOW_MINUTES * 60 * 1_000
  ).toISOString()
  const attempts = await client.execute({
    sql: `
      SELECT COUNT(*) AS count
      FROM comment_submission_attempts
      WHERE ip_hash = ? AND created_at >= ?
    `,
    args: [ipHash, windowStart]
  })
  const count = Number(attempts.rows[0]?.count ?? 0)

  if (count >= MAX_SUBMISSIONS_PER_WINDOW) {
    throw new CommentRateLimitError('Too many comment submissions')
  }

  const savedComment: QuestionComment = {
    id: randomUUID(),
    ...comment,
    createdAt: new Date().toISOString()
  }

  await client.batch(
    [
      {
        sql: `
          INSERT INTO question_comments (id, issue_id, lawyer_name, body, created_at)
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [
          savedComment.id,
          savedComment.issueId,
          savedComment.lawyerName,
          savedComment.body,
          savedComment.createdAt
        ]
      },
      {
        sql: `
          INSERT INTO comment_submission_attempts (ip_hash, created_at)
          VALUES (?, ?)
        `,
        args: [ipHash, savedComment.createdAt]
      }
    ],
    'write'
  )

  return savedComment
}

export function getLatestCommentDates(
  comments: Pick<QuestionComment, 'issueId' | 'createdAt'>[]
): Record<string, string> {
  return comments.reduce<Record<string, string>>((latestDates, comment) => {
    const latest = latestDates[comment.issueId]
    if (!latest || latest < comment.createdAt) {
      latestDates[comment.issueId] = comment.createdAt
    }
    return latestDates
  }, {})
}
import { createHash, randomUUID } from 'node:crypto'

import { createClient, type Client } from '@libsql/client'
