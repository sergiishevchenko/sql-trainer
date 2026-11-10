import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'scripts/screenshots',
  timeout: 300_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results/screenshots'
})
