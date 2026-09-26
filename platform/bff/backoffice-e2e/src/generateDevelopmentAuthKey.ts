import { generateDevelopmentAuthKey } from './developmentAuth';

try {
  const { created } = await generateDevelopmentAuthKey();
  console.info(
    created
      ? 'Development automation key pair created.'
      : 'Development automation key pair is already valid.',
  );
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : 'Development automation key generation failed',
  );
  process.exitCode = 1;
}
