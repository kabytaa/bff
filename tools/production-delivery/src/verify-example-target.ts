import { readExampleDeploymentTargetConfig } from './config';

const config = readExampleDeploymentTargetConfig();
console.info(
  `Verified example production deployment ${config.deploymentName}.`,
);
