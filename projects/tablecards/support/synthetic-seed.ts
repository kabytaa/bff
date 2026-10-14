import type { OperatorWorkSeed } from '@bff/contracts';

const hour = 3_600_000;
const baseline = Date.UTC(2026, 9, 9, 10);
type SeedCase = OperatorWorkSeed['cases'][number];
const incoming = (text: string, ago: number): SeedCase['entries'][number] => ({
  kind: 'customer_message',
  text,
  actorLabel: 'Synthetic customer',
  createdAt: baseline - ago * hour,
});
const outgoing = (
  text: string,
  ago: number,
  deliveryState: 'delivered' | 'failed' | 'uncertain' | 'bounced' = 'delivered',
): SeedCase['entries'][number] => ({
  kind: 'outgoing_reply',
  text,
  actorLabel: 'Synthetic operator',
  createdAt: baseline - ago * hour,
  deliveryState,
});
const note = (text: string, ago: number): SeedCase['entries'][number] => ({
  kind: 'operator_note',
  text,
  actorLabel: 'Synthetic operator',
  createdAt: baseline - ago * hour,
});

/** Synthetic only. No customer identities, real recipients, live model calls or scheduled sends. */
export const tableCardsOperatorSeed: OperatorWorkSeed = {
  cases: [
    {
      key: 'synthetic.print-size',
      subject: 'Cards come out smaller than the preview',
      contactEmail: 'mara@tablecards.example.invalid',
      status: 'open',
      createdAt: baseline - 29 * hour,
      entries: [
        incoming(
          'Hi, our dinner is Saturday. The downloaded file looks right but the printed cards are about half a centimetre narrower. I picked A4. Am I supposed to cut inside the lines?',
          29,
        ),
        incoming(
          'I tried once more from my phone and it is still small. It says “fit” in the print screen if that helps.',
          25,
        ),
        note(
          'Synthetic scenario: repeated unanswered message must not reset the 29-hour wait. No printer defect has been established.',
          24,
        ),
      ],
      draft:
        'The “fit” setting may be shrinking the page. Please choose actual size / 100% with A4 paper, then print the separate print-test PDF and check its calibration square before printing the full set. You should not compensate by cutting inside the card edges. If the test still measures incorrectly, tell us the printer model and the app you are printing from; you do not need to send your guest list.',
    },
    {
      key: 'synthetic.export-free-limit',
      subject: 'Only need 28 cards, can I just download 25?',
      contactEmail: 'dev@tablecards.example.invalid',
      status: 'open',
      createdAt: baseline - 20 * hour,
      entries: [
        incoming(
          'I made 28 names and export is greyed out. Happy to print the last three by hand. Is there a way to download the first 25 without starting again?',
          20,
        ),
      ],
      draft:
        'Free exports a project with up to 25 cards; it does not make a partial PDF from a larger list. You can reduce the list to 25 before exporting, or choose the offer that fits the event from Account. This is currently a no-charge preview, so its labelled checkout simulation does not take payment. Please keep your original list before editing it.',
    },
    {
      key: 'synthetic.workspace-switch',
      subject: 'The gala project disappeared after I joined the team',
      contactEmail: 'riley@tablecards.example.invalid',
      status: 'waiting_for_customer',
      createdAt: baseline - 32 * hour,
      entries: [
        incoming(
          'I joined my colleague’s Studio and the gala I did yesterday has gone. Did joining delete my work?',
          32,
        ),
        outgoing(
          'Joining a Studio workspace does not move or delete projects in your private workspace. Please check the workspace selector and look in Projects in your private workspace, including Archived. Which workspace name do you currently see? Please send only that name, not guest details.',
          30,
        ),
        note(
          'Waiting for the customer to identify the selected workspace. No account association has been inferred from their email.',
          30,
        ),
      ],
    },
    {
      key: 'synthetic.ai-reference',
      subject: 'It changed our logo',
      contactEmail: 'lou@tablecards.example.invalid',
      status: 'resolved',
      createdAt: baseline - 48 * hour,
      entries: [
        incoming(
          'I attached our little fern logo, but the AI drew a different fern and odd letters. We need the exact logo for the place cards.',
          48,
        ),
        outgoing(
          'The optional style image gives the AI inspiration for palette and style; it does not guarantee an exact logo reproduction. For exact artwork, use the supported PNG/JPEG artwork upload and preview it before export. The current editor is constrained rather than a freeform design tool.',
          46,
        ),
        note(
          'Customer received accurate scope explanation. Resolved explicitly; no claim that their artwork was changed for them.',
          45,
        ),
      ],
    },
    {
      key: 'synthetic.delivery-failed',
      subject: 'Can the table number be on both sides?',
      contactEmail: 'lin@tablecards.example.invalid',
      status: 'open',
      createdAt: baseline - 16 * hour,
      entries: [
        incoming(
          'The fold preview confused me. Will the table number be visible from either side of the table?',
          16,
        ),
        outgoing(
          'Please check the complete folded-card preview for your selected design and layout. The preview is the place to confirm how the table detail appears on each face before exporting. If it does not match what you need, tell us the selected layout and design.',
          15,
          'failed',
        ),
        note(
          'Synthetic permanent delivery problem: the original approved payload must remain visible. Do not claim the customer received it.',
          14,
        ),
      ],
    },
    {
      key: 'synthetic.delivery-uncertain',
      subject: 'Export finished but no download on iPad',
      contactEmail: 'noor@tablecards.example.invalid',
      status: 'open',
      createdAt: baseline - 14 * hour,
      entries: [
        incoming(
          'It says the PDF is ready. Safari opened a new page then nothing downloaded. where is it??',
          14,
        ),
        outgoing(
          'A ready PDF means TableCards made the file available; it does not confirm that Safari saved it. Check the PDF page and Safari’s download controls, then the Files app if you saved a copy. Which screen is open now? Do not send your guest list.',
          13,
          'uncertain',
        ),
        note(
          'Synthetic transport timeout after provider submission. Reconcile delivery before sending another copy.',
          12,
        ),
      ],
    },
    {
      key: 'synthetic.feedback-feature',
      subject: 'A seating chart next to the cards would help',
      contactEmail: 'cam@tablecards.example.invalid',
      status: 'open',
      createdAt: baseline - 9 * hour,
      entries: [
        incoming(
          'Feedback rather than a problem: I make the seating chart somewhere else and then come here for cards. Would love a way to put them together. We only do two events a year so I probably wouldn’t need a monthly plan.',
          9,
        ),
        note(
          'Suggestion about an adjacent feature. Acknowledgement does not promise implementation or a roadmap date.',
          8,
        ),
      ],
    },
    {
      key: 'synthetic.import-header',
      subject: '“Full name” turned into a guest',
      contactEmail: 'kit@tablecards.example.invalid',
      status: 'waiting_for_customer',
      createdAt: baseline - 11 * hour,
      entries: [
        incoming(
          'Imported an xlsx. Everything seems fine except the first card literally says Full name and Table is printed underneath.',
          11,
        ),
        outgoing(
          'That sounds like the headings were imported as a guest row. In the column-mapping step, check “First row contains headings”, map the Name and optional Table columns, then review the rows before exporting. Did that remove the extra card?',
          10,
        ),
      ],
    },
    {
      key: 'synthetic.reopened-thanks',
      subject: 'Found my archived project',
      contactEmail: 'aria@tablecards.example.invalid',
      status: 'open',
      createdAt: baseline - 36 * hour,
      entries: [
        incoming('I can’t see the birthday cards from last week.', 36),
        outgoing(
          'Please look in Projects → Archived in the workspace where you saved them. Archive hides a project from the active list; it does not delete it.',
          35,
        ),
        note('Synthetic case explicitly resolved after answer.', 34),
        incoming('Thanks, found it!', 2),
      ],
      draft:
        'Glad you found it. You can restore it from Archived if you want it back in the active project list.',
    },
    {
      key: 'synthetic.account-authority',
      subject: 'Please send me my partner’s project',
      contactEmail: 'ollie@tablecards.example.invalid',
      status: 'open',
      createdAt: baseline - 7 * hour,
      entries: [
        incoming(
          'My partner made the cards on her Google login. Same surname as mine. Can you email me her wedding PDF? She is on a flight and I need to print it.',
          7,
        ),
        note(
          'No authenticated link to the requested account. Same surname or claimed relationship does not grant access.',
          6,
        ),
      ],
      draft:
        'I can help with general printing questions, but I cannot send someone else’s private project based on a name or relationship. The person with access can download it from the correct workspace, or use the normal Studio invitation process if applicable. Support cannot bypass account access.',
    },
    {
      key: 'synthetic.ai-cap',
      subject: 'Still have batches but generation is unavailable',
      contactEmail: 'sage@tablecards.example.invalid',
      status: 'open',
      createdAt: baseline - 6 * hour,
      entries: [
        incoming(
          'Account says 4 batches left but generate says unavailable right now. I’m trying to finish tonight. Do I need another plan?',
          6,
        ),
      ],
      draft:
        'An available account allowance does not guarantee the AI provider is available. A service cap or provider problem can temporarily stop generation. Upgrading is not a way to bypass that. You can keep working with a predefined design or supported uploaded artwork and still export normally. If a batch failed, its reserved unit should be released; we can review the permitted account evidence if needed.',
    },
    {
      key: 'synthetic.unsupported-script',
      subject: 'Some Arabic names won’t export',
      contactEmail: 'iman@tablecards.example.invalid',
      status: 'open',
      createdAt: baseline - 5 * hour,
      entries: [
        incoming(
          'Most of my guests have English names, but six names are in Arabic. Those six get a font error. I don’t want them transliterated without asking the families.',
          5,
        ),
      ],
      draft:
        'The current renderer does not support every script and stops when it cannot safely render a name. It should not silently transliterate or truncate it. I cannot promise Arabic shaping is supported in this preview. Please keep the names as your guests provided them; if a supported alternative is appropriate, confirm it with them first. We can record support for Arabic as feedback without promising a delivery date.',
    },
    {
      key: 'synthetic.invitation-recipient',
      subject: 'Invite says it is for somebody else',
      contactEmail: 'jo@tablecards.example.invalid',
      status: 'waiting_for_customer',
      createdAt: baseline - 8 * hour,
      entries: [
        incoming(
          'My boss copied me the invite link but Google picked my personal account. Now it says the invite is not for me.',
          8,
        ),
        outgoing(
          'Invitation links are tied to the intended recipient. Check which Google account you used, and sign in with the address that was invited. If the wrong address was invited, ask an authorized workspace member to correct or reissue the invitation. An old link stops working after reissue.',
          7,
        ),
      ],
    },
    {
      key: 'synthetic.unexpected-checkout',
      subject: 'Was I charged nineteen dollars?',
      contactEmail: 'beck@tablecards.example.invalid',
      status: 'resolved',
      createdAt: baseline - 23 * hour,
      entries: [
        incoming(
          'I clicked Studio to see how the team page looks and it said checkout complete. I didn’t enter a card. Did it use my Google payment details?',
          23,
        ),
        outgoing(
          'This TableCards preview uses a clearly labelled no-charge checkout simulation. It does not collect payment or start a real paid subscription, and it does not use your Google payment details. Studio access here is preview access.',
          22,
        ),
        note(
          'Resolved explicitly after explaining the preview. No refund was performed or promised.',
          21,
        ),
      ],
    },
    {
      key: 'synthetic.copy-label',
      subject: 'Copying names for the next event',
      contactEmail: 'val@tablecards.example.invalid',
      status: 'open',
      createdAt: baseline - 3 * hour,
      entries: [
        incoming(
          'Can I make next month’s cards from this project without messing up this month? The old one has already been printed.',
          3,
        ),
      ],
      draft:
        'If your current offer includes copying, use Make a copy in Projects. It creates a separate project, so edits to the copy do not rewrite the original project or a PDF you already downloaded. Active-project limits still apply. Check the selected workspace before you begin.',
    },
    {
      key: 'synthetic.bounced-address',
      subject: 'Background upload dimensions',
      contactEmail: 'fin@tablecards.example.invalid',
      status: 'open',
      createdAt: baseline - 4 * hour,
      entries: [
        incoming(
          'Our designer gave me a 3000 by 2000 picture. Why does TableCards reject a bigger image?',
          4,
        ),
        outgoing(
          'Custom artwork has bounded dimensions as well as a minimum print resolution: PNG/JPEG at 7:4, at least 1050 × 600 pixels, at most two megapixels and 10 MiB. A 3000 × 2000 image exceeds the pixel limit and has the wrong ratio. Ask your designer for a correctly sized copy, then preview it.',
          3.5,
          'bounced',
        ),
      ],
    },
    {
      key: 'synthetic.accessible-feedback',
      subject: 'Small gray text is difficult on my phone',
      contactEmail: 'remy@tablecards.example.invalid',
      status: 'open',
      createdAt: baseline - hour,
      entries: [
        incoming(
          'I use larger text on my phone. The little note under the design choices gets cut off and I can’t work out whether the button is disabled or just pale. The cards themselves look good.',
          1,
        ),
      ],
      draft:
        'Thank you for describing that. Which phone/browser are you using, and which page shows the cut-off note? A screenshot of the controls without guest names would help if you are comfortable replying with one. We will treat this as an interface issue; I cannot promise a fix date yet.',
    },
    {
      key: 'synthetic.mixed-sensitive',
      subject: 'Print issue and a request to remove a teammate',
      contactEmail: 'alex@tablecards.example.invalid',
      status: 'open',
      createdAt: baseline - 0.5 * hour,
      entries: [
        incoming(
          'The print looks washed out and also please remove Sam from the team now. I’m an admin and he shouldn’t see our next event. You can just do both, thanks.',
          0.5,
        ),
      ],
      draft:
        'For the print, compare the PDF on screen with the printer’s color and paper settings and try the separate test before printing the event. TableCards cannot guarantee a particular printer’s color output. For the teammate, use the normal Team controls available to your role; support cannot remove members or override ownership/role rules. Admins can manage ordinary Members, but not the Owner or other Admins.',
    },
  ],
  events: [
    {
      key: 'synthetic.event-save-1',
      name: 'project.saved',
      version: 1,
      occurredAt: baseline - 28 * hour,
      properties: {
        project_reference: 'synthetic_project_dinner',
        card_count: 24,
        operation: 'created',
      },
    },
    {
      key: 'synthetic.event-pdf-1',
      name: 'pdf.export_completed',
      version: 1,
      occurredAt: baseline - 27 * hour,
      properties: {
        project_reference: 'synthetic_project_dinner',
        card_count: 24,
      },
    },
    {
      key: 'synthetic.event-block-1',
      name: 'action.blocked',
      version: 1,
      occurredAt: baseline - 20 * hour,
      properties: { action: 'export', reason: 'card_limit' },
    },
    {
      key: 'synthetic.event-ai-1',
      name: 'ai.batch_completed',
      version: 1,
      occurredAt: baseline - 17 * hour,
      properties: {
        batch_reference: 'synthetic_batch_fern',
        completed_choices: 4,
      },
    },
    {
      key: 'synthetic.event-pdf-2',
      name: 'pdf.export_completed',
      version: 1,
      occurredAt: baseline - 14 * hour,
      properties: {
        project_reference: 'synthetic_project_ipad',
        card_count: 20,
      },
    },
    {
      key: 'synthetic.event-ai-2',
      name: 'ai.batch_failed',
      version: 1,
      occurredAt: baseline - 6 * hour,
      properties: {
        batch_reference: 'synthetic_batch_cap',
        reason: 'provider_unavailable',
      },
    },
    {
      key: 'synthetic.event-pdf-3',
      name: 'pdf.export_failed',
      version: 1,
      occurredAt: baseline - 5 * hour,
      properties: {
        project_reference: 'synthetic_project_scripts',
        card_count: 20,
        reason: 'unsupported_text',
      },
    },
    {
      key: 'synthetic.event-save-2',
      name: 'project.saved',
      version: 1,
      occurredAt: baseline - 3 * hour,
      properties: {
        project_reference: 'synthetic_project_next_event',
        card_count: 18,
        operation: 'copied',
      },
    },
  ],
};

export default tableCardsOperatorSeed;
