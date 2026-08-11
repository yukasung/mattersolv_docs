# Question Detail Deduplication Design

## Goal

Simplify every question-detail page by removing information that repeats the
decision prompt or only instructs an editor how to record a response.

## Design

Modify `docs/app/docs/questions/_components/question-detail.tsx` only.

- Remove the `<h1>` that renders `question.title` beneath the issue ID.
- Remove the conditional `question-answer-help` aside, including its
  “บันทึกข้อสรุปหลังประชุม” heading and chat instruction.
- Keep the issue ID, answer-status badge, metadata, “คำถามที่ต้องตัดสินใจ”
  aside, Linear source content, related-module metadata, and source link.

The question title remains in the underlying snapshot and list views for
searching and navigation. The decision prompt remains the single prominent
question on detail pages when it is available.

## Verification

- Confirm `question-detail.tsx` no longer renders `question.title` in an
  `<h1>` or the `question-answer-help` aside.
- Run the question test suite and the production build.
- Open a question detail page with an unanswered question and confirm the
  duplicate title and response-recording aside are absent while the decision
  prompt remains visible.
