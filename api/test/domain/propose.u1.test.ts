import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { propose, type ProposalInput } from '../../src/domain/propose.ts';
import { ProblemError } from '../../src/domain/errors.ts';
import type { Principal } from '../../src/access/principal.ts';
import { agentPrincipal, domainFixture, type DomainFixture } from './setup.ts';

describe('propose (W1, W2, W3)', () => {
  let f: DomainFixture;
  let existing: { itemId: string; versionId: string };
  let other: { itemId: string; versionId: string };

  beforeAll(async () => {
    f = await domainFixture();
    existing = await f.createItem('Existing');
    other = await f.createItem('Other');
  });
  afterAll(() => f?.close());

  const submit = (
    who: Principal,
    input: ProposalInput,
    key = randomUUID(),
    channel: 'web' | 'mcp' = 'web',
  ) => propose(f.db, who, input, { idempotencyKey: key, channel });

  /** Resolves to the problem a refused proposal raised. */
  const refusal = async (promise: Promise<unknown>) => {
    try {
      await promise;
    } catch (error) {
      expect(error).toBeInstanceOf(ProblemError);
      return error as ProblemError;
    }
    throw new Error('expected the proposal to be refused');
  };

  const count = async (table: 'proposals' | 'items') =>
    Number((await f.t.pool('superuser').query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n);

  it('BR1.1: records an open create proposal with a reserved id, and nothing goes live', async () => {
    const items = await count('items');
    const p = await submit(f.contributor, f.createInput());
    expect(p).toMatchObject({
      kind: 'create',
      status: 'open',
      origin: 'person',
      proposerId: f.s.acme.contributorId,
    });
    expect(p.itemId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await count('items')).toBe(items);
  });

  it('BR1.2: names each missing field and saves nothing', async () => {
    const before = await count('proposals');
    const problem = await refusal(
      submit(f.contributor, {
        kind: 'create',
        reason: '  ',
        changes: { title: '', content: 'kept text', owners: [] },
      }),
    );
    expect(problem.code).toBe('validation-failed');
    expect(problem.status).toBe(422);
    expect(problem.errors.map((e) => e.field).sort()).toEqual([
      'owners',
      'reason',
      'title',
      'type',
    ]);
    expect(await count('proposals')).toBe(before);
  });

  it('BR1.3: refuses a type outside the starting list, naming the allowed types', async () => {
    const problem = await refusal(submit(f.contributor, f.createInput({ type: 'memo' })));
    expect(problem.errors).toEqual([
      { field: 'type', message: expect.stringContaining('glossary-term') },
    ]);
  });

  it.each([
    ['no owners', [], 'owners'],
    ['agents only', 'agent-only', 'owners'],
    ['an unknown person', [{ kind: 'user', ref_id: 'nobody' }], 'owners[0]'],
    ['an unknown group', [{ kind: 'group', ref_id: randomUUID() }], 'owners[0]'],
    ['a person of another organisation', 'globex-owner', 'owners[0]'],
  ])('BR1.4 / BR6.3: refuses owners with %s', async (_name, owners, field) => {
    const list =
      owners === 'agent-only'
        ? [{ kind: 'agent', ref_id: f.s.acme.agent.serviceAccountId }]
        : owners === 'globex-owner'
          ? [{ kind: 'user', ref_id: f.s.globex.ownerId }]
          : owners;
    const problem = await refusal(submit(f.contributor, f.createInput({ owners: list as never })));
    expect(problem.errors.map((e) => e.field)).toContain(field);
  });

  it('BR1.4: refuses a deactivated person as owner', async () => {
    await f.t
      .pool('superuser')
      .query(`UPDATE "user" SET status = 'deactivated' WHERE id = $1`, [f.s.acme.contributorId]);
    try {
      const problem = await refusal(
        submit(
          f.owner,
          f.createInput({ owners: [{ kind: 'user', ref_id: f.s.acme.contributorId }] }),
        ),
      );
      expect(problem.errors.map((e) => e.field)).toEqual(['owners[0]']);
    } finally {
      await f.t
        .pool('superuser')
        .query(`UPDATE "user" SET status = 'active' WHERE id = $1`, [f.s.acme.contributorId]);
    }
  });

  it('BR1.5: link ends must be different approved items; no duplicate live link; only live links removed', async () => {
    const unknown = await refusal(
      submit(
        f.contributor,
        f.createInput({ addLinks: [{ toItemId: randomUUID(), linkType: 'relates-to' }] }),
      ),
    );
    expect(unknown.errors.map((e) => e.field)).toEqual(['addLinks[0].toItemId']);

    const link = (
      kind: 'add-link' | 'remove-link',
      toItemId: string,
      linkType = 'depends-on',
    ): ProposalInput => ({
      kind,
      itemId: existing.itemId,
      baseVersionId: existing.versionId,
      reason: 'link',
      changes:
        kind === 'add-link'
          ? { addLinks: [{ toItemId, linkType }] }
          : { removeLinks: [{ toItemId, linkType }] },
    });
    expect(
      (await refusal(submit(f.contributor, link('add-link', existing.itemId)))).errors[0]!.field,
    ).toBe('addLinks[0].toItemId');
    expect(
      (await refusal(submit(f.contributor, link('add-link', other.itemId, 'is-near')))).errors[0]!
        .field,
    ).toBe('addLinks[0].linkType');
    expect(
      (await refusal(submit(f.contributor, link('remove-link', other.itemId)))).errors[0]!.field,
    ).toBe('removeLinks[0]');
    await expect(submit(f.contributor, link('add-link', other.itemId))).resolves.toMatchObject({
      status: 'open',
    });

    // Once the link is live, adding it again is refused.
    await f.t
      .pool('superuser')
      .query(
        `INSERT INTO links (organisation_id, from_item_id, to_item_id, link_type, added_in_version_id) VALUES ($1, $2, $3, 'part-of', $4)`,
        [f.s.acme.organisationId, existing.itemId, other.itemId, existing.versionId],
      );
    expect(
      (await refusal(submit(f.contributor, link('add-link', other.itemId, 'part-of')))).errors[0]!
        .field,
    ).toBe('addLinks[0]');
  });

  it('BR1.6: refuses a manual source without a title or with a non-http(s) address', async () => {
    const problem = await refusal(
      submit(
        f.contributor,
        f.createInput({
          sources: [
            { title: '' },
            { title: 'x', url: 'javascript:alert(1)' },
            { title: 'y', url: 'ftp://h/x' },
          ],
        }),
      ),
    );
    expect(problem.errors.map((e) => e.field)).toEqual([
      'sources[0].title',
      'sources[1].url',
      'sources[2].url',
    ]);
  });

  it('BR1.7: the same key and request return the first proposal; a different request is a key conflict', async () => {
    const key = randomUUID();
    const first = await submit(f.contributor, f.createInput(), key);
    const again = await submit(f.contributor, f.createInput(), key);
    expect(again.proposalId).toBe(first.proposalId);
    expect(again.itemId).toBe(first.itemId);
    const problem = await refusal(
      submit(f.contributor, f.createInput({ title: 'Different' }), key),
    );
    expect(problem).toMatchObject({ code: 'conflict', status: 409 });
  });

  it('BR5.1: a Reader agent is refused; a Contributor agent proposes with origin ai-agent', async () => {
    const reader = await refusal(
      submit(agentPrincipal(f.s.acme, 'Reader'), f.createInput(), randomUUID(), 'mcp'),
    );
    expect(reader).toMatchObject({ code: 'forbidden', status: 403 });
    const p = await submit(f.agent, f.createInput(), randomUUID(), 'mcp');
    expect(p).toMatchObject({
      origin: 'ai-agent',
      proposerKind: 'service-account',
      proposerId: f.s.acme.agent.serviceAccountId,
    });
  });

  it('BR6.1: a change to an unknown item, or to another organisation’s item, is not found', async () => {
    const theirs = await f.createItem('Globex item', 'globex');
    for (const target of [randomUUID(), theirs.itemId, 'not-a-uuid']) {
      const problem = await refusal(
        submit(f.contributor, {
          kind: 'change',
          itemId: target,
          baseVersionId: theirs.versionId,
          reason: 'r',
          changes: { content: 'x' },
        }),
      );
      expect(problem).toMatchObject({ code: 'not-found', status: 404 });
    }
  });

  it('a change needs a base version of that item and at least one changed field', async () => {
    const wrongBase = await refusal(
      submit(f.contributor, {
        kind: 'change',
        itemId: existing.itemId,
        baseVersionId: other.versionId,
        reason: 'r',
        changes: { content: 'x' },
      }),
    );
    expect(wrongBase.errors.map((e) => e.field)).toEqual(['baseVersionId']);
    const empty = await refusal(
      submit(f.contributor, {
        kind: 'change',
        itemId: existing.itemId,
        baseVersionId: existing.versionId,
        reason: 'r',
        changes: {},
      }),
    );
    expect(empty.errors.map((e) => e.field)).toEqual(['changes']);
  });
});
