import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const workflowPath = '.github/workflows/ci.yml';

function step(workflow: string, name: string, nextName: string): string {
  const start = workflow.indexOf(`      - name: ${name}`);
  const end = workflow.indexOf(`      - name: ${nextName}`, start + 1);
  if (start < 0 || end < 0) {
    throw new Error(`Workflow step boundary is missing for ${name}.`);
  }
  return workflow.slice(start, end);
}

describe('production workflow credential boundaries', () => {
  it('keeps deploy secrets out of the job-wide environment', async () => {
    const workflow = await readFile(workflowPath, 'utf8');
    const jobEnvironment = workflow.slice(
      workflow.indexOf('    env:\n', workflow.indexOf('  deploy-production:')),
      workflow.indexOf(
        '    steps:\n',
        workflow.indexOf('  deploy-production:'),
      ),
    );

    expect(jobEnvironment).not.toContain('secrets.CONVEX_DEPLOY_KEY');
    expect(jobEnvironment).not.toContain('secrets.EXAMPLE_CONVEX_DEPLOY_KEY');
    expect(jobEnvironment).not.toContain('secrets.CLOUDFLARE_API_TOKEN');
  });

  it('scopes each Convex key to only its matching deployment steps', async () => {
    const workflow = await readFile(workflowPath, 'utf8');
    const bffDeploy = step(
      workflow,
      'Deploy the BFF and rebuild the reviewed assets',
      'Stamp the deployed BFF version',
    );
    const bffStamp = step(
      workflow,
      'Stamp the deployed BFF version',
      'Verify the separate example production target',
    );
    const exampleTarget = step(
      workflow,
      'Verify the separate example production target',
      'Configure the separate example production deployment',
    );
    const exampleConfigure = step(
      workflow,
      'Configure the separate example production deployment',
      'Deploy and stamp the separate example backend',
    );
    const exampleDeploy = step(
      workflow,
      'Deploy and stamp the separate example backend',
      'Deploy the production example session gateway',
    );

    for (const section of [bffDeploy, bffStamp]) {
      expect(section).toContain('secrets.CONVEX_DEPLOY_KEY');
      expect(section).not.toContain('secrets.EXAMPLE_CONVEX_DEPLOY_KEY');
    }
    for (const section of [exampleTarget, exampleConfigure, exampleDeploy]) {
      expect(section).toContain('secrets.EXAMPLE_CONVEX_DEPLOY_KEY');
      expect(section).not.toContain('secrets.CONVEX_DEPLOY_KEY }}');
    }
    expect(exampleTarget).toContain('convex deploy --dry-run');
    expect(exampleTarget).toContain(
      '--cmd-url-env-var-name EXAMPLE_DEPLOY_CONVEX_URL',
    );
    expect(exampleTarget).not.toContain('convex env set');
  });

  it('scopes the Cloudflare token to gateway and static publication only', async () => {
    const workflow = await readFile(workflowPath, 'utf8');
    const staticRelease = workflow.slice(
      workflow.indexOf(
        '      - name: Deploy the production example session gateway',
      ),
      workflow.indexOf('      - name: Smoke-check the production release'),
    );

    expect(staticRelease.match(/secrets\.CLOUDFLARE_API_TOKEN/gu)).toHaveLength(
      4,
    );
    expect(
      workflow.slice(
        0,
        workflow.indexOf(
          '      - name: Deploy the production example session gateway',
        ),
      ),
    ).not.toContain('secrets.CLOUDFLARE_API_TOKEN');
  });
});
