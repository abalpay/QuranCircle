const env = process.env.VERCEL_ENV;
const ref = process.env.VERCEL_GIT_COMMIT_REF ?? "";

// Preview currently points at the production Supabase project. Skip every
// preview until Vercel Preview has an isolated Supabase project or branch with
// its own credentials and seed data.
if (env === "preview") {
  console.log(`Skipping Vercel preview deployment for ${ref || "unknown-ref"}.`);
  process.exit(0);
}

console.log(`Building deployment for ${env ?? "unknown"} ${ref || "unknown-ref"}.`);
process.exit(1);
