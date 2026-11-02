---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save to the temporary directory of the user's OS - not the current workspace.

Include a "suggested skills" section in the document, naming which skills the next agent should call the Skill tool for.

Cover every field below, writing `none`, `not applicable` or `not yet available` rather than omitting one:

- Issue(s) and wave
- Base SHA, branch and worktree
- Risk lane (Fast / Standard / High-risk, per `docs/agents/development-workflow.md`)
- Skills used
- Next approval needed from Ahmet
- Confirmed facts and unresolved decisions
- Changed files
- Tests run and their results
- Migration impact (local / production)
- PR URL and CI state
- Review findings and their status

Do not duplicate content already captured in other artifacts (`docs/product/`, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information (including real circle or participant names).

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.
