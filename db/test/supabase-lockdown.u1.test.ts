import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { freshDatabase, type TestDb } from '../../test/postgres.ts';
import { seedEnv } from '../../test/fixtures.ts';
import { runMigrate } from '../src/migrate.ts';

/**
 * Hosted shape (infrastructure specification, Supabase): Supabase's own `anon` and
 * `authenticated` roles must never read our tables, even if they were granted access by default.
 */
describe('Supabase lockdown', () => {
  let t: TestDb;

  beforeAll(async () => {
    t = await freshDatabase({ migrated: false });
    const su = t.pool('superuser');
    for (const role of ['anon', 'authenticated']) {
      await su.query(
        `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN CREATE ROLE ${role} NOLOGIN; END IF; END $$`,
      );
      // Worst case: every object ce_migrate creates is granted to them by default.
      await su.query(`GRANT USAGE ON SCHEMA public, pgboss TO ${role}`);
      await su.query(
        `ALTER DEFAULT PRIVILEGES FOR ROLE ce_migrate IN SCHEMA public, pgboss GRANT ALL ON TABLES TO ${role}`,
      );
    }
    await runMigrate({ url: t.url('ce_migrate'), env: seedEnv() });
  });
  afterAll(() => t.close());

  it.each(['anon', 'authenticated'])('%s cannot select from any of our tables', async (role) => {
    const { rows: tables } = await t
      .pool('superuser')
      .query<{ s: string; n: string }>(
        "SELECT schemaname AS s, tablename AS n FROM pg_tables WHERE schemaname IN ('public','pgboss')",
      );
    expect(tables.length).toBeGreaterThan(10);
    const client = await t.pool('superuser').connect();
    try {
      await client.query(`SET ROLE ${role}`);
      for (const { s, n } of tables) {
        await expect(
          client.query(`SELECT 1 FROM "${s}"."${n}" LIMIT 1`),
          `${s}.${n}`,
        ).rejects.toMatchObject({
          code: '42501',
        });
      }
    } finally {
      await client.query('RESET ROLE');
      client.release();
    }
  });
});
