import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { freshDatabase, type TestDb } from '../../../test/postgres.ts';
import {
  insertApprovedItem,
  insertLink,
  seedOrganisations,
  type ItemFixture,
  type Seeded,
} from '../../../test/fixtures.ts';
import { createDb, type Db } from '../../src/db/pool.ts';
import { withOrganisation } from '../../src/db/with-organisation.ts';
import { getItemView, listHistory, listItems } from '../../src/repo/items.ts';
import { insertProposal, listProposalsForItem } from '../../src/repo/proposals.ts';

describe('items repository', () => {
  let t: TestDb;
  let s: Seeded;
  let db: Db;
  let a: ItemFixture;
  let b: ItemFixture;

  beforeAll(async () => {
    t = await freshDatabase();
    s = await seedOrganisations(t);
    a = await insertApprovedItem(t, s.acme, { title: 'Alpha', content: 'Alpha content' });
    b = await insertApprovedItem(t, s.acme, { title: 'Beta' });
    await insertLink(t, s.acme, a, b, 'depends-on');
    db = createDb(t.url('ce_api'));
  });
  afterAll(async () => {
    await db?.destroy();
    await t?.close();
  });

  const asAcme = <T>(fn: Parameters<typeof withOrganisation<T>>[2]) =>
    withOrganisation(db, s.acme.organisationId, fn);

  it('reads the current approved version with owners, sources and links in both directions', async () => {
    const viewA = await asAcme((trx) => getItemView(trx, a.itemId));
    expect(viewA).toMatchObject({
      itemId: a.itemId,
      type: 'glossary-term',
      status: 'active',
      version: {
        versionId: a.versionId,
        versionNumber: 1,
        title: 'Alpha',
        content: 'Alpha content',
        owners: [{ kind: 'group', ref_id: s.acme.groupId }],
        sources: [expect.objectContaining({ kind: 'system' })],
      },
      linksOut: [{ itemId: b.itemId, title: 'Beta', linkType: 'depends-on' }],
      linksIn: [],
    });
    expect(viewA!.lastReviewedAt).toBeInstanceOf(Date);
    const viewB = await asAcme((trx) => getItemView(trx, b.itemId));
    expect(viewB!.linksIn).toEqual([
      expect.objectContaining({ itemId: a.itemId, title: 'Alpha', linkType: 'depends-on' }),
    ]);
  });

  it('answers undefined for an unknown item and for another organisation’s item', async () => {
    expect(await asAcme((trx) => getItemView(trx, randomUUID()))).toBeUndefined();
    const other = await withOrganisation(db, s.globex.organisationId, (trx) =>
      getItemView(trx, a.itemId),
    );
    expect(other).toBeUndefined();
  });

  it('lists the full history with proposer, decider, reason and the self-approved flag', async () => {
    const history = await asAcme((trx) => listHistory(trx, a.itemId));
    expect(history).toEqual([
      expect.objectContaining({
        versionNumber: 1,
        proposalId: a.proposalId,
        proposerId: s.acme.ownerId,
        proposerKind: 'user',
        origin: 'person',
        deciderId: s.acme.ownerId,
        reason: 'fixture',
        selfApproved: true,
      }),
    ]);
  });

  it('lists open proposals apart from the approved version, which stays unchanged', async () => {
    await asAcme((trx) =>
      insertProposal(trx, {
        kind: 'change',
        itemId: a.itemId,
        baseVersionId: a.versionId,
        changes: { title: 'Alpha renamed' },
        reason: 'clearer name',
        origin: 'person',
        proposerKind: 'user',
        proposerId: s.acme.contributorId,
        idempotencyKey: randomUUID(),
        requestHash: 'h1',
      }),
    );
    const proposals = await asAcme((trx) => listProposalsForItem(trx, a.itemId));
    expect(proposals.filter((p) => p.status === 'open')).toEqual([
      expect.objectContaining({ kind: 'change', reason: 'clearer name', status: 'open' }),
    ]);
    const view = await asAcme((trx) => getItemView(trx, a.itemId));
    expect(view!.version.title).toBe('Alpha');
  });

  it('lists approved items of the organisation only, filtered by type, at most the limit', async () => {
    const all = await asAcme((trx) => listItems(trx, { limit: 50 }));
    expect(all.map((i) => i.itemId).sort()).toEqual([a.itemId, b.itemId].sort());
    expect(await asAcme((trx) => listItems(trx, { limit: 1 }))).toHaveLength(1);
    expect(await asAcme((trx) => listItems(trx, { limit: 50, type: 'process' }))).toEqual([]);
  });
});
