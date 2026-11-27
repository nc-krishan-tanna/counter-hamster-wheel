import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { decide } from '../../src/domain/decide.ts';
import { etagOf } from '../../src/domain/etag.ts';
import { ProblemError } from '../../src/domain/errors.ts';
import { propose, type ProposalInput } from '../../src/domain/propose.ts';
import type { Principal } from '../../src/access/principal.ts';
import { domainFixture, type DomainFixture } from './setup.ts';

describe('decide (W4)', () => {
  let f: DomainFixture;

  beforeAll(async () => {
    f = await domainFixture();
  });
  afterAll(() => f?.close());

  const submit = (who: Principal, input: ProposalInput) =>
    propose(f.db, who, input, {
      idempotencyKey: randomUUID(),
      channel: who.kind === 'user' ? 'web' : 'mcp',
    });

  const change = (
    item: { itemId: string; versionId: string },
    changes: ProposalInput['changes'],
  ): ProposalInput => ({
    kind: 'change',
    itemId: item.itemId,
    baseVersionId: item.versionId,
    reason: 'keep it current',
    changes,
  });

  const problemOf = async (promise: Promise<unknown>) => {
    try {
      await promise;
    } catch (error) {
      expect(error).toBeInstanceOf(ProblemError);
      return error as ProblemError;
    }
    throw new Error('expected the decision to be refused');
  };

  const statusOf = async (proposalId: string) =>
    (
      await f.t
        .pool('superuser')
        .query('SELECT status FROM proposals WHERE proposal_id = $1', [proposalId])
    ).rows[0].status;

  it('BR2.2: an agent can never decide', async () => {
    const p = await submit(f.contributor, f.createInput());
    const problem = await problemOf(
      decide(f.db, f.agent, { proposalId: p.proposalId, outcome: 'approve', ifMatch: etagOf(p) }),
    );
    expect(problem).toMatchObject({ code: 'not-an-approver', status: 403 });
    expect(await statusOf(p.proposalId)).toBe('open');
  });

  it('BR2.1: a person who is not a human owner is refused; a member of an owning group may decide', async () => {
    const p = await submit(f.contributor, f.createInput());
    const refused = await problemOf(
      decide(f.db, f.contributor, {
        proposalId: p.proposalId,
        outcome: 'approve',
        ifMatch: etagOf(p),
      }),
    );
    expect(refused).toMatchObject({ code: 'not-an-approver', status: 403 });
    const result = await decide(f.db, f.owner, {
      proposalId: p.proposalId,
      outcome: 'approve',
      ifMatch: etagOf(p),
    });
    expect(result.proposal.status).toBe('approved');
    expect(result.decision.isSelfApproval).toBe(false);
  });

  it('BR2.6 and If-Match: a proposal is decided once; a stale ETag is refused', async () => {
    const p = await submit(f.contributor, f.createInput());
    const stale = await problemOf(
      decide(f.db, f.owner, { proposalId: p.proposalId, outcome: 'approve', ifMatch: '"other"' }),
    );
    expect(stale).toMatchObject({ code: 'precondition-failed', status: 412 });
    await decide(f.db, f.owner, {
      proposalId: p.proposalId,
      outcome: 'approve',
      ifMatch: etagOf(p),
    });
    const again = await problemOf(
      decide(f.db, f.owner, {
        proposalId: p.proposalId,
        outcome: 'reject',
        comment: 'no',
        ifMatch: etagOf(p),
      }),
    );
    expect(again).toMatchObject({ code: 'already-decided', status: 409 });
  });

  it('an unknown proposal, or another organisation’s, is not found', async () => {
    const theirs = await submit(f.globexOwner, {
      ...f.createInput(),
      changes: {
        ...f.createInput().changes,
        owners: [{ kind: 'group', ref_id: f.s.globex.groupId }],
      },
    });
    for (const id of [randomUUID(), theirs.proposalId, 'nope']) {
      const problem = await problemOf(
        decide(f.db, f.owner, { proposalId: id, outcome: 'approve', ifMatch: etagOf(theirs) }),
      );
      expect(problem).toMatchObject({ code: 'not-found', status: 404 });
    }
  });

  it('BR2.7: approving one proposal makes its siblings out of date, and they cannot be approved', async () => {
    const item = await f.createItem('Siblings');
    const p1 = await submit(f.contributor, change(item, { content: 'one' }));
    const p2 = await submit(f.contributor, change(item, { content: 'two' }));
    await decide(f.db, f.owner, {
      proposalId: p1.proposalId,
      outcome: 'approve',
      ifMatch: etagOf(p1),
    });
    expect(await statusOf(p2.proposalId)).toBe('out-of-date');
    const problem = await problemOf(
      decide(f.db, f.owner, { proposalId: p2.proposalId, outcome: 'approve', ifMatch: etagOf(p2) }),
    );
    expect(problem).toMatchObject({ code: 'proposal-out-of-date', status: 409 });

    // A proposal raised against the old version later is set out of date when approval is tried.
    const p3 = await submit(f.contributor, change(item, { content: 'three' }));
    const late = await problemOf(
      decide(f.db, f.owner, { proposalId: p3.proposalId, outcome: 'approve', ifMatch: etagOf(p3) }),
    );
    expect(late.code).toBe('proposal-out-of-date');
    expect(await statusOf(p3.proposalId)).toBe('out-of-date');
  });

  it('BR2.5: rejecting needs a reason; a rejection leaves the item unchanged', async () => {
    const item = await f.createItem('Reject me');
    const p = await submit(f.contributor, change(item, { content: 'bad idea' }));
    const missing = await problemOf(
      decide(f.db, f.owner, {
        proposalId: p.proposalId,
        outcome: 'reject',
        comment: ' ',
        ifMatch: etagOf(p),
      }),
    );
    expect(missing).toMatchObject({ code: 'reason-required', status: 422 });
    const result = await decide(f.db, f.owner, {
      proposalId: p.proposalId,
      outcome: 'reject',
      comment: 'Not accurate',
      ifMatch: etagOf(p),
    });
    expect(result.proposal.status).toBe('rejected');
    expect(result.decision).toMatchObject({ outcome: 'rejected', comment: 'Not accurate' });
    const { rows } = await f.t
      .pool('superuser')
      .query('SELECT current_version_id FROM items WHERE item_id = $1', [item.itemId]);
    expect(rows[0].current_version_id).toBe(item.versionId);
  });

  it('BR1.8: a rejected create proposal leaves no item', async () => {
    const p = await submit(f.contributor, f.createInput());
    await decide(f.db, f.owner, {
      proposalId: p.proposalId,
      outcome: 'reject',
      comment: 'duplicate',
      ifMatch: etagOf(p),
    });
    const { rowCount } = await f.t
      .pool('superuser')
      .query('SELECT 1 FROM items WHERE item_id = $1', [p.itemId]);
    expect(rowCount).toBe(0);
  });

  it('BR2.4: an owner approving their own proposal is flagged on the decision and the version', async () => {
    const p = await submit(f.owner, f.createInput());
    const result = await decide(f.db, f.owner, {
      proposalId: p.proposalId,
      outcome: 'approve',
      ifMatch: etagOf(p),
    });
    expect(result.decision.isSelfApproval).toBe(true);
    const { rows } = await f.t
      .pool('superuser')
      .query('SELECT flags FROM item_versions WHERE version_id = $1', [result.versionId]);
    expect(rows[0].flags).toEqual(['self-approved']);
  });

  it('BR3.1, BR3.3: version n+1 copies unchanged fields, adds its own system source and moves the item', async () => {
    const item = await f.createItem('Copy me');
    const before = (
      await f.t
        .pool('superuser')
        .query('SELECT last_reviewed_at FROM items WHERE item_id = $1', [item.itemId])
    ).rows[0];
    const p = await submit(f.agent, change(item, { content: 'Updated by an agent' }));
    const result = await decide(f.db, f.owner, {
      proposalId: p.proposalId,
      outcome: 'approve',
      comment: 'thanks',
      ifMatch: etagOf(p),
    });
    const { rows } = await f.t
      .pool('superuser')
      .query(
        `SELECT v.*, i.current_version_id, i.last_reviewed_at FROM item_versions v JOIN items i USING (item_id) WHERE v.version_id = $1`,
        [result.versionId],
      );
    const v = rows[0];
    expect(v).toMatchObject({
      version_number: 2,
      title: 'Copy me',
      content: 'Updated by an agent',
      why: 'Fraud control',
      owners: [{ kind: 'group', ref_id: f.s.acme.groupId }],
      approved_by: f.s.acme.ownerId,
      current_version_id: result.versionId,
      flags: [],
    });
    expect(v.last_reviewed_at.getTime()).toBeGreaterThan(before.last_reviewed_at.getTime());
    expect(v.sources).toEqual([
      { kind: 'manual', title: 'Finance handbook', url: 'https://handbook.example/finance' },
      expect.objectContaining({
        kind: 'system',
        author: f.s.acme.agent.serviceAccountId,
        channel: 'mcp',
      }),
    ]);
  });

  it('applies link changes, recording the version that added or removed them', async () => {
    const a = await f.createItem('Link from');
    const b = await f.createItem('Link to');
    const add = await submit(f.contributor, {
      kind: 'add-link',
      itemId: a.itemId,
      baseVersionId: a.versionId,
      reason: 'r',
      changes: { addLinks: [{ toItemId: b.itemId, linkType: 'depends-on' }] },
    });
    const added = await decide(f.db, f.owner, {
      proposalId: add.proposalId,
      outcome: 'approve',
      ifMatch: etagOf(add),
    });
    const remove = await submit(f.contributor, {
      kind: 'remove-link',
      itemId: a.itemId,
      baseVersionId: added.versionId!,
      reason: 'r',
      changes: { removeLinks: [{ toItemId: b.itemId, linkType: 'depends-on' }] },
    });
    const removed = await decide(f.db, f.owner, {
      proposalId: remove.proposalId,
      outcome: 'approve',
      ifMatch: etagOf(remove),
    });
    const { rows } = await f.t
      .pool('superuser')
      .query(
        'SELECT added_in_version_id, removed_in_version_id FROM links WHERE from_item_id = $1',
        [a.itemId],
      );
    expect(rows).toEqual([
      { added_in_version_id: added.versionId, removed_in_version_id: removed.versionId },
    ]);
  });

  it('NFR10.1: a fault after the version insert leaves no version and the proposal open', async () => {
    const item = await f.createItem('Fault');
    const p = await submit(f.contributor, change(item, { content: 'never applied' }));
    const su = f.t.pool('superuser');
    await su.query(
      `CREATE FUNCTION fail_item_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected fault'; END $$`,
    );
    await su.query(
      `CREATE TRIGGER fail_item_update BEFORE UPDATE ON items FOR EACH ROW WHEN (OLD.item_id = '${item.itemId}') EXECUTE FUNCTION fail_item_update()`,
    );
    try {
      await expect(
        decide(f.db, f.owner, { proposalId: p.proposalId, outcome: 'approve', ifMatch: etagOf(p) }),
      ).rejects.toThrow(/injected fault/);
    } finally {
      await su.query('DROP TRIGGER fail_item_update ON items');
      await su.query('DROP FUNCTION fail_item_update()');
    }
    const versions = await su.query(
      'SELECT count(*)::int AS n FROM item_versions WHERE item_id = $1',
      [item.itemId],
    );
    expect(versions.rows[0].n).toBe(1);
    expect(await statusOf(p.proposalId)).toBe('open');
    const decisions = await su.query('SELECT 1 FROM decisions WHERE proposal_id = $1', [
      p.proposalId,
    ]);
    expect(decisions.rowCount).toBe(0);
  });
});
