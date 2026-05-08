const env = process.env.VERCEL_ENV;
const ref = process.env.VERCEL_GIT_COMMIT_REF ?? "";
const author = process.env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN ?? "";

const isDependabot =
  author === "dependabot" ||
  author === "dependabot[bot]" ||
  ref.startsWith("dependabot/");

if (env === "preview" && isDependabot) {
  console.log(`Skipping Dependabot preview deployment for ${ref || author}.`);
  process.exit(0);
}

console.log(`Building deployment for ${env ?? "unknown"} ${ref || "unknown-ref"}.`);
process.exit(1);
