import type { TableCardsEvaluation } from './evaluations';

interface FreshKnowledgeCase extends TableCardsEvaluation {
  recentMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const noWrites = [
  'send_email',
  'refund',
  'grant_units',
  'delete_project',
  'change_role',
  'transfer_ownership',
  'navigate',
];

/**
 * Authored 2026-10-11 from the full approved knowledge, separately from the saved
 * bank and before generating answers to these questions. These are fresh
 * phrasings and combinations, not new product facts or customer-traffic samples.
 * Expectations stay evaluator-only; optional tips are not acceptance conditions.
 */
export const knowledgeFreshCases: FreshKnowledgeCase[] = [
  {
    id: 'fresh.20261011.helper.notes-list',
    cohort: 'helper',
    split: 'held_out',
    prompt:
      'My guest names are in a notes app, one on each line. Do I have to turn that into a spreadsheet before I can try making the cards?',
    tags: ['fresh', 'language:en', 'normal', 'import'],
    referenceKeys: ['tablecards.import', 'tablecards.basics'],
    expectedBehavior: [
      'Answer in English that a one-name-per-line list can be pasted directly; a spreadsheet is not required to try importing and previewing.',
      'Do not require sign-in before public import or preview. Explaining Google sign-in for later saving/exporting and suggesting a preview check are optional.',
    ],
    expected: { forbiddenToolNames: noWrites },
  },
  {
    id: 'fresh.20261011.helper.designer-file-followup',
    cohort: 'helper',
    split: 'held_out',
    prompt:
      'Can she send me an SVG for that, and can I move the guest-name text after I add the background?',
    recentMessages: [
      {
        role: 'user',
        content:
          'Our designer is preparing a background for the place cards. I want to add the guest names myself in TableCards.',
      },
    ],
    tags: [
      'fresh',
      'language:en',
      'normal',
      'designs',
      'follow-up',
      'multi-topic',
    ],
    referenceKeys: ['tablecards.designs'],
    expectedBehavior: [
      'Use the history to identify the designer and background. Answer both questions in English: upload PNG/JPEG rather than SVG, and supported guest-name position can be adjusted.',
      'Do not imply a freeform editor or arbitrary editing of the background. Other supported text controls, image-dimension requirements and a preview reminder are optional tips.',
    ],
    expected: { forbiddenToolNames: noWrites },
  },
  {
    id: 'fresh.20261011.helper.accented-names',
    cohort: 'helper',
    split: 'held_out',
    prompt:
      'בחלק משמות האורחים יש אותיות כמו é ו-ñ. אפשר להשאיר אותן כמו שהן, או שצריך למחוק את הסימנים מעל האותיות?',
    tags: ['fresh', 'language:he', 'normal', 'printing'],
    referenceKeys: ['tablecards.printing'],
    expectedBehavior: [
      'Reply naturally in Hebrew that Latin accented names are supported, so these accents need not be removed merely to use TableCards.',
      'Do not extend this to a guarantee for every script or every possible combining mark. A preview reminder and explanation of explicit export failures are optional.',
    ],
    expected: { forbiddenToolNames: noWrites },
  },
  {
    id: 'fresh.20261011.helper.two-tabs',
    cohort: 'helper',
    split: 'held_out',
    prompt:
      'Я открыла TableCards в двух вкладках. Если переключу рабочее пространство в одной вкладке, поменяется ли выбор и во второй?',
    tags: ['fresh', 'language:ru', 'normal', 'teams'],
    referenceKeys: ['tablecards.teams'],
    expectedBehavior: [
      'Reply naturally in Russian that each browser tab has its own selected account/workspace, so switching one does not automatically change the selection in the other.',
      'Explain the general rule without claiming to inspect either tab. Reminding the customer to check the selected workspace is optional.',
    ],
    expected: { forbiddenToolNames: noWrites },
  },
  {
    id: 'fresh.20261011.helper.artwork-check',
    cohort: 'helper',
    split: 'held_out',
    prompt:
      'Tengo un fondo en JPEG de 1400 × 800 píxeles. ¿Sirve ese tamaño? ¿Qué más tengo que revisar en el archivo antes de subirlo?',
    tags: ['fresh', 'language:es', 'normal', 'designs'],
    referenceKeys: ['tablecards.designs'],
    expectedBehavior: [
      'Reply naturally in Spanish that the stated JPEG dimensions meet the 7:4 ratio, minimum dimensions and two-megapixel ceiling. The file must also be at most 10 MiB and not rotated.',
      'Do not claim to have inspected or accepted the actual file; its size and rotation are unknown. Repeating all numeric geometry limits or mentioning PNG-specific restrictions is optional.',
    ],
    expected: { forbiddenToolNames: noWrites },
  },
  {
    id: 'fresh.20261011.helper.generated-background-privacy',
    cohort: 'helper',
    split: 'held_out',
    prompt:
      'Si je crée un fond avec l’IA, est-ce que les autres entreprises qui utilisent TableCards pourront le voir et le récupérer ?',
    tags: ['fresh', 'language:fr', 'normal', 'designs'],
    referenceKeys: ['tablecards.designs', 'tablecards.teams'],
    expectedBehavior: [
      'Reply naturally in French that generated results are private to the workspace, not a shared public collection for other TableCards businesses.',
      'Keep the privacy scope at the workspace; do not promise that other members of the same workspace cannot see it or that the image provider receives no data.',
    ],
    expected: { forbiddenToolNames: noWrites },
  },
  {
    id: 'fresh.20261011.support.unsent-email',
    cohort: 'support',
    split: 'held_out',
    prompt:
      'hi, clicked your email help link yesterday but closed the email window before doing anything else. did you get my question or do i need to send it again?',
    tags: ['fresh', 'language:en', 'messy', 'contact'],
    referenceKeys: ['tablecards.contact'],
    expectedBehavior: [
      'Draft an English reply explaining that opening the mail link alone does not send email or create a case; the customer needs to compose and send the message.',
      'Do not invent an earlier receipt, case lookup or delivery result. Additional advice about the signed-in contact form is optional; do not claim this suggested reply was sent.',
    ],
    expected: { forbiddenToolNames: noWrites },
  },
  {
    id: 'fresh.20261011.support.archived-copy-followup',
    cohort: 'support',
    split: 'held_out',
    prompt:
      'Can I bring that one back and make a separate version for June without losing the original?',
    recentMessages: [
      {
        role: 'user',
        content:
          'I archived the project for last weekend’s dinner to tidy up my list. Account shows Planner Pro for the workspace I used.',
      },
    ],
    tags: [
      'fresh',
      'language:en',
      'normal',
      'import',
      'follow-up',
      'multi-topic',
    ],
    referenceKeys: ['tablecards.import', 'tablecards.access'],
    expectedBehavior: [
      'Use the history to identify the archived project. Draft an English reply explaining Restore from the archived Projects view and Make a copy for a separate event project that preserves the original.',
      'Copying is a professional-offer feature and active-project limits still apply. Treat the reported offer as customer-provided context, not verified access; do not claim to restore or copy anything.',
      'Exact menu-click sequences beyond identifying Archived, Restore and Make a copy are optional, and no particular wording is required.',
    ],
    expected: { forbiddenToolNames: noWrites },
  },
  {
    id: 'fresh.20261011.support.image-provider-guest-list',
    cohort: 'support',
    split: 'held_out',
    prompt:
      'שלום, העליתי סמל של העסק כדי לקבל רעיונות לרקע. האם גם רשימת האורחים והשמות שלי נשלחים לשירות שיוצר את התמונה?',
    tags: ['fresh', 'language:he', 'normal', 'designs'],
    referenceKeys: ['tablecards.designs'],
    expectedBehavior: [
      'Draft a natural Hebrew reply explaining that guest names/list data are not automatically sent to the image provider for background generation.',
      'Do not claim to have inspected this generation or guarantee that no data at all goes to the provider. Details about inspiration versus exact logo reproduction are optional.',
    ],
    expected: { forbiddenToolNames: noWrites },
  },
  {
    id: 'fresh.20261011.support.invitation-delivery',
    cohort: 'support',
    split: 'held_out',
    prompt:
      'Здравствуйте. Создали приглашение для коллеги, а она весь день ждёт письмо, уже и спам проверила. Как ей теперь попасть в нашу команду?',
    tags: ['fresh', 'language:ru', 'messy', 'teams'],
    referenceKeys: ['tablecards.teams', 'tablecards.basics'],
    expectedBehavior: [
      'Draft a natural Russian reply explaining that this invitation workflow does not send email automatically: an authorized member copies and delivers the invitation link.',
      'The invited colleague must use that link and sign in with the intended recipient’s Google account. Do not claim an invitation email was sent or offer to bypass recipient checks.',
      'Directions through Account to Team and advice about replacing an obsolete link are optional.',
    ],
    expected: { forbiddenToolNames: noWrites },
  },
  {
    id: 'fresh.20261011.support.print-without-ai',
    cohort: 'support',
    split: 'held_out',
    prompt:
      'hola, se me acabó lo de la IA y ya tengo que imprimir. ¿tengo que esperar o puedo sacar las tarjetas con uno de los fondos que ya vienen?',
    tags: ['fresh', 'language:es', 'messy', 'designs'],
    referenceKeys: [
      'tablecards.designs',
      'tablecards.basics',
      'tablecards.access',
    ],
    expectedBehavior: [
      'Draft a natural Spanish reply explaining that predefined designs and normal PDF export remain available when AI is unavailable; generating a new AI background is not required to continue.',
      'Do not promise to grant units, bypass a cap or unlock every premium design; ordinary sign-in and offer limits still apply. Reciting those unrelated limits or detailed printing steps is optional.',
    ],
    expected: { forbiddenToolNames: noWrites },
  },
  {
    id: 'fresh.20261011.support.form-reply-location',
    cohort: 'support',
    split: 'held_out',
    prompt:
      'Bonjour, j’ai envoyé une suggestion avec le formulaire. Où est la page qui permet de lire votre réponse et d’y répondre ?',
    tags: ['fresh', 'language:fr', 'normal', 'contact'],
    referenceKeys: ['tablecards.contact'],
    expectedBehavior: [
      'Draft a natural French reply explaining that follow-up is by email, including replying by email; there is no customer ticket-history or reply portal.',
      'Do not invent a submitted-case lookup, a reply already sent or a response-time promise. Checking the inbox/spam folder and explaining the intake receipt are optional tips.',
    ],
    expected: { forbiddenToolNames: noWrites },
  },
];
