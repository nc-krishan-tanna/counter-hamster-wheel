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

const KNOWLEDGE_TABLES = [
  'items',
  'item_versions',
  'links',
  'proposals',
  'decisions',
  'groups',
  'group_members',
  'service_accounts',
];

/** NFR14.1: row-level security keeps organisations apart even when a query forgets the filter. */
describe('row-level security', () => {
  let t: TestDb;
  let s: Seeded;
  let a1: ItemFixture;
  let b1: ItemFixture;

  beforeAll(async () => {
    t = await freshDatabase();
    s = await seedOrganisations(t);
    a1 = await insertApprovedItem(t, s.acme);
    const a2 = await insertApprovedItem(t, s.acme);
    await insertLink(t, s.acme, a1, a2);
    b1 = await insertApprovedItem(t, s.globex);
    const b2 = await insertApprovedItem(t, s.globex);
    await insertLink(t, s.globex, b1, b2);
  });
  afterAll(() => t.close());

  it.each(KNOWLEDGE_TABLES)(
    '%s: with organisation A set, only A rows are visible',
    async (table) => {
      const client = await t.pool('ce_api').connect();
      try {
        await client.query('BEGIN');
        await client.query("SELECT set_config('app.organisation_id', $1, true)", [
          s.acme.organisationId,
        ]);
        const { rows } = await client.query<{ organisation_id: string }>(
          `SELECT organisation_id FROM ${table}`,
        );
        expect(rows.length).toBeGreaterThan(0);
        expect(new Set(rows.map((r) => r.organisation_id))).toEqual(
          new Set([s.acme.organisationId]),
        );
      } finally {
        await client.query('ROLLBACK');
        client.release();
      }
    },
  );

  it("refuses an INSERT carrying organisation B's id while A is set", async () => {
    const client = await t.pool('ce_api').connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.organisation_id', $1, true)", [
        s.acme.organisationId,
      ]);
      await expect(
        client.query(
          `INSERT INTO proposals (organisation_id, kind, item_id, changes, reason, origin, proposer_kind, proposer_id, idempotency_key, request_hash)
           VALUES ($1, 'create', $2, '{}', 'r', 'person', 'user', $3, 'k', 'h')`,
          [s.globex.organisationId, randomUUID(), s.globex.ownerId],
        ),
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  it('returns nothing with no organisation set, before and after a set_config transaction on the same connection (NULLIF case)', async () => {
    const client = await t.pool('ce_api').connect();
    try {
      const countAll = async () => {
        let total = 0;
        for (const table of KNOWLEDGE_TABLES) {
          const { rows } = await client.query<{ n: number }>(
            `SELECT count(*)::int AS n FROM ${table}`,
          );
          total += rows[0]!.n;
        }
        return total;
      };
      expect(await countAll()).toBe(0);
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.organisation_id', $1, true)", [
        s.acme.organisationId,
      ]);
      await client.query('COMMIT');
      // The setting is now '' on this connection, not NULL: NULLIF must still match no row.
      expect(await countAll()).toBe(0);
    } finally {
      client.release();
    }
  });

  it('composite foreign keys refuse a link, decision or group member pointing at another organisation', async () => {
    const owner = t.db('ce_migrate');
    await expect(
      owner
        .insertInto('links')
        .values({
          organisation_id: s.acme.organisationId,
          from_item_id: a1.itemId,
          to_item_id: b1.itemId,
          link_type: 'relates-to',
          added_in_version_id: a1.versionId,
        })
        .execute(),
    ).rejects.toMatchObject({ code: '23503' });
    const open = await owner
      .insertInto('proposals')
      .values({
        organisation_id: s.acme.organisationId,
        kind: 'create',
        item_id: randomUUID(),
        base_version_id: null,
        changes: '{}',
        reason: 'r',
        origin: 'person',
        proposer_kind: 'user',
        proposer_id: s.acme.ownerId,
        idempotency_key: randomUUID(),
        request_hash: 'h',
      })
      .returning('proposal_id')
      .executeTakeFirstOrThrow();
    await expect(
      owner
        .insertInto('decisions')
        .values({
          organisation_id: s.acme.organisationId,
          proposal_id: open.proposal_id,
          decider_id: s.globex.ownerId,
          outcome: 'approved',
          comment: null,
          is_self_approval: false,
        })
        .execute(),
    ).rejects.toMatchObject({ code: '23503' });
    await expect(
      owner
        .insertInto('group_members')
        .values({
          organisation_id: s.acme.organisationId,
          group_id: s.acme.groupId,
          user_id: s.globex.ownerId,
        })
        .execute(),
    ).rejects.toMatchObject({ code: '23503' });
  });
});
