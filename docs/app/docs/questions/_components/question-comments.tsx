'use client'

import { useEffect, useRef, useState } from 'react'

import type { QuestionComment } from '../_lib/comments.ts'

const LAWYER_NAME_STORAGE_KEY = 'mattersolv.lawyer-name'
const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void }
  ) => string
  reset: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

function formatCommentDate(date: string): string {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok'
  }).format(new Date(date))
}

function getTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile)
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_SCRIPT_URL}"]`
    )
    const script = existingScript ?? document.createElement('script')

    const ready = () => {
      if (window.turnstile) {
        resolve(window.turnstile)
      } else {
        reject(new Error('Turnstile unavailable'))
      }
    }

    script.addEventListener('load', ready, { once: true })
    script.addEventListener('error', () => reject(new Error('Turnstile unavailable')), {
      once: true
    })

    if (!existingScript) {
      script.src = TURNSTILE_SCRIPT_URL
      script.async = true
      script.defer = true
      document.head.append(script)
    }
  })
}

export function QuestionComments({ issueId }: { issueId: string }) {
  const [comments, setComments] = useState<QuestionComment[]>([])
  const [lawyerName, setLawyerName] = useState('')
  const [body, setBody] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [status, setStatus] = useState('')
  const [isSending, setIsSending] = useState(false)
  const turnstileElement = useRef<HTMLDivElement>(null)
  const turnstileWidgetId = useRef<string | undefined>(undefined)

  useEffect(() => {
    setLawyerName(localStorage.getItem('mattersolv.lawyer-name') ?? '')

    void fetch(`/api/question-comments?issueId=${encodeURIComponent(issueId)}`)
      .then(async (response) => {
        const payload = (await response.json()) as {
          comments?: QuestionComment[]
          error?: string
        }
        if (!response.ok) {
          throw new Error(payload.error ?? 'ไม่สามารถโหลดความเห็นได้')
        }
        setComments(payload.comments ?? [])
      })
      .catch((error: unknown) => {
        setStatus(error instanceof Error ? error.message : 'ไม่สามารถโหลดความเห็นได้')
      })
  }, [issueId])

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    const element = turnstileElement.current

    if (!siteKey || !element) {
      setStatus('ระบบตรวจสอบก่อนส่งความเห็นยังไม่พร้อมใช้งาน')
      return
    }

    void getTurnstile()
      .then((turnstile) => {
        turnstileWidgetId.current = turnstile.render(element, {
          sitekey: siteKey,
          callback: setTurnstileToken,
          'expired-callback': () => setTurnstileToken('')
        })
      })
      .catch(() => setStatus('ไม่สามารถเตรียมระบบตรวจสอบก่อนส่งความเห็นได้'))
  }, [])

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('')

    if (!turnstileToken) {
      setStatus('กรุณายืนยันการตรวจสอบก่อนส่งความเห็น')
      return
    }

    setIsSending(true)

    try {
      const response = await fetch('/api/question-comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ issueId, lawyerName, body, turnstileToken })
      })
      const payload = (await response.json()) as {
        comment?: QuestionComment
        error?: string
      }

      if (!response.ok || !payload.comment) {
        throw new Error(payload.error ?? 'ไม่สามารถส่งความเห็นได้')
      }

      localStorage.setItem('mattersolv.lawyer-name', lawyerName.trim())
      setComments((current) => [payload.comment!, ...current])
      setBody('')
      setTurnstileToken('')
      if (turnstileWidgetId.current && window.turnstile) {
        window.turnstile.reset(turnstileWidgetId.current)
      }
      setStatus('บันทึกความเห็นแล้ว')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'ไม่สามารถส่งความเห็นได้')
    } finally {
      setIsSending(false)
    }
  }

  function clearSavedLawyerName() {
    localStorage.removeItem('mattersolv.lawyer-name')
    setLawyerName('')
    setStatus('ล้างชื่อที่จำไว้แล้ว')
  }

  return (
    <section className="question-comments" aria-labelledby="question-comments-heading">
      <h2 id="question-comments-heading">ความเห็นจากทนาย</h2>

      <form className="question-comments-form" onSubmit={submitComment}>
        <label>
          <span>ชื่อทนาย</span>
          <input
            name="lawyerName"
            value={lawyerName}
            onChange={(event) => setLawyerName(event.target.value)}
            maxLength={120}
            required
          />
        </label>
        <button type="button" className="question-comments-clear" onClick={clearSavedLawyerName}>
          ล้างชื่อที่จำไว้
        </button>
        <label>
          <span>ความเห็น</span>
          <textarea
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={4000}
            rows={5}
            required
          />
        </label>
        <div ref={turnstileElement} />
        <button type="submit" disabled={isSending}>
          {isSending ? 'กำลังส่งความเห็น…' : 'ส่งความเห็น'}
        </button>
        <p className="question-comments-status" aria-live="polite">
          {status}
        </p>
      </form>

      <div className="question-comments-list">
        {comments.length === 0 ? (
          <p>ยังไม่มีความเห็น</p>
        ) : (
          comments.map((comment) => (
            <article className="question-comment" key={comment.id}>
              <header>
                <strong>{comment.lawyerName}</strong>
                <time dateTime={comment.createdAt}>
                  {formatCommentDate(comment.createdAt)}
                </time>
              </header>
              <p>{comment.body}</p>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
