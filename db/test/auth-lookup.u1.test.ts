import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { freshDatabase, type TestDb } from '../../test/postgres.ts';
import { seedOrganisations, type Seeded } from '../../test/fixtures.ts';

/** Security design, Authentication: the one narrow definer function for bearer tokens. */
describe('auth_service_account', () => {
  let t: TestDb;
  let s: Seeded;

  beforeAll(async () => {
    t = await freshDatabase();
    s = await seedOrganisations(t);
  });
  afterAll(() => t.close());

  it('returns exactly that account as ce_api, with no organisation set', async () => {
    const { rows } = await t
      .pool('ce_api')
      .query('SELECT * FROM auth_service_account($1)', [s.globex.agent.apiKeyId]);
    expect(rows).toEqual([
      {
        service_account_id: s.globex.agent.serviceAccountId,
        organisation_id: s.globex.organisationId,
        role: 'Contributor',
        status: 'active',
      },
    ]);
  });

  it('returns no row for an unknown key', async () => {
    const { rows } = await t
      .pool('ce_api')
      .query('SELECT * FROM auth_service_account($1)', ['nope']);
    expect(rows).toEqual([]);
  });

  it('is not executable by PUBLIC or by ce_worker', async () => {
    const { rows } = await t
      .pool('superuser')
      .query(
        "SELECT has_function_privilege('public', 'auth_service_account(text)', 'EXECUTE') AS public_can",
      );
    expect(rows[0].public_can).toBe(false);
    await expect(
      t.pool('ce_worker').query('SELECT * FROM auth_service_account($1)', ['x']),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('is a SECURITY DEFINER owned by ce_migrate with a pinned search_path', async () => {
    const { rows } = await t.pool('superuser').query(
      `SELECT p.prosecdef, pg_get_userbyid(p.proowner) AS owner, p.proconfig
         FROM pg_proc p WHERE p.proname = 'auth_service_account'`,
    );
    expect(rows[0].prosecdef).toBe(true);
    expect(rows[0].owner).toBe('ce_migrate');
    expect(rows[0].proconfig.join(',')).toMatch(/search_path=/);
  });
});
