/**
 * The `migrate` image entry point (one-shot, as ce_migrate): Kysely migrations (tables, row-level
 * security, the definer function), pg-boss schema and queues, grants, then the seed. Every part is
 * idempotent, so running the same release's migrate twice changes nothing; then it exits 0.
 */
import { Kysely, PostgresDialect } from 'kysely';
import { Migrator, type Migration } from 'kysely/migration';
import pg from 'pg';
import { createAuth } from './auth.ts';
import { migrateConfig } from './config.ts';
import { applyGrants } from './grants.ts';
import * as m0001 from './migrations/0001_organisations.ts';
import * as m0002 from './migrations/0002_better_auth.ts';
import * as m0003 from './migrations/0003_knowledge.ts';
import * as m0004 from './migrations/0004_row_level_security.ts';
import { setupJobQueue } from './queues.ts';
import type { Database } from './schema.ts';
import { runSeed } from './seed.ts';

const MIGRATIONS: Record<string, Migration> = {
  '0001_organisations': m0001,
  '0002_better_auth': m0002,
  '0003_knowledge': m0003,
  '0004_row_level_security': m0004,
};

export async function runMigrate({ url, env }: { url: string; env: NodeJS.ProcessEnv }) {
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
  try {
    const migrator = new Migrator({ db, provider: { getMigrations: async () => MIGRATIONS } });
    const { error } = await migrator.migrateToLatest();
    if (error) throw error;
    await setupJobQueue(url);
    await applyGrants(db);
    if (env.BETTER_AUTH_SECRET) {
      await runSeed(db, createAuth({ pool, secret: env.BETTER_AUTH_SECRET }), env);
    }
  } finally {
    await db.destroy();
  }
}

if (import.meta.main) {
  const config = migrateConfig();
  runMigrate({ url: config.DATABASE_URL_MIGRATE, env: process.env }).then(
    () => process.exit(0),
    (error: unknown) => {
      // The message only: the connection string (with its password) is never printed.
      console.error('migrate failed:', error instanceof Error ? error.message : 'unknown error');
      process.exit(1);
    },
  );
}
