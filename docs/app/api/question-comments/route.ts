import {
  CommentConfigurationError,
  CommentRateLimitError,
  createQuestionComment,
  getCommentsForIssue,
  validateCreateQuestionComment
} from '../../docs/questions/_lib/comments.ts'

export const dynamic = 'force-dynamic'

const VALIDATION_ERROR = 'กรุณากรอกชื่อทนายและความเห็นให้ครบถ้วน'

function getIpAddress(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

async function verifyTurnstile(token: unknown, ipAddress: string): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY

  if (typeof token !== 'string' || !token || !secret) {
    throw new CommentConfigurationError('Turnstile is not configured')
  }

  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: ipAddress
  })
  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    { method: 'POST', body }
  )

  if (!response.ok) {
    throw new CommentConfigurationError('Turnstile is unavailable')
  }

  const result = (await response.json()) as { success?: boolean }
  if (!result.success) {
    throw new Error('Invalid Turnstile token')
  }
}

export async function GET(request: Request) {
  try {
    const issueId = new URL(request.url).searchParams.get('issueId') ?? ''
    const comments = await getCommentsForIssue(issueId)
    return Response.json({ comments })
  } catch (error) {
    if (error instanceof CommentConfigurationError) {
      return Response.json(
        { error: 'ระบบความเห็นยังไม่พร้อมใช้งาน' },
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
      payload as { issueId: string; lawyerName: string; body: string }
    )
    const ipAddress = getIpAddress(request)
    await verifyTurnstile(
      (payload as { turnstileToken?: unknown }).turnstileToken,
      ipAddress
    )
    const comment = await createQuestionComment(input, ipAddress)
    return Response.json({ comment }, { status: 201 })
  } catch (error) {
    if (error instanceof CommentRateLimitError) {
      return Response.json(
        { error: 'ส่งความเห็นบ่อยเกินไป กรุณาลองใหม่อีกครั้งภายหลัง' },
        { status: 429 }
      )
    }

    if (error instanceof CommentConfigurationError) {
      return Response.json(
        { error: 'ระบบความเห็นยังไม่พร้อมใช้งาน' },
        { status: 503 }
      )
    }

    if (error instanceof SyntaxError || error instanceof Error) {
      return Response.json({ error: VALIDATION_ERROR }, { status: 400 })
    }

    return Response.json({ error: VALIDATION_ERROR }, { status: 400 })
  }
}
