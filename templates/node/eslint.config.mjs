import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'build/**', 'coverage/**', 'node_modules/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mts,cts,js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  eslintConfigPrettier
);
