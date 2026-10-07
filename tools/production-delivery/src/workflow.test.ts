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
  it.each(['pull_request', 'push'])(
    'skips Markdown-only %s changes without excluding code, assets or configuration',
    async (event) => {
      const workflow = await readFile(workflowPath, 'utf8');
      const trigger = workflow.match(
        new RegExp(`^  ${event}:\\n((?: {4}[^\\n]*\\n|\\n)*)`, 'mu'),
      )?.[1];
      const ignoredPaths = trigger?.match(
        / {4}paths-ignore:\n((?: {6}- [^\n]+\n)+)/u,
      )?.[1];

      // GitHub skips only when every changed path matches. Keep this narrow:
      // a mixed Markdown/code diff, workflow edit or asset edit must still run.
      expect(ignoredPaths?.trim()).toBe("- '**/*.md'");
    },
  );

  it('ships TableCards preview security headers without disabling immutable artwork caching', async () => {
    const headers = await readFile(
      'projects/tablecards/workloads/web/public/_headers',
      'utf8',
    );
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).toContain("img-src 'self' data: blob:");
    expect(headers).toContain("connect-src 'self' blob:");
    expect(headers).toContain('https://*.tofler.app');
    expect(headers).toContain('wss://*.convex.cloud');
    expect(headers).toContain('X-Robots-Tag: noindex, nofollow');
    expect(headers).toContain('/\n  Cache-Control: no-store');
    expect(headers).toContain('/:route\n  Cache-Control: no-store');
    expect(headers).toContain('/settings/*\n  Cache-Control: no-store');
    expect(headers).toContain('/invite/*\n  Cache-Control: no-store');
    expect(headers).not.toMatch(/^\/\*\n {2}Cache-Control: no-store/mu);
    expect(headers).toContain(
      '/designs/predefined/v2/*\n  Cache-Control: public, max-age=31536000, immutable',
    );
  });
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
    expect(jobEnvironment).not.toContain(
      'secrets.TABLECARDS_CONVEX_DEPLOY_KEY',
    );
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
    expect(exampleTarget).toContain('production:verify-example-target');
    expect(exampleTarget).not.toContain('convex deploy');
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
      7,
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

  it('guards the TableCards key before configuration and cannot disable production checks', async () => {
    const workflow = await readFile(workflowPath, 'utf8');
    expect(workflow).toContain("TABLECARDS_PRODUCTION_ENABLED: 'true'");
    const target = step(
      workflow,
      'Verify the separate TableCards production target',
      'Configure the separate TableCards production deployment',
    );
    const configure = step(
      workflow,
      'Configure the separate TableCards production deployment',
      'Deploy and stamp the separate TableCards backend',
    );
    const deploy = step(
      workflow,
      'Deploy and stamp the separate TableCards backend',
      'Deploy the production example session gateway',
    );
    for (const section of [target, configure, deploy]) {
      expect(section).toContain('secrets.TABLECARDS_CONVEX_DEPLOY_KEY');
      expect(section).not.toContain('secrets.CONVEX_DEPLOY_KEY }}');
      expect(section).not.toContain('secrets.EXAMPLE_CONVEX_DEPLOY_KEY');
    }
    expect(target).toContain('production:verify-tablecards-target');
    expect(target).not.toContain('convex env set');
    expect(configure).toContain(
      'convex env remove TABLECARDS_DEVELOPMENT_MOCKS_ENABLED',
    );
  });
});
