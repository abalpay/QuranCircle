---
name: to-spec
description: "Turn the current conversation into a spec and publish it to the project issue tracker: synthesis of what you've already discussed, plus one seam check."
disable-model-invocation: true
---

This skill takes the current conversation context and codebase understanding and produces a spec. Synthesize what you already know rather than interviewing the user; the one question to put to them is the seam check in step 2.

The issue tracker and triage label vocabulary are in `docs/agents/issue-tracker.md`.

## Process

1. Explore the repo to understand the current state of the codebase, if you haven't already. Use the vocabulary of `docs/product/decisions.md` and `CLAUDE.md` throughout the spec, and respect every decision there; a spec that would break one goes back to Ahmet first.

2. Sketch out the seams at which you're going to test the feature. Existing seams should be preferred to new ones. Use the highest seam possible. If new seams are needed, propose them at the highest point you can. The fewer seams across the codebase, the better - the ideal number is one.

Check with the user that these seams match their expectations.

3. Write the spec using the template below, then publish it to the project issue tracker. Apply the `ready-for-agent` label, the `wave:<n>` label when the work belongs to a wave, and `product-facing` or `internal`.

<spec-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A numbered list of user stories covering every actor and behaviour the feature touches. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Leave out specific file paths and code snippets: they go stale quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts, not a working demo, just the important bits.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this spec.

## Further Notes

Any further notes about the feature.

</spec-template>
