import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'

export interface LaunchedApp {
  app: ElectronApplication
  page: Page
  errors: string[]
}

export function createUserDataDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sql-mastery-e2e-'))
}

/**
 * Launches the built application with an isolated userData directory.
 */
export async function launchApp(userDataDir: string, extraEnv: Record<string, string> = {}): Promise<LaunchedApp> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && key !== 'ELECTRON_RENDERER_URL') env[key] = value
  }
  const app = await electron.launch({
    args: [path.resolve(__dirname, '../../out/main/index.js')],
    env: { ...env, SQL_MASTERY_USER_DATA: userDataDir, ...extraEnv }
  })
  const page = await app.firstWindow()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.waitForLoadState('domcontentloaded')
  return { app, page, errors }
}

export async function registerUser(page: Page, username = 'alice', password = 'secret123'): Promise<string> {
  await page.getByRole('link', { name: 'Зарегистрироваться' }).click()
  await page.getByLabel('Имя пользователя').fill(username)
  await page.getByLabel('Email').fill(`${username}@example.com`)
  await page.getByLabel('Пароль', { exact: true }).fill(password)
  await page.getByLabel('Повторите пароль').fill(password)
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  const code = (await page.getByTestId('recovery-code').textContent()) ?? ''
  await page.getByText('Я сохранил код').click()
  await page.getByRole('button', { name: 'Продолжить' }).click()
  return code.trim()
}

export async function typeInEditor(page: Page, sql: string): Promise<void> {
  const editor = page.getByTestId('sql-editor').locator('.monaco-editor').first()
  await editor.click()
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
  await page.keyboard.press('Backspace')
  await page.keyboard.insertText(sql)
}
