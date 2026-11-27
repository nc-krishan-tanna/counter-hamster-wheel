import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
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
import { lockItem } from '../../src/repo/items.ts';
import {
  IdempotencyKeyConflict,
  insertProposal,
  lockProposal,
  type NewProposalRow,
} from '../../src/repo/proposals.ts';

describe('proposals repository', () => {
  let t: TestDb;
  let s: Seeded;
  let db: Db;
  let item: ItemFixture;

  beforeAll(async () => {
    t = await freshDatabase();
    s = await seedOrganisations(t);
    item = await insertApprovedItem(t, s.acme);
    db = createDb(t.url('ce_api'));
  });
  afterAll(async () => {
    await db?.destroy();
    await t?.close();
  });

  const row = (overrides: Partial<NewProposalRow> = {}): NewProposalRow => ({
    kind: 'change',
    itemId: item.itemId,
    baseVersionId: item.versionId,
    changes: { content: 'new content' },
    reason: 'because',
    origin: 'person',
    proposerKind: 'user',
    proposerId: s.acme.contributorId,
    idempotencyKey: 'key-1',
    requestHash: 'hash-1',
    ...overrides,
  });

  it('returns the first proposal for the same key and the same request', async () => {
    const first = await withOrganisation(db, s.acme.organisationId, (trx) =>
      insertProposal(trx, row()),
    );
    const again = await withOrganisation(db, s.acme.organisationId, (trx) =>
      insertProposal(trx, row()),
    );
    expect(first.replayed).toBe(false);
    expect(again.replayed).toBe(true);
    expect(again.proposal.proposalId).toBe(first.proposal.proposalId);
    expect(first.proposal).toMatchObject({
      status: 'open',
      kind: 'change',
      changes: { content: 'new content' },
    });
  });

  it('refuses the same key with a different request as a key conflict', async () => {
    await expect(
      withOrganisation(db, s.acme.organisationId, (trx) =>
        insertProposal(trx, row({ requestHash: 'hash-2', reason: 'other' })),
      ),
    ).rejects.toBeInstanceOf(IdempotencyKeyConflict);
  });

  it('treats the same key in another organisation as a different key', async () => {
    const other = await insertApprovedItem(t, s.globex);
    const result = await withOrganisation(db, s.globex.organisationId, (trx) =>
      insertProposal(
        trx,
        row({
          itemId: other.itemId,
          baseVersionId: other.versionId,
          proposerId: s.acme.contributorId,
        }),
      ),
    );
    expect(result.replayed).toBe(false);
  });

  it('locks the item, then the proposal, so a second decider waits', async () => {
    const proposal = await withOrganisation(db, s.acme.organisationId, (trx) =>
      insertProposal(trx, row({ idempotencyKey: randomUUID() })),
    );
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    const first = withOrganisation(db, s.acme.organisationId, async (trx) => {
      expect(await lockItem(trx, item.itemId)).toMatchObject({ currentVersionId: item.versionId });
      expect(await lockProposal(trx, proposal.proposal.proposalId)).toMatchObject({
        status: 'open',
      });
      await held;
    });
    await new Promise((r) => setTimeout(r, 100));
    await expect(
      withOrganisation(db, s.acme.organisationId, async (trx) => {
        await sql`SET LOCAL lock_timeout = '200ms'`.execute(trx);
        await lockItem(trx, item.itemId);
      }),
    ).rejects.toMatchObject({ code: '55P03' });
    release();
    await first;
    await expect(
      withOrganisation(db, s.acme.organisationId, (trx) => lockItem(trx, item.itemId)),
    ).resolves.toBeDefined();
  });

  it('answers undefined when locking an unknown item or proposal', async () => {
    await withOrganisation(db, s.acme.organisationId, async (trx) => {
      expect(await lockItem(trx, randomUUID())).toBeUndefined();
      expect(await lockProposal(trx, randomUUID())).toBeUndefined();
    });
  });
});
