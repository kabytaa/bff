---
name: brainstorm-ideas
description: Explore feature or product directions through a repository-grounded conversation, recording options and decisions in a living brainstorm before implementation planning. Use for early exploration, option comparison, or direction refinement; do not use when the user has explicitly accepted the direction and asks for a plan or code.
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

## Drive the decision conversation

Treat the brainstorm document as durable memory for the discussion, not as a substitute for talking with the user.

- Organize a broad but cohesive subject into named discussion tracks when its concerns share assumptions or affect one outcome. Prefer one umbrella brainstorm in that case; split into separate brainstorms only when the subjects have distinct goals, audiences, or decisions that can be resolved independently.
- Present the important alternatives and explain them in plain language. State a recommendation when evidence supports one, while making its tradeoffs visible.
- Work through unresolved choices with the user in a digestible order. Ask one consequential question at a time unless the user requests a batch review.
- Update the living document's last-updated date and decision log as durable decisions, exclusions, concerns, and changed preferences emerge.
- Do not announce or begin implementation planning merely because one option is currently favored or one question was answered.

## Maintain the living document

Create or update:

```text
.agent/brainstorms/{kebab-case-topic}.md
```

Use a concise kebab-case topic derived from the request. If continued discussion is clearly about an existing brainstorm, update that document instead of creating a duplicate. Preserve useful prior reasoning, revise the current direction as decisions change, and append durable insights to Notes.

Anchor the discussion historically. Record the document status, creation and update dates, the inspected repository commit, and the `STATUS.md` state at the start. Keep that context snapshot stable; if repository state changes during a long discussion, append a dated context update rather than rewriting history.

Use this structure:

```markdown
# Brainstorm: Topic

> **Status**: Active
> **Started**: YYYY-MM-DD
> **Last updated**: YYYY-MM-DD
> **Repository baseline**: `<commit>`

## Context Snapshot
- Repository and implementation state when exploration began
- Active handoff and canonical documents consulted
- Important known constraints or unresolved decisions at that time

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

## Decision Log
| Date | Decision | Context |
| --- | --- | --- |
| YYYY-MM-DD | Accepted choice or changed direction | Why it was chosen given the known state |

## Notes
- Decisions and insights captured as the discussion evolves
```

After writing the document, summarize the most important options and open questions for discussion.

## Close the brainstorm explicitly

When the meaningful questions have been discussed:

1. Summarize the proposed direction, accepted decisions, explicit exclusions, and any remaining uncertainty.
2. Ask the user whether the brainstorm is accepted and ready to become an implementation plan.
3. Remain in brainstorming until the user explicitly approves that transition. Agreement with an individual choice is not approval of the whole direction.
4. Change the document status to `Accepted — Ready for planning` and record the dated approval in the decision log so a later planning session can verify the handoff.

## Preserve history

- Never delete a brainstorm merely because its direction is old, implemented or replaced.
- When later work replaces an accepted brainstorm, mark it `Superseded`, date the change and link to its successor. Do not rewrite the original context snapshot or decision history to match current knowledge.
- Continue updating one active brainstorm while the same decision is under discussion. Create a successor only when a previously accepted direction is materially reopened or a distinct goal warrants its own history.
- Treat `STATUS.md` as the live handoff and the brainstorm snapshot as historical evidence; do not make either pretend to serve both purposes.

## Boundaries

- This is exploration, not planning: do not create task lists, implementation sequences, or code.
- Focus on what and why. Include technical detail only when it explains a constraint or tradeoff.
- Keep options honest and materially distinct; do not hide complexity to make an option look preferable.
- Do not implement the feature or mutate unrelated files while brainstorming.
