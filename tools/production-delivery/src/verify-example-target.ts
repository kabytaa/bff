import { readExampleDeploymentTargetConfig } from './config';

const config = readExampleDeploymentTargetConfig();
console.info(
  `Verified example production deployment ${new URL(config.exampleConvexUrl).hostname}.`,
);
