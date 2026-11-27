// Input for the Better Auth CLI only (`npx auth generate --config db/better-auth.config.ts`),
// which writes the SQL committed in db/src/migrations/0002_better_auth.ts.
import pg from 'pg';
import { createAuth } from './src/auth.ts';

export const auth = createAuth({
  pool: new pg.Pool({ connectionString: process.env.DATABASE_URL_MIGRATE }),
  secret: process.env.BETTER_AUTH_SECRET ?? 'cli-only-not-a-secret-cli-only-not-a-secret',
});
