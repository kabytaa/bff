# Feature plan template

Use this structure for `.agent/plans/{kebab-case-feature-name}.md`. Replace every instructional placeholder with repository-specific content. Do not leave example paths, commands, or generic task text in the completed plan.

````markdown
# Feature: {Feature Name}

> **Status**: Draft — Awaiting review
> **Created**: {YYYY-MM-DD}
> **Last updated**: {YYYY-MM-DD}
> **Repository baseline**: `{inspected commit}`
> **Source brainstorm**: [{brainstorm title}]({repository-relative path}), accepted {date}, or `None — direction supplied directly by the user`
>
> Implementation plan based on the repository state inspected on {date}. Re-verify referenced files, versions, and external documentation if the repository changes before implementation.

## Repository Context Snapshot

{Concise historical snapshot of implementation state, active `STATUS.md` handoff, canonical decisions and important gaps when the plan was created. Do not silently rewrite this section to match later repository state; record later changes in Document History.}

## Feature Description

{Purpose, behavior, and user value}

## User Story

As a {type of user}
I want to {action or goal}
So that {benefit or value}

## Problem Statement

{Specific problem or opportunity}

## Solution Statement

{Selected conceptual approach and why it fits this repository}

## Metadata

- **Type**: {New Capability | Enhancement | Refactor | Bug Fix}
- **Complexity**: {Low | Medium | High} — {main reason}
- **Systems Affected**: {components or services}
- **Dependencies**: {required internal/external dependencies, or None}
- **Assumptions**: {explicit assumptions, or None}

## Required Reading

### Codebase Files (read before implementing)

- `{real/path.ext}:{line}` — {pattern, contract, or constraint it establishes}

### Internal Documentation

- `{real/path.md}` — {decision or guidance it establishes}

### External Documentation

- [{document title}]({specific URL}) — Section: {section} — Why: {implementation relevance}

### New Files to Create

- `{planned/path.ext}` — {purpose}

## Codebase Context

### Existing Architecture and Integration Points

{Relevant boundaries and end-to-end flow}

### Patterns to Follow

#### Naming and Organization

{Observed repository conventions}

#### Error Handling

{Observed pattern or an explicit gap}

#### Logging and Observability

{Observed pattern or an explicit gap}

#### Authentication and Authorization

{Observed pattern or Not applicable}

#### Data and Migrations

{Observed pattern or Not applicable}

#### Testing

{Observed frameworks, locations, and representative tests}

## Design Decisions

- **Decision**: {choice}
  - **Rationale**: {why}
  - **Tradeoff**: {cost or limitation}

## Implementation Plan

### Phase 1: {Foundation or first dependency group}

{Outcome of this phase}

### Phase 2: {Core behavior}

{Outcome of this phase}

### Phase 3: {Integration}

{Outcome of this phase}

### Phase 4: Testing and validation

{Outcome of this phase}

## Step-by-Step Tasks

Execute in dependency order. Use `CREATE`, `UPDATE`, `ADD`, `REMOVE`, or `REFACTOR` in each heading.

### Task 1: {ACTION} `{target}`

- **Implement**: {specific behavior and boundaries}
- **Pattern**: `{existing/file.ext}:{line}` — {what to follow}
- **Dependencies/Imports**: {known dependencies, or None}
- **Gotchas**: {edge cases, ordering, security, compatibility, or None}
- **Validate**: `{real command}` or {specific observable check}

### Task 2: {ACTION} `{target}`

{Repeat only as needed}

## Testing Strategy

### Unit Tests

{Scope, cases, and repository pattern}

### Integration Tests

{Boundaries and failure cases}

### End-to-End or Manual Validation

{User-visible workflow and environment requirements}

### Edge Cases

- {Relevant edge or failure case}

## Validation Commands

Run from `{working directory}` unless noted.

### Syntax and Types

```bash
{verified repository command}
```

### Tests

```bash
{verified repository command}
```

### Lint and Formatting

```bash
{verified repository command}
```

### Manual Validation

{Observable checks that cannot be automated}

## Acceptance Criteria

- [ ] {Feature-specific, externally observable criterion}
- [ ] Authorization and isolation rules are verified where applicable
- [ ] Relevant failure and edge cases are covered
- [ ] Repository validation commands pass
- [ ] Documentation and configuration are updated where required
- [ ] Existing behavior has no unintended regression

## Risks and Mitigations

- **Risk**: {specific risk}
  - **Mitigation**: {planned control}

## Open Questions

- {Only questions that remain genuinely unresolved; otherwise `None`}

## Notes

{Important context, rejected alternatives, rollout or rollback considerations}

## Document History

| Date | Status | Change |
| --- | --- | --- |
| {YYYY-MM-DD} | Draft — Awaiting review | Initial implementation-ready plan created from the accepted direction. |
````

## Final quality check

Before reporting completion, confirm:

- Every cited repository path exists at planning time.
- Line references point to the stated pattern.
- Proposed new paths fit the observed repository structure.
- External links are specific, authoritative, and relevant.
- Tasks are dependency-ordered, atomic, and individually verifiable.
- Validation commands exist in current tooling or are clearly marked as planned additions.
- Acceptance criteria describe the requested behavior rather than generic software quality.
- Risks, security boundaries, migration needs, and failure modes are included when relevant.
- Assumptions and unresolved decisions are visible.
- Another implementer could execute the plan without repeating the discovery work.
- Metadata, context snapshot and document history preserve when and from which repository state the plan was produced.
