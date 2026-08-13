import { MODULES } from './modules.ts'

const meetingHeadings: Record<string, string> = {
  'เหตุผลที่ต้องสอบถาม': 'ทำไมต้องตัดสินใจ',
  คำถาม: 'คำถามที่ต้องตัดสินใจ',
  ตัวเลือก: 'ทางเลือกที่ควรพิจารณา',
  ผลกระทบ: 'ผลต่อระบบ',
  ที่มา: 'ข้อมูลอ้างอิง'
}

export function displayHeading(heading: string) {
  return meetingHeadings[heading.trim()] ?? heading
}

export function linkInternalDocReferences(content: string) {
  return content.replace(
    /docs\/app\/docs\/modules\/([a-z-]+)\/page\.mdx(?:\s+บรรทัด\s+\d+(?:\s+และ\s+\d+)*)?/g,
    (reference, moduleId: string) => {
      const module = MODULES.find(({ id }) => id === moduleId)

      return module?.href
        ? `[โมดูล ${module.label}](${module.href})`
        : reference
    }
  )
}

export function extractMeetingQuestion(content: string) {
  const lines = content.replace(/<issue[^>]*>(.*?)<\/issue>/gs, '$1').split('\n')
  const questionStart = lines.findIndex((line) => /^##\s+คำถาม\s*$/.test(line))
  if (questionStart === -1) return undefined

  const questionBody = lines.slice(questionStart + 1)
  const nextHeading = questionBody.findIndex((line) => /^#{2,4}\s+/.test(line))
  return (nextHeading === -1 ? questionBody : questionBody.slice(0, nextHeading))
    .map((line) => line.replace(/^\s*[*-]\s+/, '').trim())
    .find(Boolean)
}

export function omitDecisionQuestionSection(content: string) {
  const lines = content.split('\n')
  const questionStart = lines.findIndex((line) => /^##\s+คำถาม\s*$/.test(line))

  if (questionStart === -1) return content

  const followingLines = lines.slice(questionStart + 1)
  const nextHeading = followingLines.findIndex((line) => /^#{2,4}\s+/.test(line))
  const retainedLines = nextHeading === -1
    ? lines.slice(0, questionStart)
    : [...lines.slice(0, questionStart), ...followingLines.slice(nextHeading)]

  return retainedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
