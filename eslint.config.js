// ESLint v9 flat config for the web app only
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // Ignore built artifacts and non-web folders
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/**',
      'supabase/**',
      'web/**',
  '.eslintrc.json',
  '.eslintignore',
  'client.html',
  'guard.html',
      '**/*.html',
      '**/*.svg',
      '**/*.png',
      '**/*.jpg',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // App + components (TypeScript/React)
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Node scripts
  {
    files: ['scripts/**/*.cjs', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: { ...globals.node },
    },
    rules: {
      'no-undef': 'off',
    },
  },

  // Tests (Playwright): allow globals
  {
    files: ['tests/**/*.{ts,tsx}', 'e2e/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        test: true,
        expect: true,
        page: true,
        browser: true,
        context: true,
      },
    },
  },
  // Deno smoke tests live under tests but are not linted by TS-ESLint
  {
    files: ['tests/*_test.ts'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
