import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const moduleIds = [
  'clients',
  'matters',
  'documents',
  'quotations',
  'calendar',
  'tasks',
  'billing',
  'finance',
  'hr',
  'reports',
  'administration'
] as const

test('every module page renders direct links to its clarification questions', async () => {
  for (const moduleId of moduleIds) {
    const page = await readFile(
      new URL(`../../modules/${moduleId}/page.mdx`, import.meta.url),
      'utf8'
    )
    assert.match(page, /import \{ ModuleQuestionLinks \}/)
    assert.match(page, new RegExp(`<ModuleQuestionLinks module="${moduleId}"`))
  }
})

test('package exposes a read-only question snapshot verification command', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../../../../package.json', import.meta.url), 'utf8')
  ) as { scripts?: Record<string, string> }

  assert.equal(
    packageJson.scripts?.['questions:verify'],
    'node scripts/verify-question-snapshot.mjs'
  )
})
