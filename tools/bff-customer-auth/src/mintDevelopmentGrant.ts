import { mintCustomerDevelopmentGrant } from './developmentGrant';

try {
  const input: unknown = JSON.parse(process.argv[2] ?? 'null');
  if (typeof input !== 'object' || input === null) {
    throw new Error('Development grant input is required');
  }
  const grant = await mintCustomerDevelopmentGrant(
    input as Parameters<typeof mintCustomerDevelopmentGrant>[0],
  );
  console.info(grant);
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : 'Customer development grant minting failed.',
  );
  process.exitCode = 1;
}
