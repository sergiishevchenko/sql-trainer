import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { createUserDataDir, launchApp, openRoute, registerUser, typeInEditor } from './app'

function referenceSolution(file: string, id: string): string {
  const content = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/exercises', file), 'utf8')) as {
    exercises: { id: string; solution?: string }[]
  }
  return content.exercises.find((e) => e.id === id)?.solution ?? ''
}

test('register, solve an exercise and keep progress after restart', async () => {
  const userData = createUserDataDir()
  const first = await launchApp(userData)
  const { page } = first

  const recoveryCode = await registerUser(page)
  expect(recoveryCode).toMatch(/^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/)
  await expect(page.getByTestId('dashboard-greeting')).toContainText('alice')
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'test-results/01-dashboard.png' })

  await openRoute(page, '#/exercises/b-select-01')
  await expect(page.getByTestId('exercise-title')).toBeVisible()
  await typeInEditor(page, 'SELECT * FROM products WHERE 1 = 0')
  await page.getByTestId('run-button').click()
  await expect(page.getByTestId('result-table')).toBeVisible()

  await page.getByTestId('submit-button').click()
  await expect(page.getByTestId('grade-incorrect')).toBeVisible()
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'test-results/02-incorrect.png' })

  await page.getByTestId('hints-tab').click()
  await page.getByTestId('show-hint').click()
  await expect(page.getByTestId('hint-0')).toBeVisible()

  await typeInEditor(page, referenceSolution('beginner/02-select.json', 'b-select-01'))
  await page.getByTestId('submit-button').click()
  await expect(page.getByTestId('grade-correct')).toBeVisible()
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'test-results/03-correct.png' })

  expect(first.errors).toEqual([])
  await first.app.close()

  const second = await launchApp(userData)
  await expect(second.page.getByRole('button', { name: /alice/ })).toBeVisible()
  await second.page.getByLabel('Имя пользователя или email').fill('alice')
  await second.page.getByLabel('Пароль', { exact: true }).fill('secret123')
  await second.page.getByRole('button', { name: 'Войти' }).click()
  await expect(second.page.getByTestId('dashboard-greeting')).toBeVisible()
  await openRoute(second.page, '#/exercises/b-select-01')
  await expect(second.page.getByText('Решено').first()).toBeVisible()
  await second.app.close()

  const third = await launchApp(userData)
  await expect(third.page.getByTestId('dashboard-greeting')).toBeVisible()
  await third.app.close()
})
