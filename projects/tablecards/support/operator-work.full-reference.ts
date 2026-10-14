import type { OperatorWorkConfiguration } from '@bff/contracts';
import { tableCardsSupportSkills } from './knowledge';

const optionalText = (name: string) => ({
  name,
  type: 'string' as const,
  required: false,
  maxLength: 160,
});
const optionalCount = (name: string) => ({
  name,
  type: 'number' as const,
  required: false,
});
const pageLinks = [
  ['open_faq', 'Frequently asked questions', '/#faq'],
  ['open_pricing', 'Plans and preview access', '/#pricing'],
  ['open_create', 'Create cards', '/create'],
  ['open_account', 'Account and workspace', '/settings'],
  ['open_projects', 'Saved projects', '/projects'],
  ['open_designs', 'Browse designs', '/designs'],
  ['open_team', 'Workspace team', '/settings/team'],
] as const;

/** Original full/Qwen/v5 benchmark reference. Disabled; never apply as the current runtime configuration. */
export const tableCardsOperatorWorkFullReference: OperatorWorkConfiguration = {
  version: 1,
  enabled: false,
  presentation: {
    productName: 'TableCards',
    helpUrl: 'https://tablecards-dev.tofler.app/support/feedback',
    contactEmail: 'support@tablecards.example.invalid',
    accentColor: '#97412e',
  },
  support: {
    botKey: 'tablecards.support',
    fromEmail: 'support@tablecards.example.invalid',
    fromName: 'TableCards Support',
    receivingAddress: 'inbound@tablecards.example.invalid',
    replyDomain: 'reply.tablecards.example.invalid',
    receiptText:
      'We received your message. You can reply to this email to add information. Please do not include a private guest list, passwords or payment details. TableCards Support',
    surveyQuestion: 'Did you get the help you needed?',
  },
  bots: [
    {
      key: 'tablecards.guide',
      name: 'TableCards Guide',
      version: 5,
      kind: 'helper',
      instructions: 'You represent TableCards as its product guide.',
      skillKeys: tableCardsSupportSkills.map((skill) => skill.key),
      model: 'qwen3-30b',
    },
    {
      key: 'tablecards.support',
      name: 'TableCards Support',
      version: 5,
      kind: 'support',
      instructions: 'You represent TableCards as its support assistant.',
      skillKeys: tableCardsSupportSkills.map((skill) => skill.key),
      model: 'qwen3-30b',
    },
  ],
  skills: tableCardsSupportSkills,
  events: [
    {
      name: 'project.saved',
      version: 1,
      label: 'Project saved',
      properties: [
        optionalText('project_reference'),
        optionalCount('card_count'),
        {
          name: 'operation',
          type: 'string',
          required: false,
          allowedValues: ['created', 'updated', 'copied'],
          maxLength: 20,
        },
      ],
    },
    {
      name: 'pdf.export_completed',
      version: 1,
      label: 'PDF made available',
      properties: [
        optionalText('project_reference'),
        optionalCount('card_count'),
      ],
    },
    {
      name: 'pdf.export_failed',
      version: 1,
      label: 'PDF export failed',
      properties: [
        optionalText('project_reference'),
        optionalCount('card_count'),
        optionalText('reason'),
      ],
    },
    {
      name: 'ai.batch_completed',
      version: 1,
      label: 'AI background choices ready',
      properties: [
        optionalText('batch_reference'),
        optionalCount('completed_choices'),
      ],
    },
    {
      name: 'ai.batch_failed',
      version: 1,
      label: 'AI background batch failed',
      properties: [optionalText('batch_reference'), optionalText('reason')],
    },
    {
      name: 'action.blocked',
      version: 1,
      label: 'Action blocked',
      properties: [optionalText('action'), optionalText('reason')],
    },
  ],
  kpis: [
    {
      key: 'active_customers',
      label: 'Active customers',
      description:
        'Unique signed-in customers with recorded project, export or AI activity. Anonymous activity is not included.',
      measure: 'active_customers',
      eventNames: [
        'project.saved',
        'pdf.export_completed',
        'pdf.export_failed',
        'ai.batch_completed',
        'ai.batch_failed',
      ],
    },
    {
      key: 'project_saves',
      label: 'Project saves',
      description:
        'Recorded saves, including updates and copies; not unique projects.',
      measure: 'event_count',
      eventNames: ['project.saved'],
    },
    {
      key: 'pdfs_ready',
      label: 'PDFs ready',
      description:
        'Exports made available; this does not prove download or printing.',
      measure: 'event_count',
      eventNames: ['pdf.export_completed'],
    },
    {
      key: 'export_failures',
      label: 'Export failures',
      description: 'Recorded failed PDF exports.',
      measure: 'event_count',
      eventNames: ['pdf.export_failed'],
    },
  ],
  pageCapabilities: pageLinks.map(([name, description, destination]) => ({
    name,
    description: `Offer a customer-clicked link: ${description}. Never navigate automatically.`,
    arguments: [],
    result: [
      { name: 'offered', type: 'boolean', required: true },
      { name: 'destination', type: 'string', required: false, maxLength: 160 },
      { name: 'label', type: 'string', required: false, maxLength: 160 },
      { name: 'reason', type: 'string', required: false, maxLength: 160 },
    ],
    destination,
  })),
};

export default tableCardsOperatorWorkFullReference;
