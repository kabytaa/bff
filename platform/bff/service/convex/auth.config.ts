import { BACKOFFICE_GOOGLE_CLIENT_ID } from '@bff/static-config';
import type { AuthConfig } from 'convex/server';

export default {
  providers: [
    {
      domain: 'https://accounts.google.com',
      applicationID: BACKOFFICE_GOOGLE_CLIENT_ID,
    },
  ],
} satisfies AuthConfig;
