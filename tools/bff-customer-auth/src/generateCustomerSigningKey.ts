import { generateCustomerSigningKey } from './customerSigningKey';

try {
  const result = await generateCustomerSigningKey();
  console.info(
    result.created
      ? 'Customer context signing key pair created.'
      : 'Customer context signing key pair is already valid.',
  );
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : 'Customer context signing key generation failed.',
  );
  process.exitCode = 1;
}
