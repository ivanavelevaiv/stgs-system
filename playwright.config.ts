import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for STGS.
 *
 * Setup:
 *   npx playwright install chromium
 *
 * Run:
 *   npm run test:e2e            — against local dev server (auto-started)
 *   PLAYWRIGHT_BASE_URL=https://your-vercel-url.vercel.app npm run test:e2e
 */
export default defineConfig({
  testDir: "./tests/e2e",

  // Run tests sequentially — they share a live Supabase backend
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    // Short timeout — the app should be fast for demo credentials
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Auto-start next dev when no external base URL is provided
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
