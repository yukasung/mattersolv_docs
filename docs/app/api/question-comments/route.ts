import {
  CommentConfigurationError,
  CommentRateLimitError,
  createQuestionComment,
  getCommentsForIssue,
  validateCreateQuestionComment
} from '../../docs/questions/_lib/comments.ts'

export const dynamic = 'force-dynamic'

const VALIDATION_ERROR = 'กรุณากรอกชื่อผู้แสดงความคิดเห็นและความคิดเห็นให้ครบถ้วน'

function getIpAddress(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

export async function GET(request: Request) {
  try {
    const issueId = new URL(request.url).searchParams.get('issueId') ?? ''
    const comments = await getCommentsForIssue(issueId)
    return Response.json({ comments })
  } catch (error) {
    if (error instanceof CommentConfigurationError) {
      return Response.json(
        { error: 'ระบบความคิดเห็นยังไม่พร้อมใช้งาน' },
        { status: 503 }
      )
    }

    return Response.json({ error: 'ไม่พบคำถามที่ระบุ' }, { status: 400 })
  }
}

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json()
    if (!payload || typeof payload !== 'object') {
      return Response.json({ error: VALIDATION_ERROR }, { status: 400 })
    }

    const input = validateCreateQuestionComment(
      payload as { issueId: string; commenterName: string; body: string }
    )
    const ipAddress = getIpAddress(request)
    const comment = await createQuestionComment(input, ipAddress)
    return Response.json({ comment }, { status: 201 })
  } catch (error) {
    if (error instanceof CommentRateLimitError) {
      return Response.json(
        { error: 'ส่งความคิดเห็นบ่อยเกินไป กรุณาลองใหม่อีกครั้งภายหลัง' },
        { status: 429 }
      )
    }

    if (error instanceof CommentConfigurationError) {
      return Response.json(
        { error: 'ระบบความคิดเห็นยังไม่พร้อมใช้งาน' },
        { status: 503 }
      )
    }

    if (error instanceof SyntaxError || error instanceof Error) {
      return Response.json({ error: VALIDATION_ERROR }, { status: 400 })
    }

    return Response.json({ error: VALIDATION_ERROR }, { status: 400 })
  }
}
