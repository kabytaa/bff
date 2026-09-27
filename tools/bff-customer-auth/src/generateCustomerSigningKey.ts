import {
  customerSigningKeyPaths,
  generateCustomerSigningKey,
} from './customerSigningKey';

try {
  const lane = process.argv[2] ?? 'development';
  if (lane !== 'development' && lane !== 'production') {
    throw new Error('Signing key lane must be development or production.');
  }
  const result = await generateCustomerSigningKey(
    customerSigningKeyPaths(process.cwd(), lane),
  );
  console.info(
    result.created
      ? `${lane} customer context signing key pair created.`
      : `${lane} customer context signing key pair is already valid.`,
  );
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : 'Customer context signing key generation failed.',
  );
  process.exitCode = 1;
}
