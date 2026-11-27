import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { freshDatabase, type TestDb } from '../../test/postgres.ts';
import { seedEnv } from '../../test/fixtures.ts';
import { runMigrate } from '../src/migrate.ts';
import { createAuth } from '../src/auth.ts';
import { ownersGroupId } from '../src/seed.ts';
import { MissingEnvError, requireEnv } from '../src/config.ts';

/** Everything that shows what migrate produced; two runs must give the same picture. */
async function snapshot(t: TestDb) {
  const q = async (text: string) => (await t.pool('superuser').query(text)).rows;
  return {
    tables: await q(
      "SELECT schemaname, tablename, tableowner, rowsecurity FROM pg_tables WHERE schemaname IN ('public','pgboss') ORDER BY 1,2",
    ),
    policies: await q(
      'SELECT tablename, policyname, qual, with_check FROM pg_policies ORDER BY 1,2',
    ),
    grants: await q(
      "SELECT grantee, table_schema, table_name, privilege_type FROM information_schema.role_table_grants WHERE grantee IN ('ce_api','ce_worker') ORDER BY 1,2,3,4",
    ),
    columnGrants: await q(
      "SELECT grantee, table_name, column_name, privilege_type FROM information_schema.column_privileges WHERE grantee = 'ce_api' AND privilege_type = 'UPDATE' ORDER BY 1,2,3",
    ),
    counts: await q(
      `SELECT (SELECT count(*) FROM organisations) AS organisations, (SELECT count(*) FROM "user") AS users,
              (SELECT count(*) FROM account) AS accounts, (SELECT count(*) FROM apikey) AS keys,
              (SELECT count(*) FROM service_accounts) AS agents, (SELECT count(*) FROM groups) AS groups,
              (SELECT count(*) FROM group_members) AS members`,
    ),
    migrations: await q('SELECT name FROM kysely_migration ORDER BY name'),
    pgbossVersion: await q('SELECT version FROM pgboss.version'),
  };
}

describe('migrate', () => {
  let t: TestDb;
  const env = seedEnv();

  beforeAll(async () => {
    t = await freshDatabase({ migrated: false });
  });
  afterAll(() => t.close());

  it('changes nothing when run a second time', async () => {
    await runMigrate({ url: t.url('ce_migrate'), env });
    const first = await snapshot(t);
    await runMigrate({ url: t.url('ce_migrate'), env });
    expect(await snapshot(t)).toEqual(first);
    expect(first.counts[0]).toMatchObject({
      organisations: '2',
      users: '3',
      keys: '2',
      agents: '2',
      groups: '2',
    });
  });

  it('never stores a seeded agent token in plain text', async () => {
    const tokens = [env.SEED_ACME_AGENT_TOKEN!, env.SEED_GLOBEX_AGENT_TOKEN!];
    const { rows: columns } = await t.pool('superuser').query<{ s: string; t: string; c: string }>(
      `SELECT table_schema AS s, table_name AS t, column_name AS c FROM information_schema.columns
        WHERE table_schema IN ('public','pgboss') AND data_type IN ('text','character varying','jsonb')`,
    );
    for (const { s, t: table, c } of columns) {
      for (const token of tokens) {
        const { rowCount } = await t
          .pool('superuser')
          .query(`SELECT 1 FROM "${s}"."${table}" WHERE "${c}"::text LIKE '%' || $1 || '%'`, [
            token,
          ]);
        expect(rowCount, `${s}.${table}.${c}`).toBe(0);
      }
    }
  });

  it('stores each token with the API-key plugin hashing, so the plugin verifies it', async () => {
    const pool = new pg.Pool({ connectionString: t.url('ce_migrate') });
    try {
      const auth = createAuth({ pool, secret: env.BETTER_AUTH_SECRET! });
      const good = await auth.api.verifyApiKey({ body: { key: env.SEED_ACME_AGENT_TOKEN! } });
      expect(good.valid).toBe(true);
      const bad = await auth.api.verifyApiKey({ body: { key: 'ce_not-a-real-token' } });
      expect(bad.valid).toBe(false);
    } finally {
      await pool.end();
    }
  });

  it('gives each Owners group the id derived from its address', async () => {
    const { rows } = await t
      .pool('superuser')
      .query(
        'SELECT o.address, g.group_id FROM groups g JOIN organisations o USING (organisation_id) ORDER BY 1',
      );
    expect(rows).toEqual([
      { address: 'acme', group_id: ownersGroupId('acme') },
      { address: 'globex', group_id: ownersGroupId('globex') },
    ]);
    expect(ownersGroupId('acme')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('seeds an organisation only when its variables are set', async () => {
    const t2 = await freshDatabase({ migrated: false });
    try {
      const onlyAcme = { ...env };
      delete onlyAcme.SEED_GLOBEX_OWNER_PASSWORD;
      delete onlyAcme.SEED_GLOBEX_AGENT_TOKEN;
      await runMigrate({ url: t2.url('ce_migrate'), env: onlyAcme });
      const { rows } = await t2.pool('superuser').query('SELECT address FROM organisations');
      expect(rows).toEqual([{ address: 'acme' }]);
    } finally {
      await t2.close();
    }
  });
});

describe('startup configuration check', () => {
  it('names every missing variable and never prints a value', () => {
    const env = { DATABASE_URL_MIGRATE: 'postgres://secret-value@x/y' };
    try {
      requireEnv(['DATABASE_URL_MIGRATE', 'BETTER_AUTH_SECRET', 'PUBLIC_BASE_DOMAIN'], env);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MissingEnvError);
      expect((error as MissingEnvError).missing).toEqual([
        'BETTER_AUTH_SECRET',
        'PUBLIC_BASE_DOMAIN',
      ]);
      expect((error as Error).message).not.toContain('secret-value');
    }
  });

  it('returns the values when all are present', () => {
    expect(requireEnv(['A', 'B'], { A: '1', B: '2' })).toEqual({ A: '1', B: '2' });
  });
});
