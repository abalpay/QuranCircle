/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  testRunner: "vitest",
  packageManager: "npm",
  reporters: ["clear-text", "progress", "html"],
  htmlReporter: {
    fileName: "reports/mutation/mutation.html",
  },
  mutate: [
    "app/api/event/route.ts",
    "app/auth/callback/route.ts",
    "hooks/use-auth.tsx",
    "lib/actions/events.ts",
    "lib/actions/juz.ts",
  ],
  ignorePatterns: [
    ".agents/**",
    ".claude/**",
    ".cursor/**",
    ".next/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ],
  vitest: {
    configFile: "vitest.config.ts",
  },
  thresholds: {
    high: 80,
    low: 70,
    break: 70,
  },
  disableTypeChecks: true,
  concurrency: 2,
  timeoutMS: 60_000,
  coverageAnalysis: "off",
};

export default config;
