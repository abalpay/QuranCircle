# Issue tracker: GitHub

Issues live in GitHub Issues on `abalpay/QuranCircle`. Use the `gh` CLI and infer
the repository from the Git remote.

**The repository is public.** Never put user data in issues, PRs or commits:
no real circle names, participant names, short codes, emails or screenshots
showing them. Use invented examples.

## Conventions

- Create: `gh issue create --title "..." --body "..." --label "..."`.
- Read: `gh issue view <number> --comments`.
- List a wave: `gh issue list --label wave:1 --state open --json number,title,labels`.
- Comment: `gh issue comment <number> --body "..."`.
- Commits that implement an issue mention `#<number>`, so `code-review` can find
  the spec. PR bodies list `Closes #<number>` for each issue they complete.

When a skill says "publish to the issue tracker", create a GitHub issue.
When it says "fetch the relevant ticket", read the GitHub issue.

## Labels

- `ready-for-agent`: fully specified; an implementer can start from it.
- `product-facing`: changes what users see; needs Ahmet's OK and before/after
  screenshots before merge. `internal`: no product change; the gate's call.
- `migration`: carries a database migration; lands in version order and is
  applied to production only with Ahmet's approval.
- `wave:<n>`: the wave in `docs/product/waves.md` the issue belongs to.
- `bug`, `enhancement`: from the issue forms.

Work items use the `Work item` form (`.github/ISSUE_TEMPLATE/work-item.yml`).
Each wave has one plan issue (`wave <n>: plan`) that the work items are
sub-issues of. Owner questions go out as one numbered comment on the plan issue;
answers are recorded as `DECISION (Ahmet YYYY-MM-DD): …` comments.

## Ticket relationships

Publish in dependency order so later issues can reference real numbers.

- Database ID: `gh api repos/abalpay/QuranCircle/issues/<number> --jq .id`.
- Sub-issue: `gh api --method POST repos/abalpay/QuranCircle/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>`.
- Blocked by: `gh api --method POST repos/abalpay/QuranCircle/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`.
- Fallback when either API is unavailable: `Part of #<parent>` and
  `Blocked by: #<number>` lines in the body.
