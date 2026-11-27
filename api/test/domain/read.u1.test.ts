import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { decide } from '../../src/domain/decide.ts';
import { etagOf } from '../../src/domain/etag.ts';
import { ProblemError } from '../../src/domain/errors.ts';
import { propose } from '../../src/domain/propose.ts';
import {
  getVisibleProposal,
  itemVersions,
  listItemsPage,
  listVisibleProposals,
  readItem,
  searchKnowledge,
} from '../../src/domain/read.ts';
import { domainFixture, type DomainFixture } from './setup.ts';

describe('read (W5, W6)', () => {
  let f: DomainFixture;
  let item: { itemId: string; versionId: string };
  let openChange: { proposalId: string };
  let pendingCreate: { proposalId: string; itemId: string };

  beforeAll(async () => {
    f = await domainFixture();
    item = await f.createItem('Travel policy');
    openChange = await propose(
      f.db,
      f.agent,
      {
        kind: 'change',
        itemId: item.itemId,
        baseVersionId: item.versionId,
        reason: 'newer rates',
        changes: { content: 'Pending text' },
      },
      { idempotencyKey: randomUUID(), channel: 'mcp' },
    );
    const rejected = await propose(
      f.db,
      f.contributor,
      {
        kind: 'change',
        itemId: item.itemId,
        baseVersionId: item.versionId,
        reason: 'wrong',
        changes: { title: 'Bad' },
      },
      { idempotencyKey: randomUUID(), channel: 'web' },
    );
    await decide(f.db, f.owner, {
      proposalId: rejected.proposalId,
      outcome: 'reject',
      comment: 'Not right',
      ifMatch: etagOf(rejected),
    });
    pendingCreate = await propose(
      f.db,
      f.contributor,
      f.createInput({ title: 'Pending travel item' }),
      {
        idempotencyKey: randomUUID(),
        channel: 'web',
      },
    );
  });
  afterAll(() => f?.close());

  it('BR4.1: shows the approved version, history, closed proposals and open proposals apart', async () => {
    const view = await readItem(f.db, f.contributor, item.itemId);
    expect(view.item.version).toMatchObject({ title: 'Travel policy', versionNumber: 1 });
    expect(view.history).toEqual([
      expect.objectContaining({
        versionNumber: 1,
        selfApproved: true,
        reason: 'We keep answering this question',
      }),
    ]);
    expect(view.openProposals).toEqual([
      expect.objectContaining({
        proposalId: openChange.proposalId,
        status: 'open',
        origin: 'ai-agent',
      }),
    ]);
    expect(view.closedProposals).toEqual([
      expect.objectContaining({
        status: 'rejected',
        reason: 'wrong',
        decision: expect.objectContaining({ comment: 'Not right' }),
      }),
    ]);
    expect(view.names[f.s.acme.groupId]).toBe('Owners');
    expect(view.etag).toBe(`"${item.versionId}"`);
    expect(await itemVersions(f.db, f.contributor, item.itemId)).toHaveLength(1);
  });

  it('BR4.2: search finds approved items only', async () => {
    const results = await searchKnowledge(f.db, f.agent, 'travel', {});
    expect(results.map((r) => r.itemId)).toEqual([item.itemId]);
  });

  it('lists approved items with a cursor', async () => {
    await f.createItem('Second');
    const first = await listItemsPage(f.db, f.contributor, { limit: 1 });
    expect(first.items).toHaveLength(1);
    expect(first.nextCursor).toBeTruthy();
    const rest = await listItemsPage(f.db, f.contributor, { limit: 10, cursor: first.nextCursor! });
    expect(rest.items.map((i) => i.itemId)).not.toContain(first.items[0]!.itemId);
    expect(rest.nextCursor).toBeNull();
  });

  it('W5 step 5: an open create proposal is visible only to its proposer and its named human owners', async () => {
    const ids = async (who: typeof f.owner) =>
      (await listVisibleProposals(f.db, who, {})).map((p) => p.proposalId);
    expect(await ids(f.contributor)).toContain(pendingCreate.proposalId);
    expect(await ids(f.owner)).toContain(pendingCreate.proposalId);
    expect(await ids(f.agent)).not.toContain(pendingCreate.proposalId);
    expect(await ids(f.agent)).toContain(openChange.proposalId);
    await expect(
      getVisibleProposal(f.db, f.owner, pendingCreate.proposalId),
    ).resolves.toMatchObject({
      proposal: { status: 'open' },
      etag: expect.stringContaining(pendingCreate.proposalId),
    });
    await expect(getVisibleProposal(f.db, f.agent, pendingCreate.proposalId)).rejects.toMatchObject(
      { code: 'not-found' },
    );
    await expect(readItem(f.db, f.owner, pendingCreate.itemId)).rejects.toMatchObject({
      code: 'not-found',
    });
  });

  it('a change proposal shows the current version beside it', async () => {
    const view = await getVisibleProposal(f.db, f.owner, openChange.proposalId);
    expect(view.currentVersion).toMatchObject({
      title: 'Travel policy',
      versionId: item.versionId,
    });
  });

  it('BR6.2: another organisation, an unknown id or a malformed id is not found', async () => {
    for (const id of [item.itemId, randomUUID(), 'x']) {
      await expect(readItem(f.db, f.globexOwner, id)).rejects.toBeInstanceOf(ProblemError);
    }
    expect(await searchKnowledge(f.db, f.globexOwner, 'travel', {})).toEqual([]);
    expect(
      (await listVisibleProposals(f.db, f.globexOwner, {})).map((p) => p.proposalId),
    ).not.toContain(openChange.proposalId);
    await expect(
      getVisibleProposal(f.db, f.globexOwner, openChange.proposalId),
    ).rejects.toMatchObject({ code: 'not-found' });
  });
});
