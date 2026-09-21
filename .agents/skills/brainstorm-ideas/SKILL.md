---
name: brainstorm-ideas
description: Explore feature ideas and compare approaches using current repository context, producing a living brainstorm document before implementation planning. Use for early feature exploration, option comparison, or direction refinement; do not use when the user has already chosen an approach and wants an implementation plan or code.
---

# Brainstorm Ideas

Explore the topic from the user's request without turning the exploration into an implementation plan.

## Ground the discussion

Understand the core concept, the problem it solves, and who benefits. Inspect the repository before proposing approaches:

- Identify related features, components, conventions, and decisions already present.
- Surface technical limitations, architectural boundaries, and dependencies.
- Note code, libraries, and patterns that could be reused.
- Call out risks that could make an approach difficult, costly, or messy.

Distinguish facts found in the repository from assumptions. Do not invent infrastructure or capabilities that are not present.

## Explore options

Present two to four meaningfully different approaches. For each option include:

```markdown
### Option A: Name
**Approach**: What it is and how it would work conceptually
**Leverages**: Existing code, decisions, or patterns it builds on
**Constraints**: What limits or shapes it
**Effort**: Low, Medium, or High
**Risk**: What could go wrong
```

Use relative effort only; do not turn it into an estimate or task breakdown. List the technical unknowns, user-experience choices, and scope questions that must be resolved before a direction is committed.

## Maintain the living document

Create or update:

```text
.agent/brainstorms/{kebab-case-topic}.md
```

Use a concise kebab-case topic derived from the request. If continued discussion is clearly about an existing brainstorm, update that document instead of creating a duplicate. Preserve useful prior reasoning, revise the current direction as decisions change, and append durable insights to Notes.

Use this structure:

```markdown
# Brainstorm: Topic

## The Idea
What we are exploring and why it matters.

## Codebase Context

### What We Have
- Existing relevant code, features, or decisions

### Constraints
- Technical limitations and architectural boundaries

### Opportunities
- Reusable code and patterns that fit

## Options

### Option A: Name
**Approach**: ...
**Leverages**: ...
**Constraints**: ...
**Effort**: Low/Medium/High
**Risk**: ...

### Option B: Name
...

## Open Questions
- Questions to resolve

## Current Direction
The option currently favored and why, or `Undecided` when the evidence does not support a preference.

## Notes
- Decisions and insights captured as the discussion evolves
```

After writing the document, summarize the most important options and open questions for discussion.

## Boundaries

- This is exploration, not planning: do not create task lists, implementation sequences, or code.
- Focus on what and why. Include technical detail only when it explains a constraint or tradeoff.
- Keep options honest and materially distinct; do not hide complexity to make an option look preferable.
- Do not implement the feature or mutate unrelated files while brainstorming.
