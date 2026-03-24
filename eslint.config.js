import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    files: ['src/**/*.ts'],
    extends: [
      ...tseslint.configs.recommended,
    ],
    rules: {
      // Relax for Canvas 2D code (lots of any for ctx operations)
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow non-null assertions (canvas element access)
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Allow unused vars prefixed with _
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // No console.* in library code (use logger)
      'no-console': 'error',
    },
  },
  {
    files: ['dev/**/*.ts', 'tests/**/*.ts', 'examples/**/*.ts'],
    extends: [
      ...tseslint.configs.recommended,
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off', // OK in dev/test code
    },
  },
  {
    // Logger is the only file allowed to use console
    files: ['src/core/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    ignores: ['dist/', 'dist-demo/', 'node_modules/', '*.js', '*.cjs'],
  },
);
