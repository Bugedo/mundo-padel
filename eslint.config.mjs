import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      // Fetch-on-mount / auth subscription patterns are valid; this rule is too strict for our app.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'node_modules/**',
    'supabase/migrations_archive/**',
    'scripts/**',
    'jest.config.js',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
