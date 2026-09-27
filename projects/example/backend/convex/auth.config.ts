import { createBffConvexAuthConfig } from '@tofler/bff-auth/convex/server';

import { exampleCustomerAuth } from './environment';

export default createBffConvexAuthConfig(exampleCustomerAuth);
