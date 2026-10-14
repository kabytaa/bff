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
  it('permits private backoffice preview blobs only in the image policy', async () => {
    const headers = await readFile(
      'platform/bff/backoffice/public/_headers',
      'utf8',
    );
    const csp = headers.match(/Content-Security-Policy: ([^\n]+)/u)?.[1];
    const directives = csp?.split(';').map((value) => value.trim());
    expect(directives?.filter((value) => value.includes('blob:'))).toEqual([
      "img-src 'self' data: blob: https://*.googleusercontent.com",
    ]);
    expect(directives).toContain(
      "script-src 'self' https://accounts.google.com/gsi/client",
    );
    expect(directives).toContain(
      "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.convex.site https://accounts.google.com",
    );
    expect(directives).toContain("object-src 'none'");
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
      'Verify the separate TableCards production target',
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

  it('scopes the Cloudflare token to the operator provider and Worker publication', async () => {
    const workflow = await readFile(workflowPath, 'utf8');
    const operatorProvider = step(
      workflow,
      'Deploy the production operator provider',
      'Configure production operator runtime',
    );
    expect(operatorProvider).toContain('secrets.CLOUDFLARE_API_TOKEN');
    expect(operatorProvider).not.toContain('secrets.CONVEX_DEPLOY_KEY');

    const staticRelease = workflow.slice(
      workflow.indexOf(
        '      - name: Deploy the production example session gateway',
      ),
      workflow.indexOf('      - name: Smoke-check the production release'),
    );

    expect(staticRelease.match(/secrets\.CLOUDFLARE_API_TOKEN/gu)).toHaveLength(
      7,
    );
    const beforeOperatorProvider = workflow.slice(
      0,
      workflow.indexOf('      - name: Deploy the production operator provider'),
    );
    expect(beforeOperatorProvider).not.toContain(
      'secrets.CLOUDFLARE_API_TOKEN',
    );
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
      'Deploy the production operator provider',
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

  it('gates production operator setup on verified caps and preserves native secret stores', async () => {
    const workflow = await readFile(workflowPath, 'utf8');
    expect(workflow).toContain("BFF_OPERATOR_PRODUCTION_ENABLED: 'true'");
    expect(workflow).toContain(
      'BFF_OPERATOR_CAPS_VERIFIED: ${{ vars.BFF_OPERATOR_CAPS_VERIFIED }}',
    );
    expect(workflow).toContain(
      'BFF_OPERATIONS_PROVIDER_BASE_URL: https://business-factory-ai-provider.kabytaa.workers.dev',
    );

    const preflight = step(
      workflow,
      'Check required operator production environment names',
      'Deploy the BFF and rebuild the reviewed assets',
    );
    expect(preflight).toContain('if: env.BFF_OPERATOR_PRODUCTION_ENABLED');
    expect(preflight).toContain('secrets.CONVEX_DEPLOY_KEY');
    expect(preflight).toContain('convex env list --names-only');
    expect(preflight).not.toContain('secrets.BFF_OPERATIONS_');
    expect(preflight).not.toContain('secrets.BFF_OPERATION_EVENT_SECRETS_JSON');
    for (const name of [
      'BFF_OPERATIONS_RESEND_API_KEY',
      'BFF_OPERATIONS_RESEND_WEBHOOK_SECRET',
      'BFF_OPERATIONS_PROVIDER_SECRET',
      'BFF_OPERATION_EVENT_SECRETS_JSON',
    ]) {
      expect(preflight).toContain(name);
    }
    expect(preflight).toContain(
      'Required production environment name is missing',
    );
    expect(preflight).not.toContain('env get');

    const provider = step(
      workflow,
      'Deploy the production operator provider',
      'Configure production operator runtime',
    );
    expect(provider).toContain(
      'platform/bff/ai-provider/wrangler.production.jsonc',
    );
    expect(provider).toContain('--var RUNTIME_ONLY:true');
    expect(provider).toContain('--var LIVE_TEXT_ENABLED:true');
    expect(provider).toContain('--var CAPS_VERIFIED:true');
    expect(provider).toContain(
      '--var RUNTIME_KNOWLEDGE_SELECTION_ENABLED:true',
    );
    expect(provider).toContain('secrets.CLOUDFLARE_API_TOKEN');
    expect(provider).not.toContain('secrets.BFF_OPERATIONS_PROVIDER_SECRET');
    expect(provider).not.toContain('secret put');

    const configure = step(
      workflow,
      'Configure production operator runtime',
      'Deploy the production example session gateway',
    );
    expect(configure).toContain('secrets.CONVEX_DEPLOY_KEY');
    expect(configure).not.toContain('secrets.CLOUDFLARE_API_TOKEN');
    expect(configure).not.toContain('secrets.EXAMPLE_CONVEX_DEPLOY_KEY');
    expect(configure).not.toContain('secrets.TABLECARDS_CONVEX_DEPLOY_KEY');
    expect(configure).not.toContain('secrets.BFF_OPERATIONS_');
    expect(configure).not.toContain('secrets.BFF_OPERATION_EVENT_SECRETS_JSON');
    for (const assignment of [
      'BFF_OPERATIONS_AI_MODE live',
      'BFF_OPERATIONS_MAIL_MODE live',
      'BFF_OPERATIONS_CAPS_VERIFIED verified',
      'BFF_OPERATIONS_PROVIDER_BASE_URL',
    ]) {
      expect(configure).toContain(`convex env set ${assignment}`);
    }
    expect(configure).not.toContain('convex env set BFF_OPERATIONS_RESEND');
    expect(configure).not.toContain(
      'convex env set BFF_OPERATIONS_PROVIDER_SECRET',
    );
    expect(configure).not.toContain(
      'convex env set BFF_OPERATION_EVENT_SECRETS_JSON',
    );
    expect(
      workflow.indexOf('Deploy the production operator provider'),
    ).toBeLessThan(workflow.indexOf('Deploy the production backoffice'));
    expect(
      workflow.indexOf('Configure production operator runtime'),
    ).toBeLessThan(workflow.indexOf('Deploy the production backoffice'));
  });
});
