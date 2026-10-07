import { readTableCardsDeploymentTargetConfig } from './config';

const target = readTableCardsDeploymentTargetConfig();
console.info(
  `Verified separate TableCards production target ${target.deploymentName}.`,
);
