import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { freshDatabase, type TestDb } from '../../../test/postgres.ts';
import { insertApprovedItem, seedOrganisations, type Seeded } from '../../../test/fixtures.ts';
import { createDb, type Db } from '../../src/db/pool.ts';
import { withOrganisation } from '../../src/db/with-organisation.ts';

describe('withOrganisation', () => {
  let t: TestDb;
  let s: Seeded;
  let db: Db;

  beforeAll(async () => {
    t = await freshDatabase();
    s = await seedOrganisations(t);
    await insertApprovedItem(t, s.acme);
    await insertApprovedItem(t, s.globex);
    db = createDb(t.url('ce_api'), 1); // one connection: every call below reuses it
  });
  afterAll(async () => {
    await db?.destroy();
    await t?.close();
  });

  it('sets the organisation for one transaction only', async () => {
    const inside = await withOrganisation(db, s.acme.organisationId, async (trx) => {
      const setting = await sql<{
        v: string;
      }>`SELECT current_setting('app.organisation_id', true) AS v`.execute(trx);
      const items = await trx.selectFrom('items').select('organisation_id').execute();
      return { setting: setting.rows[0]!.v, items };
    });
    expect(inside.setting).toBe(s.acme.organisationId);
    expect(inside.items.map((i) => i.organisation_id)).toEqual([s.acme.organisationId]);

    const after = await db
      .transaction()
      .execute((trx) => trx.selectFrom('items').selectAll().execute());
    expect(after).toEqual([]);
  });

  it('rolls back everything the callback wrote when it throws', async () => {
    await expect(
      withOrganisation(db, s.acme.organisationId, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });

  it('refuses an organisation id that is not a uuid', async () => {
    await expect(withOrganisation(db, 'not-a-uuid', async () => 1)).rejects.toThrow();
  });
});
