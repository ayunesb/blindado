// ESLint v9 flat config
/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: [
      'public/**',
      'supabase/functions/**',
      '**/*.svg',
      '**/*.png',
      '**/*.jpg',
      'supabase/.temp/**',
    ],
  },
  {
    files: ['**/*.js', '**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { window: 'readonly', document: 'readonly', console: 'readonly' },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-console': 'off',
    },
  },
];
