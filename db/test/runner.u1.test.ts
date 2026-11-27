import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { freshDatabase, type TestDb } from '../../test/postgres.ts';

describe('test runner', () => {
  let t: TestDb;
  beforeAll(async () => {
    t = await freshDatabase({ migrated: false });
  });
  afterAll(() => t.close());

  it('reaches the PostgreSQL container as ce_api', async () => {
    const { rows } = await t.pool('ce_api').query('SELECT 1 AS one, current_user AS who');
    expect(rows).toEqual([{ one: 1, who: 'ce_api' }]);
  });

  it('creates the three roles without BYPASSRLS', async () => {
    const { rows } = await t
      .pool('superuser')
      .query(
        "SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname LIKE 'ce\\_%' ORDER BY rolname",
      );
    expect(rows).toEqual([
      { rolname: 'ce_api', rolbypassrls: false },
      { rolname: 'ce_migrate', rolbypassrls: false },
      { rolname: 'ce_worker', rolbypassrls: false },
    ]);
  });
});
