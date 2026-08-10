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
