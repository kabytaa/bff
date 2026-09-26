import type { AuthConfig } from 'convex/server';

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();

export default {
  providers: googleClientId
    ? [
        {
          domain: 'https://accounts.google.com',
          applicationID: googleClientId,
        },
      ]
    : [],
} satisfies AuthConfig;
