import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = path.resolve(
  process.cwd(),
  "scripts/vercel-ignore-build.mjs"
);

function runIgnoreCommand(environment: string, ref: string) {
  return spawnSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    env: {
      ...process.env,
      VERCEL_ENV: environment,
      VERCEL_GIT_COMMIT_REF: ref,
    },
  });
}

describe("Vercel build-ignore policy", () => {
  it.each(["codex/maintenance-audit-fixes", "dependabot/npm_and_yarn/deps"])(
    "skips preview deployment for %s",
    (ref) => {
      const result = runIgnoreCommand("preview", ref);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Skipping Vercel preview deployment");
    }
  );

  it.each(["production", "development"])(
    "continues the build for the %s environment",
    (environment) => {
      const result = runIgnoreCommand(environment, "main");

      expect(result.status).toBe(1);
      expect(result.stdout).toContain(`Building deployment for ${environment}`);
    }
  );
});
