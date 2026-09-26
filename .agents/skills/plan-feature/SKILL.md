---
name: plan-feature
description: Create implementation-ready feature plans from an explicitly accepted direction through deep repository analysis and targeted official research, without writing code. Use after brainstorming is approved or the user otherwise provides a settled direction; do not use for open-ended exploration or direct implementation.
---

# Plan Feature

Transform the requested feature into a context-rich plan that another developer or agent can implement without rediscovering repository patterns. The only file this workflow creates or changes is the plan document.

## Confirm the handoff

- When planning follows a repository brainstorm, read the complete matching file in `.agent/brainstorms/` before planning.
- Verify that the user explicitly accepted the overall brainstorm direction and asked to proceed to planning. Approval of one option or answer is not an automatic handoff.
- Carry accepted decisions and exclusions into the plan. Do not silently reopen them or replace them with a preferred implementation.
- If a consequential product, scope, or architecture question remains unresolved, return it to discussion instead of hiding it as a planning assumption.
- If no brainstorm exists, planning may proceed when the user's request itself gives a sufficiently settled direction.

## Establish the feature

- State the problem, user value, and business impact.
- Classify it as New Capability, Enhancement, Refactor, or Bug Fix.
- Assess relative complexity as Low, Medium, or High and explain the main driver.
- Write a concrete user story and identify affected systems.
- Resolve decisions that materially change the architecture or user experience. Ask the user only when repository evidence and reasonable assumptions cannot resolve a consequential ambiguity.

## Gather repository evidence

Read repository-level instructions first, including applicable `AGENTS.md`, contribution guidance, and agent/editor rule files. Inspect rather than infer:

- languages, frameworks, runtime and dependency versions
- directory structure, service boundaries, configuration, environment setup, and build workflow
- similar implementations and reusable utilities
- naming, errors, logging, authorization, data access, API registration, and migration patterns relevant to the feature
- unit, integration, and end-to-end test organization
- internal documentation and architectural decisions

Use `rg` and `rg --files` for discovery. Record exact existing file paths and useful line locations. Never invent a file, symbol, command, convention, or test framework. If the repository is still scaffolding or lacks a needed pattern, say so and make the gap an explicit design decision in the plan.

Map the files likely to change and the new files likely to be created. Trace integration points end to end where relevant: UI, public contract, authentication/authorization, server logic, persistence, background work, observability, and deployment configuration.

## Research selectively

Use external research only when the plan depends on current library behavior, security guidance, provider APIs, compatibility, or migration details. Prefer official documentation and primary sources. Link the specific relevant section and explain why implementers need it. Do not pad the plan with generic tutorials or unrelated references.

Distinguish repository evidence, documented external facts, and planning assumptions. Verify version-sensitive claims against the versions actually used or proposed.

## Design the implementation

Choose a coherent approach and record the rationale when alternatives are plausible. Consider only the concerns relevant to this feature, including dependency order, backward compatibility, data migration, authorization, failure behavior, concurrency, idempotency, privacy, performance, operability, and rollback.

Make every implementation task atomic and verifiable. Each task must name its target, intended behavior, relevant existing pattern, important dependencies or imports when known, likely gotchas, and a real validation command or observable check. Commands must come from repository scripts/tooling or be explicitly identified as new commands the implementation must introduce.

## Write the plan

Before writing, read [references/plan-template.md](references/plan-template.md). Create or update:

```text
.agent/plans/{YYMMDD}-{kebab-case-feature-name}.md
```

Use the plan's creation date as the immutable six-digit `YYMMDD` prefix and a concise kebab-case feature name derived from the request. Record the full `YYYY-MM-DD` creation and update dates inside the document. Never rename the file merely because it is updated, approved, completed or superseded. Update an existing plan when the request clearly continues the same feature instead of creating a newly dated duplicate. Preserve still-valid evidence and revise stale conclusions rather than creating a duplicate.

Record the plan's lifecycle status, creation/update dates, inspected repository commit, source brainstorm and a concise repository-status snapshot. Preserve that snapshot as historical context. If later repository changes require a revised plan, append a dated context/revision note; if the accepted direction is materially replaced, mark the old plan `Superseded` and link to its successor rather than deleting it.

The plan must be self-contained but not repetitive. Omit inapplicable subsections only when the omission is obvious; explicitly state meaningful gaps such as missing tests, absent logging conventions, or unresolved provider access.

After writing the plan, report:

1. a short summary of the feature and selected approach
2. the plan path
3. the complexity assessment
4. key risks or unresolved decisions
5. a 1–10 confidence score for one-pass implementation, with the reason for any deduction

Treat the completed plan as a review artifact. Do not begin implementation until the user explicitly asks to execute it.

After implementation, retain the plan and mark its lifecycle status `Completed` with the completion date. `STATUS.md` remains the live handoff; the plan records what was intended and known at planning time.

## Boundaries

- Do not implement the feature, install dependencies, change configuration, or edit unrelated files.
- Do not turn unresolved architectural choices into hidden assumptions.
- Do not claim one-pass readiness if required evidence, decisions, credentials, or test infrastructure are missing.
- Avoid speculative extensibility; plan only what the accepted feature requires, with clear seams where future change is genuinely likely.
