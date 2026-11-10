import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { createUserDataDir, launchApp, openRoute, typeInEditor } from '../../tests/e2e/app'

const OUT_DIR = path.resolve(__dirname, '../../docs/screenshots')
const DATA_DIR = path.resolve(__dirname, '../../data/exercises')
const USERNAME = 'ada'
const PASSWORD = 'lovelace42'

interface RawExercise {
  id: string
  type: string
  solution?: string
  correct?: number
  answers?: string[]
  parts?: string[]
  distractors?: string[]
  answer?: Record<string, string>
}

const exercises = new Map<string, RawExercise>()
for (const level of fs.readdirSync(DATA_DIR)) {
  for (const file of fs.readdirSync(path.join(DATA_DIR, level))) {
    const content = JSON.parse(fs.readFileSync(path.join(DATA_DIR, level, file), 'utf8')) as { exercises: RawExercise[] }
    for (const ex of content.exercises) exercises.set(ex.id, ex)
  }
}

function sqlAnswer(id: string) {
  const ex = exercises.get(id)
  if (!ex?.solution) throw new Error(`${id} has no SQL solution`)
  return { kind: 'sql', sql: ex.solution }
}

function correctAnswer(id: string) {
  const ex = exercises.get(id)!
  switch (ex.type) {
    case 'choose_query':
    case 'explain_query':
      return { kind: 'option', option: ex.correct }
    case 'fill_blank':
      return { kind: 'blanks', blanks: ex.answers }
    case 'join_builder':
      return { kind: 'join', ...ex.answer }
    default:
      return sqlAnswer(id)
  }
}

async function ipc<T>(page: Page, channel: string, payload?: unknown): Promise<T> {
  const envelope = (await page.evaluate(
    ([c, p]) => (globalThis as unknown as { sqlMastery: { invoke: (c: string, p: unknown) => Promise<unknown> } }).sqlMastery.invoke(c, p),
    [channel, payload] as const
  )) as { ok: boolean; data: T; error?: { message: string } }
  if (!envelope.ok) throw new Error(`${channel}: ${envelope.error?.message}`)
  return envelope.data
}

async function shot(page: Page, name: string, settleMs = 900): Promise<void> {
  await page.waitForTimeout(settleMs)
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), scale: 'css' })
}

async function submit(page: Page, exerciseId: string, answer: unknown, assessmentId?: number): Promise<void> {
  await ipc(page, 'exercises:submit', { exerciseId, answer, durationMs: 45_000 + exerciseId.length * 1500, assessmentId })
}

async function assessmentAnswer(page: Page, id: string): Promise<unknown> {
  const ex = exercises.get(id)!
  if (ex.type === 'predict_result') return { kind: 'value', value: '0' }
  if (ex.type === 'order_parts') {
    const pub = await ipc<{ content: { pieces: string[] } }>(page, 'exercises:get', { exerciseId: id })
    return { kind: 'parts', parts: ex.parts!.map((part) => pub.content.pieces.indexOf(part)) }
  }
  return correctAnswer(id)
}

test('capture documentation screenshots', async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const { app, page, errors } = await launchApp(createUserDataDir())
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0]
    win.setContentSize(1440, 900)
    win.center()
  })

  await page.getByRole('link', { name: 'Sign up' }).click()
  await page.getByLabel('Username', { exact: true }).fill(USERNAME)
  await page.getByLabel('Email').fill(`${USERNAME}@example.com`)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Repeat password').fill(PASSWORD)
  await shot(page, 'register')
  await page.getByRole('button', { name: 'Sign up' }).click()
  await expect(page.getByTestId('recovery-code')).toBeVisible()
  await shot(page, 'recovery-code')
  await page.getByText('I have saved the code').click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByTestId('dashboard-greeting')).toBeVisible()

  const solved = [
    'b-select-01', 'b-select-02', 'b-select-03', 'b-select-04', 'b-select-05',
    'b-from-01', 'b-from-02', 'b-from-03', 'b-where-01', 'b-where-02', 'b-where-03', 'b-where-04',
    'b-distinct-01', 'b-distinct-02', 'b-order-01', 'b-order-02',
    'b-intro-01', 'b-intro-02', 'b-intro-04', 'b-intro-09', 'b-intro-06'
  ]
  await submit(page, 'b-where-05', { kind: 'sql', sql: 'SELECT * FROM employees' })
  await submit(page, 'b-where-06', { kind: 'sql', sql: 'SELECT 1' })
  await submit(page, 'b-where-06', { kind: 'sql', sql: 'SELECT 2' })
  await submit(page, 'b-where-06', { kind: 'sql', sql: 'SELECT 3' })
  for (const id of solved) await submit(page, id, correctAnswer(id))
  for (const sql of ['SELECT COUNT(*) FROM customers', 'SELECT country, COUNT(*) FROM customers GROUP BY country']) {
    await ipc(page, 'playground:run', { dataset: 'ecommerce', sql })
  }
  await ipc(page, 'playground:run', { dataset: 'movies', sql: 'SELECT title FROM movies LIMIT 3' })
  for (let i = 0; i < 18; i += 1) await ipc(page, 'activity:heartbeat', { seconds: 120 })

  await openRoute(page, '#/')
  await page.reload()
  await expect(page.getByTestId('dashboard-greeting')).toBeVisible()
  await shot(page, 'dashboard', 2500)

  await openRoute(page, '#/learn')
  await expect(page.getByRole('heading', { name: 'Learning path' }).first()).toBeVisible()
  await shot(page, 'learning-path')

  await openRoute(page, '#/learn/beginner.intro')
  await expect(page.getByRole('heading', { name: 'What is SQL' }).first()).toBeVisible()
  await shot(page, 'module')

  await openRoute(page, '#/exercises/b-intro-08')
  await expect(page.getByTestId('exercise-title')).toHaveText('Directors')
  await typeInEditor(page, 'SELECT name, country\nFROM directors;')
  await page.getByTestId('submit-button').click()
  await expect(page.getByTestId('grade-correct')).toBeVisible()
  await shot(page, 'exercise-solved')

  await openRoute(page, '#/exercises/b-intro-03')
  await expect(page.getByTestId('exercise-title')).toHaveText('Read the query')
  await page.getByTestId(`option-${exercises.get('b-intro-03')!.correct}`).click()
  await shot(page, 'exercise-explain')

  await openRoute(page, '#/exercises/b-select-04')
  await expect(page.getByTestId('exercise-title')).toHaveText('Stock value')
  await typeInEditor(page, 'DROP TABLE products;')
  await page.getByTestId('run-button').click()
  await expect(page.getByTestId('engine-error')).toBeVisible()
  await shot(page, 'exercise-guard')

  await openRoute(page, '#/exercises')
  await expect(page.getByTestId('catalog-count')).toContainText('Found')
  await shot(page, 'catalog')

  await openRoute(page, '#/practice')
  await expect(page.getByRole('heading', { name: 'Practice' }).first()).toBeVisible()
  await shot(page, 'practice')

  await openRoute(page, '#/learn/beginner.intro')
  await expect(page.getByRole('heading', { name: 'What is SQL' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.getByTestId('finish-assessment')).toBeVisible()
  const assessmentId = Number(new URL(page.url()).hash.split('/').pop())
  const { exerciseIds } = await ipc<{ exerciseIds: string[] }>(page, 'assessments:get', { assessmentId })
  const lastId = exerciseIds[exerciseIds.length - 1]
  for (const id of exerciseIds.slice(0, -1)) await submit(page, id, await assessmentAnswer(page, id), assessmentId)
  await page.reload()
  await expect(page.getByTestId('finish-assessment')).toBeVisible()
  await shot(page, 'module-test')
  await submit(page, lastId, await assessmentAnswer(page, lastId), assessmentId)
  await page.reload()
  await expect(page.getByTestId('finish-assessment')).toBeVisible()
  await page.getByTestId('finish-assessment').click()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByTestId('assessment-result')).toBeVisible()
  await shot(page, 'module-test-result')

  await openRoute(page, '#/playground')
  await typeInEditor(page, 'SELECT c.name AS category,\n       COUNT(*) AS products,\n       ROUND(AVG(p.price), 2) AS avg_price\nFROM products p\nJOIN categories c ON c.id = p.category_id\nGROUP BY c.name\nORDER BY products DESC;')
  await page.getByTestId('playground-run').click()
  await expect(page.getByTestId('result-table')).toBeVisible()
  await shot(page, 'playground')

  await openRoute(page, '#/analytics')
  await expect(page.getByRole('heading', { name: 'Analytics' }).first()).toBeVisible()
  await shot(page, 'analytics', 2500)

  await openRoute(page, '#/achievements')
  await expect(page.getByRole('heading', { name: 'Achievements' }).first()).toBeVisible()
  await shot(page, 'achievements')

  await openRoute(page, '#/profile')
  await expect(page.getByTestId('profile-language')).toBeVisible()
  await shot(page, 'profile')

  await page.getByTestId('profile-language').getByRole('radio', { name: 'Русский' }).click()
  await openRoute(page, '#/learn')
  await expect(page.getByRole('link', { name: 'Главная' })).toBeVisible()
  await shot(page, 'learning-path-ru')
  await page.getByRole('radio', { name: 'English' }).click()
  await expect(page.getByRole('heading', { name: 'Learning path' }).first()).toBeVisible()

  await page.getByTestId('user-menu').click()
  await page.getByTestId('logout').click()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await shot(page, 'sign-in')

  expect(errors).toEqual([])
  await app.close()
})
