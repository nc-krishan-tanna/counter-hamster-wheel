import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Db } from '../../src/db/pool.ts';
import { decide } from '../../src/domain/decide.ts';
import { etagOf } from '../../src/domain/etag.ts';
import { propose } from '../../src/domain/propose.ts';
import { domainFixture, type DomainFixture } from './setup.ts';

/** NFR10.2: concurrent decisions queue on the item lock; exactly one wins. */
describe('decide concurrency', () => {
  let f: DomainFixture;
  let second: Db;

  beforeAll(async () => {
    f = await domainFixture();
    second = createDb(f.t.url('ce_api'));
  });
  afterAll(async () => {
    await second?.destroy();
    await f?.close();
  });

  const outcomeOf = (promise: Promise<unknown>) =>
    promise.then(
      () => 'ok',
      (error: { code?: string }) => error.code ?? String(error),
    );

  it('two parallel approvals of one proposal: one succeeds, one is already decided', async () => {
    const item = await f.createItem('Race one');
    const p = await propose(
      f.db,
      f.contributor,
      {
        kind: 'change',
        itemId: item.itemId,
        baseVersionId: item.versionId,
        reason: 'r',
        changes: { content: 'x' },
      },
      { idempotencyKey: randomUUID(), channel: 'web' },
    );
    const results = await Promise.all([
      outcomeOf(
        decide(f.db, f.owner, { proposalId: p.proposalId, outcome: 'approve', ifMatch: etagOf(p) }),
      ),
      outcomeOf(
        decide(second, f.owner, {
          proposalId: p.proposalId,
          outcome: 'approve',
          ifMatch: etagOf(p),
        }),
      ),
    ]);
    expect(results.sort()).toEqual(['already-decided', 'ok']);
  });

  it('two proposals on one item approved in parallel: one succeeds, the other is out of date', async () => {
    const item = await f.createItem('Race two');
    const submit = (content: string) =>
      propose(
        f.db,
        f.contributor,
        {
          kind: 'change',
          itemId: item.itemId,
          baseVersionId: item.versionId,
          reason: 'r',
          changes: { content },
        },
        { idempotencyKey: randomUUID(), channel: 'web' },
      );
    const p1 = await submit('one');
    const p2 = await submit('two');
    const results = await Promise.all([
      outcomeOf(
        decide(f.db, f.owner, {
          proposalId: p1.proposalId,
          outcome: 'approve',
          ifMatch: etagOf(p1),
        }),
      ),
      outcomeOf(
        decide(second, f.owner, {
          proposalId: p2.proposalId,
          outcome: 'approve',
          ifMatch: etagOf(p2),
        }),
      ),
    ]);
    expect(results.sort()).toEqual(['ok', 'proposal-out-of-date']);
    const { rows } = await f.t
      .pool('superuser')
      .query('SELECT count(*)::int AS n FROM item_versions WHERE item_id = $1', [item.itemId]);
    expect(rows[0].n).toBe(2);
  });
});
