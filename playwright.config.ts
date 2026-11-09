import { defineConfig } from '@playwright/test'
const port = 4173
// Runs against the production build. Defaults to the locally installed Chrome to avoid a browser download;
// set PW_CHANNEL=chromium (after `pnpm exec playwright install chromium`) or msedge to switch, PW_HEADED=1 to watch.
export default defineConfig({
  testDir: 'e2e', testMatch: '**/*.e2e.ts', workers: 1, timeout: 60_000, reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${port}/`, channel: process.env.PW_CHANNEL || 'chrome', headless: !process.env.PW_HEADED, viewport: { width: 1280, height: 720 } },
  webServer: { command: `pnpm build && pnpm preview --host 127.0.0.1 --port ${port} --strictPort`, url: `http://127.0.0.1:${port}/`, reuseExistingServer: !process.env.CI, timeout: 120_000 },
})
