# Retrospective workflow

## 1. Review the session and artifacts

Scope the review to the available conversation plus artifacts the session read or changed.

Inspect the working tree, staged changes, and untracked files. When work spans committed branch changes or a pull request, inspect the full relevant branch diff using the configured PR tool or a verified merge base. Do not assume the base branch is named `main`. Avoid unrelated repository history.

Catalog concrete instances of:

1. User corrections. Treat each correction as a potential knowledge gap.
2. Dead ends: failed commands, wrong paths/imports/conventions, or invalid architectural assumptions.
3. Questions asked of the user that repository knowledge should have answered.
4. Discovery cost: facts that required more than two distinct searches to locate.
5. Rules and skills relied upon that were stale, incomplete, or misleading.
6. Rules and skills that should have triggered but did not, including weak descriptions.
7. Repeated mistakes. The same mistake twice is a high-impact candidate.

Do not treat ordinary exploration, expected test iteration, or a one-off product decision as a documentation failure.

## 2. Write the retrospective

State:

- **What went well**: one to three specific bullets.
- **What went poorly**: cite the relevant file, command, or conversation event.
- **Root cause** for each failure: missing docs, stale docs, weak description, ignored rule, hallucinated API, or another concrete cause.
- **Understanding gaps**: what remains unclear.

If no durable friction or repeatable gap exists, say the session was trivial for knowledge maintenance and stop. Do not propose or edit files.

## 3. Choose one action per gap

Search existing knowledge before creating anything. Use `rg` across the directories that exist, including `.agents/skills/`, `.cursor/rules/`, `.cursor/skills/`, `.claude/skills/`, `AGENTS.md`, and relevant repository documentation.

Choose exactly one:

1. **Fix an existing rule or skill** — preferred when a canonical source exists.
2. **Tighten an existing description** — use when the guidance exists but did not trigger for the real query.
3. **Create a rule or skill** — only when no existing source covers the gap and at least two future agents are likely to encounter it.
4. **Promote to an always-applied rule** — only when the repository already supports that mechanism, the guidance is repo-wide, and the proposal gives explicit justification.
5. **Do nothing** — use for session-specific knowledge, already documented facts, weak evidence, or low expected impact.

One gap gets one action. Do not duplicate the same guidance in multiple files.

## 4. Verify every proposed claim

No evidence means the claim is dropped or placed in the unverified section.

| Claim | Required current-session verification |
| --- | --- |
| File or directory exists | Resolve it with `rg --files`, `find`, or `ls` |
| Symbol exists | Search the identifier and read its definition |
| Enum or constant value | Read the definition and confirm the value |
| Package/task command | Read the manifest, then trace the script to the invoked tool or subcommand |
| Behavior or wiring | Read the implementing source and cite the relevant current line |
| Configuration behavior | Open the actual config rather than inferring defaults |
| CLI flag or syntax | Run local `--help` or read the current CLI definition |
| “Used in A, B” list | Verify each listed use independently |

Past sessions and remembered paths are not evidence. Two verified examples support a list of two, not a broader universal claim.

For durable knowledge, prefer search pointers such as `search "<symbol>" under <area>` over brittle line addresses. File-and-line citations belong in the temporary proposal evidence, not necessarily in the durable rule.

## 5. Check discoverability and impact

For each candidate:

- Confirm its filename, description, and keywords would match the query that revealed the gap.
- Require plausible reuse by at least two future agents; otherwise choose Do nothing.
- When broadening a claim, run a counter-search for exceptions.
- When broadening a skill description, re-read its full body and verify that it serves the new trigger without misrouting unrelated work.
- Prefer deletion of stale guidance over adding compensating text.

## 6. Propose and wait

Present exactly this structure:

```markdown
## Retrospective
<direct, specific assessment>

## Gaps
1. <gap> — <root cause>

## Proposal (ranked by impact, ≤5)
| # | Gap | Action | File | Risk | Verified evidence | Rationale |
| - | --- | ------ | ---- | ---- | ----------------- | --------- |

## Unverified / dropped
- <claim> — searched <location or command>, no evidence. Confirm?

Approve? (y / edits / no)
```

Use `low` risk for deletion or typo fixes, `med` for wording/pointer changes, and `high` for new behavioral claims or files. “Verified evidence” must name the command or read and the current `file:line` supporting the proposal. Empty evidence disqualifies the row.

Do not edit during this phase. If the user requests edits to the proposal, re-verify changed claims and present the revised table.

## 7. Apply only approved edits

After explicit approval:

- Follow the repository's verified authoring guidance and the approved rows only.
- Reference canonical source locations instead of copying substantial implementation detail.
- Use search pointers or symbol names for facts likely to move.
- Include a short re-verification hint for durable behavioral claims.
- Keep code/config excerpts under roughly ten lines; link or point to the source instead.
- Count deletion of stale or incorrect material as an improvement.

Before saving the final result, re-read the entire edited section and its surrounding file. Check for duplication, contradictions, incident-specific overfitting, copied material that should be a pointer, and a description/body mismatch.

## 8. Post-edit sweep

Before reporting completion:

1. Re-run the lookup for every path, symbol, command, and behavior added.
2. Validate changed skill frontmatter and run the available skill validator.
3. Search other rules and skills for contradictions in the concepts changed.
4. Re-check that descriptions match the originating query without becoming catchalls.
5. Inspect the final diff and confirm no file outside the approved gap scope changed.
6. Do not commit or push.

Report one line per changed file describing additions, corrections, and deletions. State any approved item that could not be applied and why.

## Definition of done

- Every concrete claim in an edit was verified during this run.
- All cited files and symbols exist.
- Durable content points to canonical sources rather than duplicating them.
- Descriptions trigger for the gap that motivated the edit.
- Stale or wrong guidance is removed rather than preserved for history.
- Only approved knowledge files were changed.
- The user approved the proposal before edits.
