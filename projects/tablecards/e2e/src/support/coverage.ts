export const USER_STORY_IDS = [
  'US-01',
  'US-02',
  'US-03',
  'US-04',
  'US-05',
  'US-06',
  'US-07',
  'US-08',
  'US-09',
  'US-10',
  'US-11',
  'US-12',
  'US-13',
  'US-14',
  'US-15',
  'US-16',
  'US-17',
  'US-18',
  'US-19',
  'US-20',
] as const;

export type UserStoryId = (typeof USER_STORY_IDS)[number];

export const USER_STORY_SCENARIOS = {
  'public creation, import, authentication and navigation': [
    'US-01',
    'US-02',
    'US-03',
    'US-04',
    'US-19',
    'US-20',
  ],
  'Free and Event Pass project promises': [
    'US-05',
    'US-06',
    'US-07',
    'US-08',
    'US-09',
    'US-10',
  ],
  'professional design and AI promises': ['US-11', 'US-12'],
  'Studio accounts and teams': [
    'US-13',
    'US-14',
    'US-15',
    'US-16',
    'US-17',
    'US-18',
  ],
} as const satisfies Record<string, readonly UserStoryId[]>;

export function uncoveredUserStories(): readonly UserStoryId[] {
  const covered = new Set<UserStoryId>(
    Object.values(USER_STORY_SCENARIOS).flat(),
  );
  return USER_STORY_IDS.filter((story) => !covered.has(story));
}
