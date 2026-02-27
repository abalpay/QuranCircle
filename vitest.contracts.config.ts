import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["tests/contracts/**/*.test.ts"],
    globals: true,
    passWithNoTests: false,
    testTimeout: 30_000,
  },
});
