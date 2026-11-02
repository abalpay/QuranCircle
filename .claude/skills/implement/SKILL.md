---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets, following the
implementer contract in `docs/agents/development-workflow.md`.

Use /tdd where possible, at pre-agreed seams: the approved plan's test list counts as the confirmed seams, so do not stop to re-confirm them.

Run `npx tsc --noEmit` regularly, single test files regularly (`npx vitest run --config vitest.config.ts <file>`), and `npm run test:unit` plus `npm run lint` once at the end. Database changes get pgTAP tests in `supabase/tests/database/`; `supabase test db` and Playwright run on the shared local stack or in CI: run them only when the plan or your contract names them.

Every new string goes into `messages/en.json`, `tr.json` and `ar.json`.

Once done, use /code-review to review the work.

Commit your work to the current branch, mentioning the issue (`#<number>`) in the commit message. No co-author lines.
