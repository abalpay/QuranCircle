import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^next\/server$/,
        replacement: path.resolve(__dirname, "node_modules/next/server.js"),
      },
      {
        find: /^next\/navigation$/,
        replacement: path.resolve(__dirname, "node_modules/next/navigation.js"),
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "."),
      },
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    server: {
      deps: {
        inline: ["next-intl"],
      },
    },
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    globals: true,
    passWithNoTests: false,
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage/unit",
      reporter: ["text", "lcov", "json-summary"],
      include: [
        "app/api/**/*.ts",
        "app/auth/callback/route.ts",
        "lib/actions/events.ts",
        "lib/actions/juz.ts",
        "lib/auth/merge-state.ts",
        "lib/constants/short-code.ts",
        "lib/event-filters.ts",
        "lib/supabase/proxy.ts",
        "lib/utils.ts",
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 80,
      },
    },
  },
});
