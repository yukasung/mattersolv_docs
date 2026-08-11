# Linear Question Section Deduplication Design

## Goal

Show each decision question once on question-detail pages by retaining the
summary aside and omitting the repeated `## คำถาม` section from rendered Linear
content.

## Design

Modify the `LinearMarkdown` renderer in
`docs/app/docs/questions/_components/linear-markdown.tsx`.

Before rendering blocks, remove the section that begins with an exact
level-two heading `## คำถาม` and ends immediately before the next heading of
level two through four, or at the end of the content. The renderer must retain
all other sections, including the reason, choices, impact, and source
sections. Snapshot data remains unchanged.

The `QuestionDetail` summary aside remains the only detail-page presentation
of the decision-question text.

## Verification

- Add a renderer regression test using content with `## คำถาม` followed by
  another section.
- Verify the rendered output has no decision-question heading or paragraph,
  while the following section remains.
- Run the question test suite and production build.
- Open DEV-168 and confirm the Linear content begins after the summary with
  “ทำไมต้องตัดสินใจ,” followed by the remaining sections.
