# TableCards market research

Created: 2026-09-27  
Last updated: 2026-09-27  
Status: Desk research complete; awaiting product brainstorm  
Repository baseline: `328e108` on `main`

Successor discussion: [TableCards product and launch brainstorm](../../.agent/brainstorms/260927-tablecards-product-and-launch.md)

## Purpose and decision boundary

This report tests the current TableCards hypotheses against current competitor offers, public customer problems, standard print products, adjacent market data and current image-generation economics. It is evidence for the next product brainstorm, not an accepted change to the canonical [TableCards specification](../products/tablecards-mvp.md).

Desk research can establish that a problem and market behavior exist. It cannot establish TableCards' conversion rate, willingness to pay, customer-acquisition cost or repeat retention. Those require conversations, real workflows and eventually paid behavior. Recommendations below are therefore labeled as hypotheses to decide and test rather than silently becoming product scope.

Research was checked on 2026-09-27. Prices are snapshots and must be rechecked before launch.

## Executive conclusion

TableCards addresses a real but crowded job: turn a spreadsheet of distinct guest names into a correctly arranged downloadable PDF without manual mail merge, duplicated Canva pages or print-layout mistakes. TableCards does not print or ship cards; the customer prints the PDF themselves or takes it to a printer. The strongest purchase value is not “design place cards.” Canva and Avery already do that well. It is:

> Turn the guest spreadsheet and existing event artwork into a verified, correctly sized PDF in minutes.

The current physical format is well chosen for the US: Avery sells a 3.5 × 2 inch folded 5302 card, four per US Letter sheet, with free design software. The proposed 25-card Free boundary also has direct precedent. A typical US wedding is much larger, however: The Knot reports an average of 117 guests for 2025. A 25-card export is therefore a useful small-event product and a meaningful trial, but usually not a complete wedding.

Five changes deserve serious consideration in the brainstorm:

1. Consider a one-time event purchase alongside subscriptions, but do not assume a generic PDF supports a high price. Direct PDF-only competitors range from free to roughly $5–$13, while $19–$49 one-event offers generally include broader seating/event capabilities.
2. Treat Excel/XLSX, pasted spreadsheet rows, understandable column mapping and last-minute row correction as more important than a large template library.
3. Reconsider requiring Google login before a visitor can experience any generator value. Several alternatives allow a draft or core editing without an account; requiring login for save/export is a lower-friction boundary to test.
4. Make uploaded/matching artwork and print certainty the core paid story. AI background generation is a promising optional paid experiment, not a market-proven must-have or moat.
5. Do not expand into seating charts, RSVP management, QR lookup, arbitrary canvas editing or print fulfillment in the first launch. Those are separate products and weaken the five-minute workflow.

The recommended first customer remains a repeat independent planner, stationery designer or small studio because repeat use supports saved presets and subscriptions. Occasional couples are a larger-volume segment but expect a one-time purchase and low-friction workflow. The cheapest initial acquisition is direct customer discovery and concierge pilots, followed by high-intent SEO and Pinterest content. Paid advertising should wait until the page and purchase flow convert organically.

## Evidence quality

| Evidence type                      | What it can support                           | Main limitation                                        |
| ---------------------------------- | --------------------------------------------- | ------------------------------------------------------ |
| Official product and pricing pages | Current features, limits, prices and formats  | Competitor claims do not prove usage or satisfaction   |
| Official market/occupation sources | Broad market scale and customer context       | The categories are wider than printable place cards    |
| Public customer discussions        | Concrete language and recurring workflow pain | Self-selected anecdotes, not representative samples    |
| Provider documentation             | Technical feasibility and input cost          | Does not prove customers value the feature             |
| This report's recommendations      | Testable product and launch hypotheses        | Not validated decisions or willingness-to-pay evidence |

## Market and buyer segments

### Broad demand exists

- The Knot's 2026 study reports about 2 million US weddings in 2025, over $100 billion in event spending and an average of 117 guests, based on 10,474 US couples. That is a large recurring event stream, but not TableCards' serviceable market by itself. ([The Knot study](https://images.theknot.com/rules/2026/the-knot-real-weddings-study-data-read-out-2026.pdf))
- The US Bureau of Labor Statistics reports about 172,100 meeting, convention and event planner jobs in 2025, with 10% self-employed and 16,800 projected openings per year. This is a useful pool for repeat-buyer discovery, not a count of place-card buyers. ([BLS Occupational Outlook](https://www.bls.gov/ooh/business-and-financial/meeting-convention-and-event-planners.htm))
- Avery currently sells 160 compatible 5302 cards for $22.99. This makes home printing economically plausible for a wedding-sized list before software or ink. ([Avery 5302](https://www.avery.com/products/cards/5302))

### Buyer hierarchy

| Segment                                       | Primary job                                                    | Purchase pattern        | Likely valued capabilities                                                                            | Commercial implication                                  |
| --------------------------------------------- | -------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Independent planners and stationery designers | Produce different branded events quickly and safely            | Repeated                | Reusable presets, duplicate event, Excel import, own artwork, reliable proof, last-minute corrections | Best initial recurring buyer hypothesis                 |
| Small planning studios and venues             | Standardize work across several people/events                  | Repeated, collaborative | Shared presets, roles, multiple active events, consistent output                                      | Higher-value but team demand must be verified           |
| Couples and occasional hosts                  | Finish one event without learning mail merge                   | Once or rarely          | No-surprise setup, one-time price, attractive design, own artwork, simple printing                    | Large volume; subscription-only pricing is a mismatch   |
| Local print shops and event producers         | Accept customer data/artwork and produce variable-name batches | Repeated                | Exact templates, artwork upload, preflight, export reliability                                        | Potential customer and distribution partner             |
| Corporate/nonprofit dinners                   | Make functional cards from office spreadsheets                 | Occasional/repeated     | Excel, logos, clear typography, table/meal markers                                                    | Secondary market; wedding styling should not prevent it |

## The customer problem in their own workflow

Public discussions repeatedly describe the same gap:

- Canva users can design a card but struggle to print a different name on every card, tile several cards on one sheet and preserve the intended size. One buyer explicitly wanted to avoid creating 100 individual templates. ([weddingplanning discussion](https://www.reddit.com/r/weddingplanning/comments/1v7p8zf/place_cards_with_guest_names_on_canva/))
- People report creating one page per guest, finding that a print service duplicates only the first page, and then manually tiling files or taking them to a local print shop. ([printing discussion](https://www.reddit.com/r/weddingplanning/comments/1d5dern/where_to_print_menuname_cards/))
- Another workflow for 50–200 cards was: design in Canva, insert into an Avery 5302 template, duplicate, flip and center sets of four, then print. That is precisely the manual chain TableCards can remove. ([mail-merge discussion](https://www.reddit.com/r/MicrosoftWord/comments/1kbogil/mail_merging_into_custom_table_name_cards/))
- Users recommend testing the longest name, importing spreadsheet data and printing at actual size; confusion around sizing and card orientation is common. ([Canva workflow discussion](https://www.reddit.com/r/wedding/comments/1e34gst/how_to_make_table_setting_cards_on_canva/))

These are anecdotes, but the workflow repeats across years and communities. The outcome to validate with real buyers is “correct personalized batch with no layout work,” not simply “pretty cards.”

## Competitive landscape

| Alternative                                                                                                                           | What it proves                                                       | Current offer or limitation                                                                                                                                                                     | TableCards implication                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [Avery Design & Print / 5302](https://www.avery.com/products/cards/5302)                                                              | Standard format and free design tooling are established              | 3.5 × 2 inch folded card, four per Letter sheet; 160 physical cards for $22.99                                                                                                                  | Exact Avery compatibility is more valuable than inventing a new size                                                                        |
| [Canva place-card templates](https://www.canva.com/place-cards/templates/) and [Bulk Create](https://www.canva.com/help/bulk-create/) | Buyers expect abundant design choice and spreadsheet personalization | More than 1,000 templates; Bulk Create accepts CSV/XLSX and previews hundreds of variations, but it is a Pro desktop workflow and users still report print-layout confusion                     | Do not compete on general editing; compete on a shorter purpose-built path and verified output                                              |
| [PlaceCard.us](https://placecard.us/pricing)                                                                                          | One-time event pricing and richer spreadsheet input are normal       | Current offers: up to 100 guests for $19, 500 for $69; promotional prices shown as $12.90/$39; $149 lifetime shown as $99; Excel/CSV/Google Sheets, PDF/image, table/seat/meal and tent layouts | A one-time offer, XLSX/Sheets support and a 500-record bound merit testing                                                                  |
| [PlaceCard.live](https://placecard.live/pricing)                                                                                      | Free 25 and event-vs-professional segmentation have direct precedent | Free draft to 25; $29 one event/250 guests; $49 one event/1,000; $39/month Professional; $79/month Agency                                                                                       | Strong support for Free 25 and separate one-time/recurring offers, although this product sells digital guest lookup rather than print cards |
| [ToolBrim](https://toolbrim.com/pricing/)                                                                                             | A narrowly comparable digital-only event pack can be inexpensive     | $4.99 one-time for print-ready PDFs for up to 500 guests, 90 days of edits/re-exports; explicitly excludes paper, printing and shipping                                                         | A PDF-only Event Pass near $5 has stronger direct support than $12                                                                          |
| [PrintMigo](https://printmigo.com/place-card-maker/)                                                                                  | Generic place-card PDF generation is commoditized                    | Free, no sign-up or watermark; templates, names/table/meal/custom text, preview and PDF/PNG export                                                                                              | Basic PDF generation alone may not be chargeable                                                                                            |
| [Cardwren](https://cardwren.com/)                                                                                                     | Even AI place-card backgrounds have a free competitor                | Advertises free AI design, 60+ templates, artwork upload, guest/table input and unlimited PDFs without sign-up or watermark                                                                     | AI is not enough by itself to justify payment; workflow quality and reusable professional value must differentiate                          |
| [Place Cards iOS](https://apps.apple.com/ca/app/place-cards/id6802176936)                                                             | Users expect print-oriented convenience                              | CSV, Letter/A4, flat/folded, meal markers, full-page preview, AirPrint, offline core, no account; Free has watermark                                                                            | Preview, actual-size guidance and low-friction use matter; watermark is not required to establish a paid boundary                           |
| [Canva/Etsy templates](https://www.etsy.com/listing/777670639/minimalist-place-card-template-printable)                               | Design files themselves are inexpensive                              | Typical editable templates can cost only a few dollars; buyer still does personalization/layout                                                                                                 | Premium design count alone is a weak differentiator                                                                                         |
| Printed stationery providers such as [Shutterfly](https://www.shutterfly.com/a/wedding-guest-cards/)                                  | Done-for-you printing is the higher-price substitute                 | Current place-card offers vary by promotion and commonly price per card                                                                                                                         | DIY software can save meaningful money, but must be dramatically simpler than manual DIY                                                    |

Batch generation is already available in Canva and focused tools. It is necessary, not unique. The differentiation to test is the combination of spreadsheet tolerance, existing-artwork reuse, exact print preflight and a very short end-to-end workflow.

## Expected and missing capabilities

### Expected before asking a buyer to pay

1. **Tolerant import and review.** Preserve every row and duplicate; accept pasted names and CSV at minimum. XLSX is strongly indicated by competitor behavior. A review screen must show row count, mapped columns and problems before generation.
2. **Fast correction without redoing the project.** A user needs to fix a spelling, table number or late guest after import. This can be a bounded imported-row editor; it does not require building a guest-management system.
3. **Full-batch preview and preflight.** Show every card, the sheet arrangement, longest-name problems, unsupported characters, image-resolution failures and the final count before download.
4. **Exact printable output.** US Letter, 100% / Actual Size instructions, cut/fold marks and a measurable scale check are central product value, not implementation detail.
5. **Own artwork.** Repeat planners and couples often want cards that match invitations or event signage. Uploading a background is more directly supported by buyer workflows than building a large proprietary template library.
6. **Clear data handling.** Guest names are personal event data. Users should know whether the list is saved, for how long and how to delete it.

### Capabilities to test rather than assume

- **Meal or dietary marker.** It appears in several focused products and customer workflows, but a full caterer workflow is unnecessary. The smallest test is one optional short marker/label column whose meaning belongs to the user.
- **Google Sheets import.** Buyers use Sheets, but a direct integration adds permissions and failure modes. Accepting pasted tabular data or downloaded XLSX may satisfy the job first.
- **Saved projects and event duplication.** Likely important for repeat planners; less important for one-time couples. This is a retention feature and should be tested with professionals.
- **Team collaboration and 20 seats.** Competitors charge materially more for 5–15 collaborators. The current $19/20-seat hypothesis may be overly generous, while the feature itself may be unnecessary until more than one real studio asks for it.
- **AI-generated backgrounds.** Feasible and visually marketable, but current focused place-card competitors sell import/layout reliability rather than AI. Treat it as a paid experiment.

### Redundant or harmful for the focused MVP

- Seating-chart construction, RSVP management, public guest lookup and QR event pages.
- A general canvas/design editor that recreates Canva.
- Arbitrary card sizes, many paper presets and print fulfillment before the one standard is trustworthy.
- A deep meal, allergy or caterer-management model.
- A large design marketplace or a promise to release designs continuously.
- AI-generated names, guest data or text baked into backgrounds.

These may be valid separate products. They do not improve the core promise enough to justify launch complexity.

## Format, page size and quantity findings

### Recommended launch format

Keep the current US launch contract:

- US Letter, 8.5 × 11 inches.
- 3.5 × 2 inch finished folded tent card.
- Four cards per sheet.
- A plain-cardstock layout and an explicitly tested Avery 5302-compatible layout if their physical geometry differs.
- Name/design visible on both sides, actual-size instructions and a scale-check page.

Avery independently validates this size and sheet count. The layout still needs a physical 5302 test because nominal card size alone does not prove printer margins, orientation or perforation alignment.

A4 is a visible competitor expectation, but not a US-launch blocker. It should be the first added page format only after US output works or non-US demand appears. Flat cards and arbitrary dimensions remain later features.

### Quantity boundaries to take into the brainstorm

- **Free:** 25 cards per usable project/export is strongly supported by the PlaceCard.live free tier. At four cards per sheet, that is seven card sheets plus the scale-check page. It is enough for a dinner or micro-event, but below the 117-guest wedding average.
- **Paid event:** 250 cards covers roughly twice the reported average wedding; 500 covers unusually large wedding and event use and matches PlaceCard.us. A 500-row launch safety limit is reasonable even if it is not a pricing boundary.
- **Professional:** limits should be expressed in active/saved projects or batches, not only names, because repeat workflow is the value.

The brainstorm must define what prevents trivial Free splitting. The research recommendation is to tolerate some avoidance initially: make one project/export clean and useful up to 25 records, instrument it and avoid invasive lifetime counters until abuse is observed.

### Artwork dimensions

For a 3.5 × 2 inch printed face, 300 pixels per inch corresponds to 1050 × 600 pixels. That is an engineering target, not evidence that every home printer reproduces 300 PPI. The generator should accept higher-resolution images, crop predictably to 7:4, preserve a safe text region and warn below the tested threshold.

An AI provider that permits custom multiples of 16 can generate a 7:4 asset such as 1344 × 768, which is above 300 PPI at the finished face size. Final dimensions and compression need a printed benchmark, not a documentation-only decision.

## Pricing findings

### What the market currently presents

- Direct PDF-only tools range from completely free to low one-time prices. PrintMigo and Cardwren advertise free, no-watermark PDFs; ToolBrim charges $4.99 for up to 500 guests; PlaceCard.us displays a $12.90 promotional Starter price for up to 100 guests.
- The $29–$49 PlaceCard.live event offers include guest-facing seating lookup, QR/event pages and other event-day services, so they are not valid anchors for a PDF-only product.
- Recurring professional offers are higher: PlaceCard.live charges $39/month for up to five active events and $79/month for up to 20, with five and 15 team members respectively.
- A compatible physical pack currently costs $22.99 for 160 Avery cards before ink. This validates the DIY workflow and shows the customer's additional material cost; it is not the price benchmark for TableCards. Low-cost digital templates may be under $10, while focused PDF-generation software is the closer comparison.
- Canva and Avery provide strong free alternatives, so payment must buy saved time, print confidence, reusable brand work or collaboration—not merely access to basic visual templates.

### Pricing hypotheses for discussion

1. Keep a clean Free result up to 25 cards rather than using a watermark.
2. If TableCards charges per event, test roughly $5–$9 rather than $12 for a PDF-only pack. A price above the $4.99 direct benchmark must buy more than generic export—for example uploaded artwork preflight, multiple editable re-exports, a verified Avery layout and possibly one useful AI batch.
3. Keep a recurring individual/professional offer for saved presets, event duplication, higher limits and included AI batches. The current $9/month may be attractive but leaves little room for paid acquisition and support.
4. Price Studio only after interviewing studios. A $19/month plan with 20 seats is far below adjacent team pricing and may bundle a feature buyers do not yet need.
5. Price AI by customer value and included allowance, not raw generation cost. Cheap inference does not prove demand, and failed/regenerated variants create support and cost variance.

These ranges do not validate willingness to pay. A future paid pilot must compare at least one event purchase against one recurring professional offer.

## AI backgrounds and BFF units

### Feasibility

AI background generation is economically feasible without a frontier model:

- Cloudflare Workers AI lists several image models from fractions of a cent to low cents depending on model, dimensions and steps; for example, FLUX 2 Klein 9B is listed at $0.015 for the first megapixel. ([Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/))
- OpenAI's image guide shows older GPT Image 2 examples from about $0.005 for a low-quality landscape image to $0.165 for high quality, excluding applicable inputs; current GPT Image 2.5 is token-priced and must be measured from real usage. ([OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation))

Four alternatives from one user action can therefore be practical, but the exact provider and allowance should follow a quality/cost/latency benchmark. One “background batch” should mean one prompt producing four choices even if the implementation makes several provider calls.

### Product recommendation to test

- Generate decorative backgrounds only. Never send guest names, lists, emails or account data to the model.
- Ask for no words, letters, monograms or logos; overlay deterministic user text in TableCards.
- Produce four visibly different candidates, show print-safe crops and let the user keep one or more according to plan.
- Record the provider/model/version and moderation outcome internally so an output can be reproduced or investigated without storing the prompt forever by default.
- Benchmark at least 20 prompts across minimal, floral, formal, playful and corporate styles. Score first-pass usefulness, typography-safe space, artifacts, latency, generation cost and printed result.
- Do not make AI a dependency for ordinary generation or export. Provider failure must leave uploaded and predefined designs usable.

### Units/balance implication

Image batches are a credible first caller for generic account-owned usage units. A safe flow reserves a typed unit before external generation, then commits on success or releases on failure with an idempotency key. The commercial balance must not live in the ten-minute JWT because it changes independently.

Whether Build 3 should implement a reusable BFF ledger or a narrower product quota is an architecture decision for the brainstorm. Market evidence supports metering a variable-cost action; it does not itself prove that a generic ledger is the smallest implementation.

## Marketing and customer acquisition

### Positioning to test

For an occasional buyer:

> Upload your guest list and artwork. Preview every personalized place card and download an Avery-ready PDF in minutes—without mail merge or manually duplicating names.

For a repeat professional:

> Reuse each client's design, import the latest spreadsheet and produce a checked print batch without rebuilding the layout.

“AI place cards” should not be the primary message until tests show it converts. It describes a feature, while “the correct batch in minutes” describes the paid outcome.

### Where to find likely paying clients

| Priority | Channel                                          | How to use it                                                                                                                                              |                                   Media cost before tools/labor | Why it fits                                                                                                                                                                                                                                                                               |
| -------: | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|        1 | Personalized planner/stationer outreach          | Build a small list from public local directories, Google Maps, Instagram and planner portfolios; ask about the last real batch and offer a concierge pilot |                                                              $0 | Direct access to repeat workflow and artifacts                                                                                                                                                                                                                                            |
|        2 | Local print-shop, venue and caterer partnerships | Ask what variable-name files fail, then offer a co-tested Avery/plain-cardstock workflow                                                                   |                                                              $0 | They see recurring print pain and can refer buyers                                                                                                                                                                                                                                        |
|        3 | High-intent SEO                                  | Publish useful pages for “print place cards from Excel,” “Avery 5302 guest list,” “Canva place cards different names,” and exact-size troubleshooting      |                                                        $0 media | Search language matches observed problems; slower but durable                                                                                                                                                                                                                             |
|        4 | Pinterest organic                                | Publish real card examples, spreadsheet-to-print demonstrations and style collections linked to focused landing pages                                      |                                                        $0 media | Pinterest says users arrive to plan and shop, and recommends fresh weekly content; weddings are a highly plannable life moment ([Pinterest audience](https://business.pinterest.com/audience/), [organic guidance](https://business.pinterest.com/blog/how-to-build-audience-pinterest/)) |
|        5 | Planner referrals                                | Give pilot planners a trackable link and later test credit or revenue share                                                                                |                                     Variable only after results | Trust is likely more valuable than broad reach                                                                                                                                                                                                                                            |
|        6 | Paid Pinterest and Google search                 | Run only after organic/concierge visitors complete the funnel; isolate each channel and keyword/creative group                                             | Suggested experiment, not a market price: $150–$300 per channel | Both are auction systems; CAC cannot be responsibly predicted from public averages                                                                                                                                                                                                        |

Etsy is useful for competitor and keyword research and can cheaply test a compliant downloadable asset: Etsy currently charges $0.20 per listing and 6.5% transaction fees before processing; Offsite Ads can add 15% for shops below $10,000 annual Etsy sales. Selling access to external software must be checked against current marketplace rules, so Etsy should not be assumed to be the SaaS acquisition channel. ([Etsy fee policy](https://www.etsy.com/legal/fees/), [Etsy fee help](https://help.etsy.com/hc/en-us/articles/115014483627-What-are-the-Fees-and-Taxes-for-Selling-on-Etsy))

### Cost and CAC reality

There is no credible CAC number before TableCards has a converting page and offer. Public ad benchmarks would hide keyword, season, geography and product-quality differences. Use controlled budgets and stop rules instead:

1. Customer interviews and artifact review: no media budget; optionally reserve up to $250–$500 for interview thank-you payments if unpaid recruiting stalls.
2. Concierge pilots: no media budget; use real lists and observe time-to-output and support burden.
3. Organic landing/SEO/Pinterest: media cost $0; track labor separately.
4. First paid smoke: at most $300 on high-intent search and $300 on Pinterest, never blended. Stop a channel if it produces traffic but no generator starts or qualified conversations.
5. Scale only from contribution economics. A roughly $5–$9 one-time PDF purchase cannot support the same CAC as a retained professional subscription; cheap organic/partner traffic is especially important for the occasional segment.

Google and Pinterest let advertisers set budgets but use auctions, so actual CPC/CPA must be learned in the account rather than copied from generic benchmark articles. ([Google Ads cost tool](https://ads.google.com/intl/en_us/intl/en_us/home/cost-tool/), [Pinterest campaign objectives](https://help.pinterest.com/en-gb/business/article/campaign-objective))

### Validation sequence before calling the market proven

1. Interview roughly 12 independent planners/stationers, five print shops/venues and eight recent or engaged hosts. Ask for the last spreadsheet, design file and output—not opinions about an imagined feature list.
2. Observe at least five people complete a real batch. Measure import cleanup, time to trustworthy preview, corrections, export success and support questions.
3. Test two offer pages: one-time event purchase and recurring professional plan. Do not show every hypothetical tier.
4. After real payment ships in Build 4, obtain at least three paid pilots from outside personal contacts. A waitlist or “sounds useful” is not paid validation.
5. Look for repeat use from at least two professionals and unsolicited requests for saved presets/collaboration before investing deeply in Studio.

These are pragmatic learning gates, not statistically representative thresholds.

## Independent pricing and acquisition review

An independent Astra review on 2026-09-27 rechecked the direct competitors and challenged the proposed pricing and acquisition model. Its conclusion is deliberately narrower than “validated pricing”: `$0 / $5 / $9 / $19` is a coherent pilot structure, but public competitor pages establish advertised offers rather than TableCards willingness to pay, transaction volume or sustainable customer acquisition.

### Pricing corrections

- **Free, 25 cards** is a useful small-event trial hypothesis. The closest cited 25-card precedent is not a directly comparable PDF-only generator, so the exact limit remains an experiment. The visitor should be able to preview the complete imported list before deciding whether to pay.
- **Event Pass, $5 once** is plausible because [ToolBrim advertises $4.99](https://toolbrim.com/pricing/) for 500 guests and 90 days of revisions. That is an advertised comparison, not evidence of sales. The purchase should complete one event cleanly, including corrections and re-exports, rather than introduce small follow-on charges.
- **Planner Pro, $9/month** becomes cheaper than two $5 passes in a month. It is defensible only when saved designs, duplication and repeat workflow actually save professionals time.
- **Studio, $19/month for five members** is a restrained team hypothesis, but collaboration demand is unproven until real colleagues share projects.
- **$59 and $149 annual prices** discount twelve monthly payments by approximately 45.4% and 34.6%. Those discounts are not market-supported. They should be treated as explicit introductory pricing or withheld until repeat use and renewal behavior are observed.

[Cardwren](https://cardwren.com/) is the strongest warning against feature-checklist positioning: it advertises free AI, artwork upload, 1,000 guests, text fitting, previews, Avery layouts and unlimited clean PDFs. [PrintMigo](https://printmigo.com/place-card-maker/) and [Place Card Me](https://www.placecardme.com/) also advertise core generation and spreadsheet/artwork capabilities. TableCards must therefore prove that it completes a difficult real list reliably, supports last-minute changes and saves repeat workflow—not imply that AI, uploaded artwork or PDF export are unique.

[Paddle's public pricing](https://www.paddle.com/pricing) lists 5% plus $0.50 while directing products under $10 to contact it. Public evidence suggests that this is a negotiated microtransaction schedule rather than a hard minimum selling price: in a [2024 seller discussion](https://www.reddit.com/r/SaaS/comments/1e4tjov/mor_unnecessary_for_low_ticket/), a Paddle representative offered a flat 10% rate below $10 and the seller reported activating it within days; a [2024 filed declaration](https://www.hausfeld.com/media/xeld1lyh/9-25-24-lebsock-korean-national-assembly-testimony.pdf) described Paddle microtransaction pricing as typically about 10% or lower without the fixed component. These are corroborating historical reports, not a current merchant quote. At 10%, a $5 sale would leave $4.50 and a $9 sale $8.10 before AI, infrastructure, refunds, support and acquisition. Paddle must still confirm TableCards' exact one-time and recurring rates, Israeli payout costs, volume requirements and treatment of discounts in writing before public pricing is locked.

The clearest positioning promise to test is:

> Turn your guest list and event artwork into correctly sized place-card PDFs. Check every name, make last-minute changes and print with confidence.

A timed demonstration using difficult names and a physically checked sheet is stronger evidence than a large template count. AI should remain a subordinate optional convenience.

### First-customer validation motion

The recommended first motion is direct learning and sales, not broad advertising:

| Stage   | Action                                                                                                                                                                                                                      | Continue only when                                                                                                                                                                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Recruit | Identify 40 independent planners or stationery designers and 10 local print shops in two US metro areas through public directories, portfolios and local listings; contact them through their own public business channels. | Eight useful conversations occur, and at least five participants show a recent spreadsheet/artwork workflow and explain a real problem. If fewer than five of 50 carefully selected contacts respond, revise the target or message before increasing volume. |
| Observe | Run five real-event pilots with actual artwork, difficult names and final print settings. Measure independent completion separately from founder help.                                                                      | Four of five reach an acceptable PDF within ten minutes without operator repair, no records are missing or duplicated and the output is physically printed and checked.                                                                                      |
| Sell    | After Build 4 has real billing, ask for the actual $5 pass or $9 plan rather than only collecting positive opinions.                                                                                                        | At least three independent buyers outside personal contacts pay the stated price; discounts and concierge-assisted sales are labeled separately, and support time/refunds are recorded.                                                                      |
| Retain  | Observe the next eligible events for 60–90 days. Test Studio only with two real teams that already collaborate.                                                                                                             | At least two professionals complete and pay for a second real event. Studio requires actual colleague participation rather than stated interest in team features.                                                                                            |

Potential recruits can be located through [The Knot's planner marketplace](https://www.theknot.com/marketplace/wedding-planners), [Zola's vendor search](https://www.zola.com/wedding-vendors/search/wedding-planners), planner portfolios and local business listings. These sources are for careful relevance-based discovery, not bulk unsolicited messaging.

The first outreach should ask to observe an existing workflow rather than pitch a feature list:

> Hi [Name]—I saw [specific relevant event/design]. I'm building TableCards to turn an existing guest spreadsheet and artwork into printable place cards, including late name changes. I'd like to see how you handle that step today and try it on a recent or upcoming event. Could I show you a two-minute example?

For print-shop partnerships, begin with shops that already accept customer-supplied PDFs. Give them a physically tested sample sheet and short print instructions, then ask whether customers struggle to supply correctly personalized files. A percentage of a $5 sale is unlikely to motivate meaningful partner promotion; the initial value is fewer bad files and a useful referral option.

For organic acquisition, publish three firsthand resources first: “Print place cards from Excel,” “Avery 5302 print alignment,” and “Use your existing artwork for personalized place cards.” Include real files, measured instructions and examples. This follows [Google's people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content). Pinterest can reuse real print examples and short spreadsheet-to-sheet demonstrations weekly; [Pinterest recommends original weekly content and descriptive search fields](https://business.pinterest.com/blog/how-to-build-audience-pinterest/). Wedding activity on the platform is relevant, but it does not validate this product by itself.

Spend `$0` on ads while the real-file workflow is still being repaired. An illustrative validation allowance is up to `$100` for paper/printing and up to `$150` for recruiting incentives if unpaid recruitment stalls. After self-service payment works, test only one high-intent Google Search campaign with a hard `$150–$200` learning cap. Use [Keyword Planner](https://support.google.com/google-ads/answer/6325025) for current US demand and bid estimates; no keyword volumes, CPC or CAC have been established here.

The low one-time price makes acquisition math restrictive. If measured contribution before marketing were `$4` and purchase conversion were `5%`, break-even CPC would be `$0.20`; neither value is known. Track source → generator start → valid preview → checkout → paid PDF, along with operator minutes, refunds and repeat purchases. Keep guest data out of analytics. Paid traffic should not scale until observed contribution supports its observed CAC.

## Build 3 payment boundary

The accepted Build 3 boundary is a deterministic test/mock payment and entitlement flow only. It must exercise the Free/paid feature gates and any selected AI-unit behavior without a live charge or production customer checkout. Real Paddle products, checkout, verified webhooks, subscription lifecycle and remediation remain Build 4.

The mock should use the same application-facing entitlement contract that Build 4 will drive, but it must be impossible for a production visitor to self-grant paid access. This is implementation scaffolding with a real test caller, not a placeholder billing system.

## Questions for the requested brainstorm

The research reduces the next discussion to these decisions, in priority order:

1. **Offer shape:** subscriptions only, or Free + one-time Event Pass + recurring Pro/Studio?
2. **Free boundary:** exactly what does the 25-card clean export limit count, and how much splitting abuse is acceptable?
3. **Authentication point:** sign in before any generator use, or permit local/draft preview and require sign-in for save/export?
4. **Import contract:** CSV only, CSV + XLSX, pasted spreadsheet grid, or direct Google Sheets integration?
5. **Optional fields:** name/table only, or one generic short marker for meal/dietary/seat information?
6. **Project lifecycle:** transient batch, saved project, duplication, and guest-list deletion/retention.
7. **Paid volume:** 250 versus 500 cards per project, and whether professional limits are project-based rather than name-based.
8. **AI scope:** included in Build 3 or staged after core print proof; four variants per batch; free trial allowance; retention; provider benchmark.
9. **Usage architecture:** product-specific generation quota versus generic BFF typed-unit ledger.
10. **Studio scope and price:** retain 20 seats, reduce the first limit, or defer visible team value until professional interviews.
11. **Launch channel:** direct professional pilots first, or a simultaneous occasional-buyer landing test?

## Source list

Primary and direct sources used most heavily:

- [Avery 5302 product](https://www.avery.com/products/cards/5302)
- [Canva place-card templates](https://www.canva.com/place-cards/templates/)
- [Canva Bulk Create](https://www.canva.com/help/bulk-create/)
- [PlaceCard.us pricing](https://placecard.us/pricing)
- [PlaceCard.live pricing](https://placecard.live/pricing)
- [Place Cards iOS listing](https://apps.apple.com/ca/app/place-cards/id6802176936)
- [The Knot 2026 Real Weddings Study covering 2025](https://images.theknot.com/rules/2026/the-knot-real-weddings-study-data-read-out-2026.pdf)
- [US Bureau of Labor Statistics event planner outlook](https://www.bls.gov/ooh/business-and-financial/meeting-convention-and-event-planners.htm)
- [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation)
- [Pinterest audience](https://business.pinterest.com/audience/)
- [Pinterest organic audience guidance](https://business.pinterest.com/blog/how-to-build-audience-pinterest/)
- [Etsy fees](https://www.etsy.com/legal/fees/)

Public discussions were used only as qualitative problem evidence and are linked where referenced above.
