// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
  // Layer guardrails: domain & ports must be framework-free and not import adapters/application
  {
    files: ['src/modules/**/domain/**/*.ts', 'src/modules/**/ports/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nestjs/*', 'typeorm', 'bcrypt'],
              message: 'Domain/Ports must be framework-free (no NestJS/TypeORM/bcrypt).',
            },
            {
              group: ['**/adapters/**', '**/application/**', '**/controllers/**'],
              message: 'Domain/Ports must not depend on Adapters/Application/Controllers.',
            },
          ],
        },
      ],
    },
  },
  // Relax rules for test files
  {
    files: ['test/**/*.ts', '**/*.e2e-spec.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  // Relax rules for legacy services (to be refactored)
  {
    files: [
      'src/services/**/*.ts',
      'src/controllers/**/*.ts',
      'src/settings.controller.ts',
      'src/system-settings.controller.ts',
      'src/webhooks/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
);
