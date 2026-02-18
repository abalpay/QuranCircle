import { defineConfig, devices } from "@playwright/test";

const fallbackPort = process.env.PLAYWRIGHT_PORT ?? "3101";
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${fallbackPort}`;
const serverPort = new URL(baseURL).port || fallbackPort;

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(
      `Missing ${key}. Load local Supabase env before running Playwright.`
    );
  }
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: {
    command: `next dev -p ${serverPort}`,
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? baseURL,
      NEXT_PUBLIC_ENABLE_ANONYMOUS_AUTH:
        process.env.NEXT_PUBLIC_ENABLE_ANONYMOUS_AUTH ?? "true",
      AUTH_MERGE_COOKIE_SECRET:
        process.env.AUTH_MERGE_COOKIE_SECRET ??
        "local-e2e-merge-cookie-secret",
    },
  },
});
