---
name: review-support-and-feedback
description: Review shared BFF support queues, bot runs and submitted feedback for a named Business, recommending follow-up and concrete improvements; not provider configuration or automatic sending.
---

# Review support and feedback

Read STATUS and the requested Business's current product/operations documents.
Use `pnpm bff:environment -- --help` for maintained command syntax. Shared
tooling stays generic; Business knowledge and evaluation cases remain local.

Use admitted operator authentication held in `BFF_OPERATOR_TOKEN`, never a
deployment/admin key. `support-queue`, `support-case` and `support-runs` invoke
the same guarded APIs as the backoffice. Respect pagination and coverage; a
loaded page or recent sample is not a complete total.

Review longest-waiting Open work and delivery exceptions, then submitted ratings
and comments alongside the actual sent answer and relevant permitted facts.
Separate product/content gaps, bot mistakes and operational failures. Silence
is not satisfaction; link openings are not submitted feedback. Describe actual
invitation/submission counts and sample size before interpreting participation.

Recommend follow-up, knowledge fixes or sanitized regression cases. Inferred
topic/frustration labels are uncertain signals. Do not merge identity from email,
expose private notes to customers, or enable automatic sending during review.

For an authorized response, save the current draft, prepare the full envelope,
and show the exact recipient, body and closing-survey choice. Send only after
an explicit decision for that exact pending ID via `support-send-reply
--confirm-send`. New messages/changed drafts require fresh review; read tools
need no per-tool approval. Preserve unsent edits.

For a bot miss, use [evaluate-bot-regressions](../evaluate-bot-regressions/SKILL.md).
Never copy raw customer transcripts or secrets into repository fixtures.
