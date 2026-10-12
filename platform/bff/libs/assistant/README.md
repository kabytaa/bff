# Shared assistant library

The independent public library supplies AI SDK protocol/model adapters, not
customer authorization or durable storage. Business definitions/content are
supplied by callers; server code owns histories, permitted tools and scope checks.

Entry points are separated to keep credentials and provider code out of browsers:

- `@bff/assistant`: browser-safe types, generation bounds and context/result correlation.
- `@bff/assistant/react`: helper UI (AI SDK React), Business presentation/routes supplied by its caller.
- `@bff/assistant/server`: `prepareAssistantKnowledge`, `selectAssistantKnowledge`, `composeAssistantInstructions`,
  `fitAssistantHistory`, `generateAssistantTurn`
  and `createAssistantUIResponse`.

`composeAssistantInstructions` supplies versioned generic behavior for helper
and support roles: answer the question, load relevant assigned knowledge before
factual advice, prefer verified current facts to assumptions, acknowledge unknowns,
and keep explanations concise without exposing internal skill/tool keys. Its one
language rule is to reply in the customer's language unless another is requested;
there are no language-specific dictionaries or Business facts in the shared prompt.
The caller supplies bounded Business guidance, skill descriptors (`key`, `name`,
`whenToUse`) and optional primitive page observations in distinct JSON sections.
`prepareAssistantKnowledge` chooses all-inline or all-lazy from caller-authorized
assigned files. Auto supplies all files when full descriptor/content JSON is at
most 10,000 UTF-8 bytes; larger corpora stay lazy. Explicit inline above the bound
rejects rather than silently truncating; explicit lazy supports controlled comparisons.
The preparation returns `strategy`, descriptors, versioned `suppliedKnowledge`,
serialized byte size and `requireInitialKnowledge`. Small supplied knowledge is
labelled facts, not higher-priority instructions, and removes the redundant
`loadSkill` model tool; scoped customer/page tools remain available. Larger skill
content is loaded lazily through authorized tools. Customer text,
retrieved knowledge and browser observations cannot expand permissions or override
shared rules. Use this same composer in real inference and evaluation so tests
exercise the deployed behavior; version reports with `ASSISTANT_INSTRUCTIONS_VERSION`.
Support reads remain automatic and scoped; support output is only a suggested
reply awaiting the operator's exact Send. Prompt instructions reinforce, but do
not replace, backend authorization. Model, tools, limits and durable state remain
the caller's existing contracts.

[knowledge-selection.ts](src/knowledge-selection.ts) supplies the bounded Jev
metadata contract. Operator experiments retain their separate, explicitly enabled
route; `selectAssistantKnowledge` uses the separately gated runtime selector.
It builds independent relevance decisions from assigned names/when-to-use
descriptions and bounded question/history data, without knowledge contents or
test expectations. Opaque IDs map back only to the caller's assigned keys;
the complete native request must fit 24,000 UTF-8 bytes. Strict response parsing
preserves actual model identity and measured usage; missing usage is unknown.
`selectAssistantKnowledge` accepts caller-authorized assignments and an optional
Business-owned `mandatorySkillKeys` subset. It first validates the complete
assigned inline fallback (10KB), metadata/history and native request bounds.
Legitimate question/history projections exceeding the selector's narrower limits
return full assigned `input-bounds` fallback with zero calls, without truncation;
invalid assignments, roles or content and oversized complete fallback still fail.
The caller must also compose and fit complete fallback instructions/history
before selection so a combined-context overflow causes no paid work. It makes
at most one runtime selection request with a 10-second network deadline and no
retries; malformed/empty/ambiguous output or provider failure supplies **only all
assigned** content. Explicit caller cancellation propagates instead of starting
fallback work. Missing usage remains unknown; timeout cannot prove the provider
incurred no usage. Mock mode makes no request and marks its full fallback.
The returned preparation has a `selection` diagnostic with selected/effective/
mandatory keys, fallback classification, actual model version, measured usage and
zero/one selector calls. It does not store data or execute tools. Shared code
contains no Business keys/content or account/page secrets in selector input.
Thresholds are fixed checkpoint choices, not calibrated confidence; selection
grants no permissions. Every inference requires the same verified Gateway caps;
intentional evaluation also retains its combined cost bound.
Jev is a third-party model needing existing prepaid credits; no billing
change or model-quality claim follows from the offline tests. Authorized prepaid
setup and live evidence belong in the existing provider/Business work records.

The React entry imports reusable, component-scoped default styles. Helper,
contact/feedback and survey components accept `className` and `style`; a Business
can also inherit `--bff-support-*` CSS variables from its own wrapper. Common
tokens include `accent`, `text`, `muted`, `surface`, `surface-soft`, `border`,
`field-border`, `font-family`, `font-size`, `radius`, `button-radius`, `spacing`,
`gap` and `focus`. For example, `style={{ '--bff-support-accent': '#006644' }}`
changes the accent without copying component markup or CSS. The stylesheet does
not style the host app globally; keep Business-specific layout/branding local.
`BffHelpSurface` supplies the controlled persistent Help bubble and native modal:
a desktop panel and a full-height phone sheet, Escape/Close, unique accessible
dialog IDs and focus return. Supply `open`, `onOpen`, `onClose`, `title` and the
helper/contact children. Closing preserves mounted unsent state; the caller must
remount identity-scoped children on account/user/environment changes. The surface
does not call a model or acquire permissions. Place it once in the Business root
so authentication/setup routes retain Help. Keep prominent Feedback separately.
Its theme also accepts `panel-surface`, `panel-spacing`, `launcher-bottom`,
`launcher-right` and `launcher-z-index`; Business layout sets navigation clearance.
Use `layout="chat"` for a mounted helper and `layout="content"` for contact/forms;
the optional `subtitle` describes the current view without changing its accessible
title. Chat has an independently scrolling transcript, aligned message bubbles
and a pinned, one-row composer that grows to five lines. `BffHelper` accepts
Business-owned `suggestions`, `welcomeTitle` and `welcomeDescription`. Secondary
links are collapsed under Browse help links; contact and feedback stay available.
Enter sends, Shift+Enter adds a line, and composition/repeated key events do not
send. Opening never focuses the textarea automatically. Sending clears only the
submitted text, preserving a new draft typed while the answer arrives. Explicit
retry reuses the failed question rather than adding a duplicate; Stop and error
states remain visible. Auto-follow respects readers who scroll back and offers
Jump to latest above the composer, including multiline drafts. Phone sheets
track unzoomed [VisualViewport](https://drafts.csswg.org/cssom-view/#the-visualviewport-interface)
height/offset with `100dvh` fallback; listeners are removed on close and pinch
zoom remains native. Changing Help/contact views focuses the updated heading,
while ordinary rerenders do not steal focus. These are presentation behaviors, not authorization or live-AI
activation.
Assistant replies render [Markdown](https://github.com/remarkjs/react-markdown)
with [GFM lists/tables](https://github.com/remarkjs/remark-gfm); customer text stays
literal. Raw HTML is discarded and images never fetch remote bytes. Links must
match a registered safe Business destination and use its existing renderer; no
arbitrary model URL becomes clickable. Adjacent assistant tool/answer steps form
one display bubble, with each destination offered once. Repeated standalone links
are omitted, while inline references retain their readable text. This does not
rewrite SDK/stored messages or change feedback correlation, tool permissions or
customer-chosen navigation.
Chat prose uses per-block text direction and logical alignment. Predominantly
RTL text stays right-to-left even when it starts with a Latin product name;
other blocks and the composer use `dir="auto"`. Registered links are isolated
with `bdi`, and code stays LTR. The dialog controls are not mirrored. This
follows the [HTML direction/isolation approach](https://www.w3.org/International/questions/qa-html-dir.en.html),
with a display-only dominant-script heuristic for mixed-language prose; it is
not language detection, translation or a model-quality check.
`BffContactForm.additionalPrivacyNotice` appends caller-owned plain text to the
generic credential/payment warning; it is not HTML or a server permission rule.
The library build retains the imported CSS beside the compiled React entry.

`generateAssistantTurn` with `purpose: 'runtime-answer'` fixes the customer
checkpoint to Gemma 4 26B and uses `/v1/runtime/chat/completions`. Omitted
`modelKey` or the exact Gemma key is accepted; other models reject before IO.
`assistantModel` identifies that fixed runtime model. Existing explicit comparison
`purpose: 'answer'` (and its historical Qwen default) remains separate from this
customer path. Comparison candidates and the private judge route cannot
be selected by customer input or used as automatic fallbacks.
It rejects unverified caps, oversized context and invalid generation bounds.
Allowed read tools may provide `execute`; browser tools omit it and are returned
as pending calls. SDK7 reports calls across all steps, so completed server-tool
results are excluded from pending browser work. The helper automatically resumes
only newly collected browser results, not completed tool parts retained on a
reused assistant message. No send tool exists. A support result becomes a stored draft;
only the authenticated operator exact Send transition authorizes mail delivery.

For lazy assigned knowledge, set `requireInitialKnowledge: true`. Its first
model step offers only the executable `loadSkill` tool and requires a call; later
steps restore automatic selection across permitted reads/browser tools. This
uses AI SDK [`prepareStep` and tool choice](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#preparestep-callback),
without adding steps or relaxing caps. The option fails closed without the
authorized read, a successful first read or room for a subsequent answer step.
Convex authorizes assigned knowledge before preparation on each run, including
browser continuations; public history does not retain private skill results.
`await fitAssistantHistory(instructions, messages, tools)` budgets the exact
24,000-byte Worker-native payload, including the serialized system-message
envelope/JSON escaping, SDK-converted schemas and native function wrappers.
This tools-aware overload uses the pinned SDK's internal prompt/schema converters,
never a model call, tool handler or asset download. Existing two-argument callers
retain the synchronous legacy history-only API; all paid server steps use the
tools-aware form, even when the tool set is empty. Runtime callers must use it
for full assigned fallback **before** Jev, then again for selected knowledge.
It trims only oldest complete history
entries, preserving the newest customer question and browser call/result suffix;
essential oversize context fails rather than truncating the knowledge or question.
Each subsequent SDK model step applies the same check to new tool results before
making another request; oversized essential knowledge fails before that paid call.
Judge calls use their own rubric and leave the knowledge option
off; shared bot behavior is not a grading prompt. Requiring retrieval does not
prove that the model chose relevant knowledge or answered correctly—real quality
evaluation still checks both.

The generated turn retains its SDK `finishReason` and actual usage. Non-empty
`length`, filtering or error output is not a completed answer. Runtime records a
visible failed run rather than saving such text as a successful reply; evaluations
must reject these terminations while retaining usage evidence.

Mock mode makes no provider call or tool execution and labels its answer as a
development mock. UI stream emission serializes a completed saved turn; it does
not claim live incremental model generation. `data-session` carries the saved
conversation/capability and mock flag; persist the checkpoint before responding.
Accept client results only against saved pending IDs and unchanged current context;
the correlation helper does not replace authentication or content validation.

Run under Node24: `pnpm exec nx run bff-assistant:test`, `:typecheck`, `:lint`,
and `:build`. AI SDK7 requires Node22+ and ESM. Current exact versions are pinned
at the repository root; no hosted Vercel provider is configured or required.
