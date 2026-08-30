import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

async function exists(file: URL) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

test('questions routes use MDX shells so Nextra supplies the documentation layout', async () => {
  const overviewMdx = new URL('../page.mdx', import.meta.url)
  const detailMdx = new URL('../[issueId]/page.mdx', import.meta.url)

  assert.equal(await exists(overviewMdx), true)
  assert.equal(await exists(detailMdx), true)
  assert.equal(await exists(new URL('../page.tsx', import.meta.url)), false)
  assert.equal(await exists(new URL('../[issueId]/page.tsx', import.meta.url)), false)

  const [overview, detail] = await Promise.all([
    readFile(overviewMdx, 'utf8'),
    readFile(detailMdx, 'utf8')
  ])

  assert.match(overview, /<QuestionsHub\s*\/>/)
  assert.match(detail, /<QuestionDetail\s*\/>/)
})

test('questions is the final item in the documentation sidebar', async () => {
  const meta = await readFile(
    new URL('../../../_meta.global.tsx', import.meta.url),
    'utf8'
  )

  const apiItem = meta.indexOf("api: { title: 'API' }")
  const questionsItem = meta.indexOf("questions: { title: 'Questions' }")

  assert.ok(apiItem >= 0)
  assert.ok(questionsItem > apiItem)
})

test('root layout lets Nextra Head own the document head', async () => {
  const layout = await readFile(
    new URL('../../../layout.tsx', import.meta.url),
    'utf8'
  )

  assert.match(layout, /<Head \/>/)
  assert.doesNotMatch(layout, /<head>/)
})
