---
name: reflect
description: Review the current session and touched artifacts for recurring knowledge gaps, verify every proposed correction, and request approval before updating repository rules or skills. Use at the end of a substantial task, after user corrections or dead ends, or when asked to reflect; stop without edits when the session revealed no durable gap.
---

# Reflect and Update Knowledge

Close durable knowledge gaps so future agents avoid repeated mistakes. Optimize for signal, not volume. A correct decision to make no knowledge change is a successful result.

Invoke as `$reflect`.

## Required workflow

Read [references/retrospective-workflow.md](references/retrospective-workflow.md) completely before starting. Review the available conversation and all artifacts touched during the session. When conversation history is compacted or incomplete, do not reconstruct claims from memory; verify them from current artifacts or mark them unverified.

Before proposing any rule or skill edit:

1. Look for `.cursor/skills/authoring-rules-and-skills/SKILL.md` and read it completely if it exists.
2. If it does not exist, use the available `skill-creator` guidance for skill authoring and current repository conventions for rules. Do not create or cite the missing Cursor skill merely to satisfy this workflow.

## Non-negotiable gates

- Be direct. Do not invent friction, pad praise, or manufacture a documentation need.
- A trivial session with no durable gap ends after the retrospective.
- Verify every concrete claim in the current session before it can enter a proposal.
- Prefer correcting an existing canonical source. A new rule or skill is the last resort.
- Propose no more than five changes, ranked by impact.
- Present the evidence-backed proposal and ask `Approve? (y / edits / no)`.
- Do not edit any knowledge file before explicit approval.
- Approval covers only the approved rows; material changes require a revised proposal.
- Re-read and validate every applied edit, then report a one-line diff summary per file.
- Do not commit or push.
