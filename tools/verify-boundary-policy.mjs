import eslintConfig from '../eslint.config.mjs';

function fail(message) {
  throw new Error(`Invalid Nx boundary policy: ${message}`);
}

const configuredRule = eslintConfig
  .map((entry) => entry.rules?.['@nx/enforce-module-boundaries'])
  .find(Boolean);

if (!Array.isArray(configuredRule) || configuredRule[0] !== 'error') {
  fail('the module-boundary rule must be enabled as an error');
}

const options = configuredRule[1];
if (typeof options !== 'object' || options === null) {
  fail('the module-boundary rule options are missing');
}

const constraints = options.depConstraints;
if (!Array.isArray(constraints)) {
  fail('dependency constraints are missing');
}

function allowedDependencies(sourceTag) {
  const constraint = constraints.find(
    (candidate) => candidate.sourceTag === sourceTag,
  );
  if (!constraint || !Array.isArray(constraint.onlyDependOnLibsWithTags)) {
    fail(`${sourceTag} is not constrained`);
  }
  return [...constraint.onlyDependOnLibsWithTags].sort();
}

const publicDependencies = allowedDependencies('scope:public');
if (JSON.stringify(publicDependencies) !== JSON.stringify(['scope:public'])) {
  fail('public contracts may depend only on public projects');
}

const businessDependencies = allowedDependencies('scope:business');
if (
  JSON.stringify(businessDependencies) !==
  JSON.stringify(['scope:business', 'scope:public'])
) {
  fail('Business projects must not import BFF or operator internals');
}

if (
  !Array.isArray(options.allow) ||
  JSON.stringify(options.allow) !== JSON.stringify(['@bff/service-api'])
) {
  fail('only the explicit BFF-internal generated API exception is allowed');
}

console.info('Nx ownership boundary policy is present and restrictive.');
