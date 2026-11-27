import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { freshDatabase, type TestDb } from '../../test/postgres.ts';
import {
  insertApprovedItem,
  insertLink,
  seedOrganisations,
  type ItemFixture,
  type Seeded,
} from '../../test/fixtures.ts';

const EXPECTED_COLUMNS: Record<string, string[]> = {
  organisations: ['organisation_id', 'name', 'address', 'status', 'created_at'],
  service_accounts: [
    'service_account_id',
    'organisation_id',
    'name',
    'role',
    'status',
    'api_key_id',
    'created_at',
  ],
  groups: ['group_id', 'organisation_id', 'name', 'created_at'],
  group_members: ['organisation_id', 'group_id', 'user_id'],
  items: [
    'item_id',
    'organisation_id',
    'type',
    'current_version_id',
    'status',
    'last_reviewed_at',
    'created_at',
  ],
  item_versions: [
    'version_id',
    'organisation_id',
    'item_id',
    'version_number',
    'title',
    'content',
    'why',
    'owners',
    'sources',
    'proposal_id',
    'approved_by',
    'approved_at',
    'flags',
  ],
  links: [
    'link_id',
    'organisation_id',
    'from_item_id',
    'to_item_id',
    'link_type',
    'added_in_version_id',
    'removed_in_version_id',
  ],
  proposals: [
    'proposal_id',
    'organisation_id',
    'kind',
    'item_id',
    'base_version_id',
    'changes',
    'reason',
    'origin',
    'proposer_kind',
    'proposer_id',
    'status',
    'created_at',
    'idempotency_key',
    'request_hash',
  ],
  decisions: [
    'decision_id',
    'organisation_id',
    'proposal_id',
    'decider_id',
    'outcome',
    'comment',
    'is_self_approval',
    'decided_at',
  ],
};

describe('schema', () => {
  let t: TestDb;
  let s: Seeded;
  let a: ItemFixture;
  let b: ItemFixture;

  beforeAll(async () => {
    t = await freshDatabase();
    s = await seedOrganisations(t);
    a = await insertApprovedItem(t, s.acme, { title: 'A' });
    b = await insertApprovedItem(t, s.acme, { title: 'B' });
  });
  afterAll(() => t.close());

  it('has every planned table with exactly its planned columns', async () => {
    const { rows } = await t
      .pool('superuser')
      .query<{ table_name: string; column_name: string }>(
        "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' ORDER BY ordinal_position",
      );
    for (const [table, columns] of Object.entries(EXPECTED_COLUMNS)) {
      const actual = rows.filter((r) => r.table_name === table).map((r) => r.column_name);
      expect(actual, table).toEqual(columns);
    }
  });

  it('adds organisation_id, role and status to the Better Auth user table', async () => {
    const { rows } = await t
      .pool('superuser')
      .query<{ column_name: string }>(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user'",
      );
    const names = rows.map((r) => r.column_name);
    expect(names).toEqual(
      expect.arrayContaining(['id', 'email', 'organisation_id', 'role', 'status']),
    );
    for (const table of ['session', 'account', 'verification', 'apikey']) {
      const { rowCount } = await t
        .pool('superuser')
        .query('SELECT 1 FROM information_schema.tables WHERE table_name = $1', [table]);
      expect(rowCount, table).toBe(1);
    }
  });

  it('refuses a link from an item to itself', async () => {
    await expect(insertLink(t, s.acme, a, a)).rejects.toMatchObject({ code: '23514' });
  });

  it('refuses a second live link with the same ends and type, but allows it once the first is removed', async () => {
    const first = await insertLink(t, s.acme, a, b, 'depends-on');
    await expect(insertLink(t, s.acme, a, b, 'depends-on')).rejects.toMatchObject({
      code: '23505',
    });
    await t
      .db('ce_migrate')
      .updateTable('links')
      .set({ removed_in_version_id: a.versionId })
      .where('link_id', '=', first)
      .execute();
    await expect(insertLink(t, s.acme, a, b, 'depends-on')).resolves.toBeTypeOf('string');
  });

  it('keeps version numbers unique per item', async () => {
    const insert = t
      .db('ce_migrate')
      .insertInto('item_versions')
      .values({
        version_id: randomUUID(),
        organisation_id: s.acme.organisationId,
        item_id: a.itemId,
        version_number: 1,
        title: 'dup',
        content: 'dup',
        why: null,
        owners: JSON.stringify([{ kind: 'group', ref_id: s.acme.groupId }]),
        sources: JSON.stringify([{ kind: 'system', title: 'x' }]),
        proposal_id: b.proposalId,
        approved_by: s.acme.ownerId,
        approved_at: new Date(),
      });
    await expect(insert.execute()).rejects.toMatchObject({ code: '23505' });
  });

  it('refuses an item type outside the starting seven and an address in the wrong shape', async () => {
    await expect(
      t
        .db('ce_migrate')
        .updateTable('items')
        .set({ type: 'not-a-type' })
        .where('item_id', '=', a.itemId)
        .execute(),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      t
        .db('ce_migrate')
        .insertInto('organisations')
        .values({ name: 'Bad', address: 'Not_Valid' })
        .execute(),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('refuses a second proposal with the same proposer and idempotency key in one organisation', async () => {
    const row = {
      organisation_id: s.acme.organisationId,
      kind: 'create',
      item_id: randomUUID(),
      base_version_id: null,
      changes: '{}',
      reason: 'r',
      origin: 'person',
      proposer_kind: 'user',
      proposer_id: s.acme.ownerId,
      idempotency_key: 'same-key',
      request_hash: 'h',
    };
    await t.db('ce_migrate').insertInto('proposals').values(row).execute();
    await expect(
      t
        .db('ce_migrate')
        .insertInto('proposals')
        .values({ ...row, item_id: randomUUID() })
        .execute(),
    ).rejects.toMatchObject({ code: '23505' });
  });
});
