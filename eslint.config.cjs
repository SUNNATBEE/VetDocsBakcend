const js = require('@eslint/js');
const globals = require('globals');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = [
  { ignores: ['node_modules/**', 'coverage/**'] },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    ...js.configs.recommended,
    files: ['src/**/*.js', 'tests/**/*.js', 'prisma/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  eslintConfigPrettier,
];
