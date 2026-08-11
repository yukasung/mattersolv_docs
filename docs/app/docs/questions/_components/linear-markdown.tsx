import type { ReactNode } from 'react'
import {
  displayHeading,
  omitDecisionQuestionSection
} from '../_lib/meeting-content'

export { displayHeading } from '../_lib/meeting-content'

function inline(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
  return tokens.map((token, index) => {
    const bold = token.match(/^\*\*(.+)\*\*$/)
    if (bold?.[1]) return <strong key={index}>{bold[1]}</strong>

    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link?.[1] && link[2]) {
      return (
        <a key={index} href={link[2]} target="_blank" rel="noreferrer">
          {link[1]}
        </a>
      )
    }
    return token
  })
}

export function LinearMarkdown({ content }: { content: string }) {
  const normalizedContent = content.replace(/<issue[^>]*>(.*?)<\/issue>/g, '$1')
  const lines = omitDecisionQuestionSection(normalizedContent).split('\n')
  const blocks: ReactNode[] = []
  let paragraph: string[] = []
  let list: string[] = []
  let listIsChoice = false

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(<p key={`p-${blocks.length}`}>{inline(paragraph.join(' '))}</p>)
      paragraph = []
    }
  }
  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul
          className={listIsChoice ? 'linear-choice-list' : undefined}
          key={`ul-${blocks.length}`}
        >
          {list.map((item, index) => (
            <li key={index}>
              {listIsChoice ? (
                <label>
                  <input type="checkbox" />
                  {inline(item)}
                </label>
              ) : (
                inline(item)
              )}
            </li>
          ))}
        </ul>
      )
      list = []
      listIsChoice = false
    }
  }

  for (const line of lines) {
    const heading = line.match(/^(#{2,4})\s+(.+)$/)
    const bullet = line.match(/^\s*[*-]\s+(.+)$/)

    if (heading?.[2]) {
      flushParagraph()
      flushList()
      const level = heading[1]?.length ?? 2
      const label = displayHeading(heading[2])
      listIsChoice = heading[2].trim() === 'ตัวเลือก'
      if (level === 2) blocks.push(<h2 key={`h-${blocks.length}`}>{inline(label)}</h2>)
      else if (level === 3) blocks.push(<h3 key={`h-${blocks.length}`}>{inline(label)}</h3>)
      else blocks.push(<h4 key={`h-${blocks.length}`}>{inline(label)}</h4>)
    } else if (bullet?.[1]) {
      flushParagraph()
      list.push(bullet[1])
    } else if (!line.trim()) {
      flushParagraph()
      flushList()
    } else {
      flushList()
      paragraph.push(line.trim())
    }
  }
  flushParagraph()
  flushList()

  return <div className="linear-description">{blocks}</div>
}
