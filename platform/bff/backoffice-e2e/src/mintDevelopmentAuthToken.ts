import { mintDevelopmentAuthToken } from './developmentAuth';

// Trusted automation captures stdout privately; never log or persist the token.
try {
  if (process.argv.length !== 3)
    throw new Error('Exactly one canonical development audience is required');
  const token = await mintDevelopmentAuthToken({ audience: process.argv[2]! });
  process.stdout.write(`${token}\n`);
} catch {
  console.error('Unable to mint the short-lived development automation token');
  process.exitCode = 1;
}
