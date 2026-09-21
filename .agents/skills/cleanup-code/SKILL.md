---
name: cleanup-code
description: Perform behavior-preserving cleanup and quality assurance on a specified path or recently changed repository files, then run the project's real validation tools. Use after implementation, before review, or for focused maintenance; do not use for feature changes or broad redesign.
---

# Post-Execution Code Cleanup

Improve readability, maintainability, types, error handling, and documentation without changing observable behavior.

Invoke as `$cleanup-code [optional-file-or-directory]`.

## Establish scope and tooling

If the user supplies a path, restrict edits to that path and directly dependent tests or documentation needed to keep it correct. Otherwise:

1. Inspect `git status --short`.
2. Collect staged and unstaged tracked files with `git diff --name-only HEAD`.
3. Include relevant untracked files from `git ls-files --others --exclude-standard`.
4. If the working tree is clean, use the files changed by the most recent commit as the candidate scope and state that scope before editing. Ask for direction when that commit is clearly unrelated or too broad.

Preserve unrelated user changes. Exclude generated output, lockfiles, vendored dependencies, snapshots, minified assets, and binaries from manual cleanup unless the user explicitly targets them or repository tooling regenerates them as a required consequence.

Read applicable repository instructions and inspect manifests/configuration to identify the actual:

- language, runtime, and package manager
- formatter and linter
- type checker or compiler
- unit, integration, and end-to-end test tools
- build commands and repository task runner

Use configured scripts and tools; do not run generic ecosystem commands merely because the language supports them.

## Understand before editing

Read each relevant human-authored file in scope in full, plus enough callers, tests, types, and documentation to preserve behavior. Review the diff to understand what the recent implementation intended. When practical, run the narrow existing checks before cleanup to distinguish baseline failures from introduced failures.

Do not assume all working-tree changes were produced by the preceding task. If ownership or intent is ambiguous and a cleanup would rewrite meaningful user work, leave it untouched or ask.

## Quality audit

Apply existing project conventions rather than imposing generic style preferences.

### Comments and documentation

- Remove comments that merely restate clear code, are demonstrably stale, or describe code that no longer exists.
- Remove commented-out code when version control already preserves it and it has no documented operational purpose.
- Keep or improve comments that explain business reasons, security boundaries, compatibility constraints, edge cases, workarounds, or non-obvious algorithms.
- Remove `TODO` or `FIXME` only when the underlying work is actually complete. Otherwise make it accurate or report it.

### Duplication and structure

- Consolidate repeated logic only when the duplication is meaningful and the resulting abstraction is clearer.
- Prefer an existing utility or component over creating another equivalent.
- Do not extract one-off code merely to reduce line count.
- Simplify deep nesting and complex conditions when doing so preserves semantics and improves readability.

### Naming and types

- Match established naming and file-organization patterns.
- Use descriptive names; boolean and event-handler conventions should follow the repository's existing style.
- Remove unused imports, variables, functions, and unreachable paths when their lack of use is proven.
- Replace unsafe broad types and add public-boundary annotations where repository conventions and available information support a more precise type.
- Do not add redundant annotations that make well-inferred local code noisier.

### Errors and diagnostics

- Preserve error semantics while making messages actionable and consistent.
- Do not silently swallow failures.
- Remove debugging output that is not part of the project's intentional logging/observability pattern.
- Retain operational logging that carries real diagnostic value.

### Compatibility and behavior

- Do not change APIs, data shapes, side effects, timing guarantees, authorization, or user-visible behavior.
- Remove compatibility code only with evidence that no supported caller or version needs it.
- Treat a discovered behavior bug or architectural problem as a separate finding unless the user explicitly expands the cleanup scope.

## Documentation and rules

Update existing documentation only when the cleaned implementation would otherwise leave it inaccurate, such as renamed configuration, public APIs, or environment variables. Cleanup should not normally create new architecture or convention documents.

Do not add a new repository-wide rule based on a single cleanup. Update maintained project rules only when the repository already uses them and the change records a durable, demonstrated convention; otherwise mention the recommendation in the report.

## Validate

Run the narrowest relevant formatter, linter, type check, and tests during cleanup, then run the full applicable validation for the scoped change. Re-run failed checks after fixing cleanup-related issues.

Do not modify unrelated code to hide a pre-existing failure. If a configured check cannot run or fails outside the cleanup scope, capture the concise evidence and report which behavior remains unverified.

Review the final diff and confirm:

- no unintended behavior change
- comments remain meaningful and accurate
- no proven dead/debug code remains in scope
- naming and types match project conventions
- error handling remains complete
- documentation is accurate
- no unrelated user changes were overwritten

Do not commit, push, deploy, or perform external mutations unless explicitly requested.

## Report

Provide a concise cleanup report:

### Files analyzed

- List reviewed files and the effective scope.

### Changes made

- Summarize removed dead/debug code, simplifications, deduplication, type/error improvements, and documentation updates.
- Include counts only when they were actually measured.

### Validation results

- List each command and its result.
- Include manual checks when relevant.

### Remaining items

- Report behavior changes deliberately deferred, pre-existing failures, ambiguous code, or manual follow-up.

State whether the cleanup is complete and ready for review.
