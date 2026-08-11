'use client'

import { useEffect, useState } from 'react'

import type { QuestionComment } from '../_lib/comments.ts'

const COMMENTER_NAME_STORAGE_KEY = 'mattersolv.commenter-name'

function formatCommentDate(date: string): string {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok'
  }).format(new Date(date))
}

export function QuestionComments({
  issueId,
  onCommentPresenceChange
}: {
  issueId: string
  onCommentPresenceChange: (hasComments: boolean) => void
}) {
  const [comments, setComments] = useState<QuestionComment[]>([])
  const [commenterName, setCommenterName] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    setCommenterName(localStorage.getItem(COMMENTER_NAME_STORAGE_KEY) ?? '')
    onCommentPresenceChange(false)

    void fetch(`/api/question-comments?issueId=${encodeURIComponent(issueId)}`)
      .then(async (response) => {
        const payload = (await response.json()) as {
          comments?: QuestionComment[]
          error?: string
        }
        if (!response.ok) {
          throw new Error(payload.error ?? 'ไม่สามารถโหลดความคิดเห็นได้')
        }
        setComments(payload.comments ?? [])
        onCommentPresenceChange(Boolean(payload.comments?.length))
      })
      .catch((error: unknown) => {
        setStatus(error instanceof Error ? error.message : 'ไม่สามารถโหลดความคิดเห็นได้')
      })
  }, [issueId, onCommentPresenceChange])

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('')

    setIsSending(true)

    try {
      const response = await fetch('/api/question-comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ issueId, commenterName, body })
      })
      const payload = (await response.json()) as {
        comment?: QuestionComment
        error?: string
      }

      if (!response.ok || !payload.comment) {
        throw new Error(payload.error ?? 'ไม่สามารถส่งความคิดเห็นได้')
      }

      localStorage.setItem(COMMENTER_NAME_STORAGE_KEY, commenterName.trim())
      setComments((current) => [payload.comment!, ...current])
      onCommentPresenceChange(true)
      setBody('')
      setStatus('บันทึกความคิดเห็นแล้ว')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'ไม่สามารถส่งความคิดเห็นได้')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section className="question-comments" aria-labelledby="question-comments-heading">
      <h2 id="question-comments-heading">Comment & Answer</h2>

      <form className="question-comments-form" onSubmit={submitComment}>
        <textarea
          aria-label="ความคิดเห็น"
          name="body"
          placeholder="ความคิดเห็น"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={4000}
          rows={5}
          required
        />
        <input
          aria-label="ชื่อผู้แสดงความเห็น"
          name="commenterName"
          placeholder="ชื่อผู้แสดงความเห็น"
          value={commenterName}
          onChange={(event) => setCommenterName(event.target.value)}
          maxLength={120}
          required
        />
        <div className="question-comments-actions">
          <button type="submit" disabled={isSending}>
            {isSending ? 'กำลังส่งความคิดเห็น…' : 'ส่งความคิดเห็น'}
          </button>
          <p className="question-comments-status" aria-live="polite">
            {status}
          </p>
        </div>
      </form>

      <div className="question-comments-list">
        {comments.length === 0 ? (
          <p>ยังไม่มีความคิดเห็น</p>
        ) : (
          comments.map((comment) => (
            <article className="question-comment" key={comment.id}>
              <p>{comment.body}</p>
              <footer className="question-comment-meta">
                <span className="question-comment-author">
                  {comment.commenterName}
                </span>
                <time dateTime={comment.createdAt}>
                  {formatCommentDate(comment.createdAt)}
                </time>
              </footer>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
