import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { freshDatabase, type TestDb } from '../../../test/postgres.ts';
import {
  insertApprovedItem,
  seedOrganisations,
  type ItemFixture,
  type Seeded,
} from '../../../test/fixtures.ts';
import { createDb, type Db } from '../../src/db/pool.ts';
import { withOrganisation } from '../../src/db/with-organisation.ts';
import { searchItems } from '../../src/repo/search.ts';

describe('search repository (BR4.2)', () => {
  let t: TestDb;
  let s: Seeded;
  let db: Db;
  let invoice: ItemFixture;

  beforeAll(async () => {
    t = await freshDatabase();
    s = await seedOrganisations(t);
    invoice = await insertApprovedItem(t, s.acme, {
      title: 'Invoice approval',
      content: 'Two signatures',
    });
    await insertApprovedItem(t, s.acme, {
      title: 'Expenses',
      content: 'Receipts for every INVOICE line',
    });
    await insertApprovedItem(t, s.acme, { title: '100% match', content: 'literal percent' });
    await insertApprovedItem(t, s.globex, { title: 'Invoice at Globex' });
    // A second version of the invoice item whose title no longer says "Invoice".
    const v2 = randomUUID();
    const p2 = randomUUID();
    const owner = t.db('ce_migrate');
    await owner
      .insertInto('proposals')
      .values({
        proposal_id: p2,
        organisation_id: s.acme.organisationId,
        kind: 'change',
        item_id: invoice.itemId,
        base_version_id: invoice.versionId,
        changes: '{}',
        reason: 'rename',
        origin: 'person',
        proposer_kind: 'user',
        proposer_id: s.acme.ownerId,
        status: 'approved',
        idempotency_key: randomUUID(),
        request_hash: 'h',
      })
      .execute();
    await owner
      .insertInto('item_versions')
      .values({
        version_id: v2,
        organisation_id: s.acme.organisationId,
        item_id: invoice.itemId,
        version_number: 2,
        title: 'Purchase sign-off',
        content: 'Two signatures',
        why: null,
        owners: JSON.stringify([{ kind: 'group', ref_id: s.acme.groupId }]),
        sources: JSON.stringify([{ kind: 'system', title: 'x' }]),
        proposal_id: p2,
        approved_by: s.acme.ownerId,
        approved_at: new Date(),
      })
      .execute();
    await owner
      .updateTable('items')
      .set({ current_version_id: v2 })
      .where('item_id', '=', invoice.itemId)
      .execute();
    db = createDb(t.url('ce_api'));
  });
  afterAll(async () => {
    await db?.destroy();
    await t?.close();
  });

  const search = (query: string, options: { type?: string; limit?: number } = {}) =>
    withOrganisation(db, s.acme.organisationId, (trx) => searchItems(trx, query, options));

  it('matches title or content of current versions only, case-insensitively, with owners and sources', async () => {
    const results = await search('invoice');
    expect(results.map((r) => r.title)).toEqual(['Expenses']);
    expect(results[0]).toMatchObject({
      type: 'glossary-term',
      owners: [{ kind: 'group', ref_id: s.acme.groupId }],
      sources: [expect.objectContaining({ kind: 'system' })],
    });
    expect(results[0]!.lastReviewedAt).toBeInstanceOf(Date);
    expect((await search('purchase')).map((r) => r.itemId)).toEqual([invoice.itemId]);
  });

  it('treats % and _ in the query as plain characters', async () => {
    expect((await search('100%')).map((r) => r.title)).toEqual(['100% match']);
    expect(await search('%%')).toEqual([]);
  });

  it('returns at most 50 results and filters by type', async () => {
    expect((await search('', { limit: 500 })).length).toBeLessThanOrEqual(50);
    expect(await search('', { type: 'process' })).toEqual([]);
  });
});
