import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default defineConfig(
  { ignores: ['**/node_modules/', '**/dist/', 'coverage/', 'aidlc/', '.claude/'] },
  tseslint.configs.strict,
  prettier,
  {
    // NFR5.8: every SQL statement is parameterised; string-built SQL only in migrations.
    files: ['**/*.{ts,tsx}'],
    ignores: ['db/src/migrations/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='sql'][property.name=/^(raw|lit)$/]",
          message: 'sql.raw and sql.lit are allowed only in db/src/migrations (NFR5.8).',
        },
      ],
    },
  },
  {
    // Tests assert on fixtures they created themselves.
    files: ['**/test/**/*.{ts,tsx}', 'test/**/*.ts', 'e2e/**/*.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    // C7 module boundary: routes and MCP tools reach the database only through withOrganisation.
    files: ['api/src/routes/**/*.ts', 'api/src/mcp/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/db/pool*', 'pg', 'pg-boss'],
              message:
                'Use withOrganisation (api/src/db/with-organisation.ts), never the raw pool.',
            },
            {
              group: ['kysely'],
              allowTypeImports: true,
              message:
                'Use withOrganisation (api/src/db/with-organisation.ts), never the raw pool.',
            },
          ],
        },
      ],
    },
  },
);
