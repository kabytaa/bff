import { generateCustomerDevelopmentAuthKey } from './developmentGrant';

try {
  const result = await generateCustomerDevelopmentAuthKey();
  console.info(
    result.created
      ? 'Customer development automation key pair created.'
      : 'Customer development automation key pair is already valid.',
  );
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : 'Customer development automation key generation failed.',
  );
  process.exitCode = 1;
}
