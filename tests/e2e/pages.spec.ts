import { expect, test } from '@playwright/test'
import { createUserDataDir, launchApp, openRoute, registerUser, typeInEditor } from './app'

test('every page renders without runtime errors', async () => {
  const { app, page, errors } = await launchApp(createUserDataDir())
  await registerUser(page, 'tourist', 'tourist123')
  await expect(page.getByTestId('dashboard-greeting')).toBeVisible()

  const routes: [string, string][] = [
    ['#/learn', 'learn'],
    ['#/learn/beginner.where', 'module'],
    ['#/exercises', 'catalog'],
    ['#/practice', 'practice'],
    ['#/playground', 'playground'],
    ['#/analytics', 'analytics'],
    ['#/achievements', 'achievements'],
    ['#/profile', 'profile']
  ]
  for (const [route, name] of routes) {
    await openRoute(page, route)
    await page.waitForTimeout(700)
    await page.screenshot({ path: `test-results/page-${name}.png` })
  }
  expect(errors).toEqual([])
  await app.close()
})

test('playground runs queries and blocks forbidden statements', async () => {
  const { app, page, errors } = await launchApp(createUserDataDir())
  await registerUser(page, 'player', 'player123')
  await openRoute(page, '#/playground')
  await typeInEditor(page, 'SELECT name, price FROM products ORDER BY price DESC LIMIT 5')
  await page.getByTestId('playground-run').click()
  await expect(page.getByTestId('result-table')).toBeVisible()
  await expect(page.getByTestId('result-table').locator('tbody tr')).toHaveCount(5)

  await typeInEditor(page, "ATTACH DATABASE '/tmp/evil.db' AS evil")
  await page.getByTestId('playground-run').click()
  await expect(page.getByTestId('playground-error')).toBeVisible()
  await page.screenshot({ path: 'test-results/playground-forbidden.png' })
  expect(errors).toEqual([])
  await app.close()
})

test('catalog filters and a module test can be completed', async () => {
  const { app, page, errors } = await launchApp(createUserDataDir())
  await registerUser(page, 'student', 'student123')
  await openRoute(page, '#/exercises')
  await expect(page.getByTestId('catalog-count')).toContainText('Found')
  await page.getByTestId('catalog-search').fill('NULL')
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'test-results/catalog-search.png' })

  await openRoute(page, '#/learn/beginner.intro')
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.getByTestId('finish-assessment')).toBeVisible()
  await page.screenshot({ path: 'test-results/module-test.png' })
  await page.getByTestId('finish-assessment').click()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByTestId('assessment-result')).toBeVisible()
  await page.screenshot({ path: 'test-results/module-test-result.png' })
  expect(errors).toEqual([])
  await app.close()
})

test('the interface language can be switched and is remembered', async () => {
  const userData = createUserDataDir()
  const first = await launchApp(userData)
  await expect(first.page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await registerUser(first.page, 'polyglot', 'polyglot123')
  await openRoute(first.page, '#/profile')
  await first.page.getByTestId('profile-language').getByRole('radio', { name: 'Русский' }).click()
  await expect(first.page.getByRole('link', { name: 'Главная' })).toBeVisible()
  await openRoute(first.page, '#/learn/beginner.intro')
  await expect(first.page.getByRole('heading', { name: 'Что такое SQL' }).first()).toBeVisible()
  expect(first.errors).toEqual([])
  await first.app.close()

  const second = await launchApp(userData)
  await expect(second.page.getByRole('heading', { name: 'Вход' })).toBeVisible()
  await second.page.getByRole('radio', { name: 'English' }).click()
  await expect(second.page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  expect(second.errors).toEqual([])
  await second.app.close()
})
