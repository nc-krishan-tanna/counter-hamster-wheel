import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { freshDatabase, type TestDb } from '../../test/postgres.ts';
import {
  insertApprovedItem,
  seedOrganisations,
  type ItemFixture,
  type Seeded,
} from '../../test/fixtures.ts';

/** NFR9.2: history is append-only for the api role; the worker never reads knowledge. */
describe('grants', () => {
  let t: TestDb;
  let s: Seeded;
  let item: ItemFixture;

  beforeAll(async () => {
    t = await freshDatabase();
    s = await seedOrganisations(t);
    item = await insertApprovedItem(t, s.acme);
  });
  afterAll(() => t.close());

  /** Runs one statement as ce_api with the organisation set, so only privileges can refuse it. */
  async function asApi(statement: string, params: unknown[] = []) {
    const client = await t.pool('ce_api').connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.organisation_id', $1, true)", [
        s.acme.organisationId,
      ]);
      await client.query(statement, params);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  }

  const refusedForApi: [string, string][] = [
    ['UPDATE item_versions', "UPDATE item_versions SET title = 'x'"],
    ['DELETE FROM item_versions', 'DELETE FROM item_versions'],
    ['UPDATE decisions', "UPDATE decisions SET comment = 'x'"],
    ['DELETE FROM decisions', 'DELETE FROM decisions'],
    ['DELETE FROM proposals', 'DELETE FROM proposals'],
    ['DELETE FROM links', 'DELETE FROM links'],
    ['UPDATE proposals SET reason', "UPDATE proposals SET reason = 'x'"],
    ['UPDATE items SET type', "UPDATE items SET type = 'process'"],
    ['UPDATE items SET organisation_id', 'UPDATE items SET organisation_id = organisation_id'],
  ];

  it.each(refusedForApi)('ce_api: %s is permission denied', async (_name, statement) => {
    await expect(asApi(statement)).rejects.toMatchObject({ code: '42501' });
  });

  it('ce_api may move the item pointer, decide a proposal status and remove a link', async () => {
    await expect(
      asApi('UPDATE items SET last_reviewed_at = now() WHERE item_id = $1', [item.itemId]),
    ).resolves.toBeUndefined();
    await expect(
      asApi("UPDATE proposals SET status = 'approved' WHERE proposal_id = $1", [item.proposalId]),
    ).resolves.toBeUndefined();
    await expect(
      asApi('UPDATE links SET removed_in_version_id = NULL WHERE false'),
    ).resolves.toBeUndefined();
  });

  it.each(['items', 'organisations', 'item_versions', 'proposals'])(
    'ce_worker: SELECT on %s is permission denied',
    async (table) => {
      await expect(t.pool('ce_worker').query(`SELECT 1 FROM ${table}`)).rejects.toMatchObject({
        code: '42501',
      });
    },
  );

  it('ce_worker may use the pgboss schema', async () => {
    await expect(
      t.pool('ce_worker').query('SELECT count(*) FROM pgboss.job'),
    ).resolves.toBeTruthy();
  });

  it('neither ce_api nor ce_worker owns a table', async () => {
    const { rows } = await t
      .pool('superuser')
      .query(
        "SELECT tablename FROM pg_tables WHERE schemaname IN ('public','pgboss') AND tableowner IN ('ce_api','ce_worker')",
      );
    expect(rows).toEqual([]);
  });
});
