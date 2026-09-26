import eslint from '@eslint/js';
import nx from '@nx/eslint-plugin';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/_generated/**',
      '**/coverage/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@nx': nx,
    },
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          allow: ['@bff/service-api'],
          depConstraints: [
            {
              sourceTag: 'scope:public',
              onlyDependOnLibsWithTags: ['scope:public'],
            },
            {
              sourceTag: 'scope:bff',
              onlyDependOnLibsWithTags: ['scope:bff', 'scope:public'],
            },
            {
              sourceTag: 'scope:operator',
              onlyDependOnLibsWithTags: ['scope:operator', 'scope:public'],
            },
            {
              sourceTag: 'scope:business',
              onlyDependOnLibsWithTags: ['scope:business', 'scope:public'],
            },
          ],
          enforceBuildableLibDependency: true,
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['error', 'info'] }],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'platform/bff/backoffice-e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-console': ['error', { allow: ['error', 'info'] }],
    },
  },
);
