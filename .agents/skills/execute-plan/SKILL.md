---
name: execute-plan
description: Implement an existing repository plan in dependency order with freshness checks, incremental tests, and complete validation. Use when the user asks to execute a plan from `.agent/plans/` or provides a plan path; do not use to create the plan or for unplanned feature work.
---

# Execute a Plan

Implement the selected plan completely within the user's authorized scope. Treat the plan as informed guidance that must be verified against the current repository, not as permission to ignore newer code or perform unrelated external actions.

Invoke as `$execute-plan [path-to-plan]`. The path is optional.

## Select and read the plan

- If the user provides a path, resolve it from the repository root unless it is already absolute.
- If no path is provided, find Markdown plans in `.agent/plans/` and use the most recently modified plan. If none exists, ask for the plan path. If the newest plan is not clearly the intended one, ask rather than guessing.
- Read the entire plan, including required reading, task dependencies, testing strategy, acceptance criteria, risks, open questions, and validation commands.
- Read every applicable repository instruction file before editing.

Do not begin implementation while the plan contains an unresolved decision that materially changes behavior, data, architecture, or user experience. Ask the user for that decision.

## Verify freshness and scope

Before editing:

1. Inspect the working tree and preserve unrelated user changes.
2. Confirm referenced existing files and symbols still exist.
3. Re-read the cited patterns instead of relying only on plan excerpts or old line numbers.
4. Compare current dependency/runtime versions with the plan.
5. Verify that planned commands match current repository tooling.
6. Identify which changes, if any, are already implemented.

Adapt silently to minor drift such as moved line numbers or equivalent local naming changes, and record the adjustment in the final report. If current code invalidates the chosen design, requires materially broader scope, or conflicts with user work, stop and explain the decision needed before continuing.

Invoking this skill authorizes ordinary repository changes described by the plan. It does not by itself authorize deployment, production mutation, purchases, account creation, sending external messages, destructive data migration, commits, or pushes. Obtain the authority those actions require.

## Execute tasks in dependency order

For each task:

1. Read the complete target files and directly related code before changing them.
2. Implement only the behavior and supporting changes needed for that task.
3. Follow current repository conventions for naming, types, errors, logging, authorization, data access, tests, and documentation.
4. Verify syntax, imports, types, formatting, and task-specific behavior immediately after the change.
5. Run the narrowest relevant tests before moving to dependent work.

Keep changes reviewable and avoid opportunistic refactors. Do not overwrite or revert unrelated modifications. Do not create commits unless the user explicitly requests them.

When the plan is incomplete about a small implementation detail, use the closest verified repository pattern and document the choice. When the missing detail changes public behavior or architecture, ask the user.

## Test and validate

- Create the tests specified by the plan and any additional test needed to cover behavior introduced during an approved adaptation.
- Cover relevant success, authorization, isolation, validation, failure, concurrency, and edge cases.
- Run tests incrementally, then execute the plan's full validation commands in order.
- Use only commands appropriate to the repository. Generic examples such as `npm test`, `pytest`, or `cargo test` are not commands to run unless the repository or plan actually uses them.
- On failure, diagnose the cause, fix plan-scoped issues, and rerun the narrow failing check before the broader suite.
- Do not modify unrelated code merely to make a pre-existing failure disappear. Establish and report evidence when a failure predates or lies outside the plan.

Do not claim completion while required plan-scoped validation is failing. If a required check cannot run because of missing access, unavailable infrastructure, an external outage, or an unresolved out-of-scope defect, complete all safe work and report the precise blocker and unverified acceptance criteria.

## Final verification

Before reporting completion, confirm:

- every applicable plan task is implemented
- new and modified behavior has appropriate tests
- required validation commands passed, or every blocker is explicitly evidenced
- code follows current repository conventions
- documentation and configuration required by the plan are updated
- acceptance criteria are checked against observable behavior
- no unrelated user changes were overwritten
- no unauthorized commit, push, deployment, or external mutation occurred

## Report

Lead with the implementation outcome, then include:

### Completed work

- Tasks completed
- Files created and modified
- Any plan task intentionally skipped as already satisfied or no longer applicable

### Tests and validation

- Tests added or updated
- Commands run and pass/fail results
- Manual checks performed

### Deviations and issues

- Freshness adaptations and why they were necessary
- Problems encountered and how they were resolved
- Remaining blockers, risks, or follow-up work

### Review state

- Whether all plan-scoped work and acceptance criteria are complete
- Whether the changes are ready for review

Keep command output concise; summarize results and include the useful failure excerpt rather than dumping full logs.
