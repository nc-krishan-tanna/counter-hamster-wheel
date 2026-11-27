import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { apiFixture, snapshotOf, type ApiFixture } from '../http/harness.ts';

/**
 * NFR14.3: every route and MCP tool acts as organisation B (Globex) on organisation A's (Acme)
 * seeded item, proposal and link, and gets nothing back and changes nothing.
 * Test names follow `isolation: <METHOD> <path>` / `isolation: tool <name>` (CI isolation check).
 */
describe('organisations kept apart', () => {
  let f: ApiFixture;
  let globexOwner: string;
  let acmeItem: { itemId: string; versionId: string };
  let acmeProposalId: string;
  let before: unknown;

  beforeAll(async () => {
    f = await apiFixture();
    const acmeOwner = await f.signIn('acme', 'owner');
    globexOwner = await f.signIn('globex', 'owner');
    const make = async (title: string) => {
      const created = await f.call({
        method: 'POST',
        url: '/v1/proposals',
        cookie: acmeOwner,
        headers: { 'idempotency-key': randomUUID() },
        body: {
          kind: 'create',
          reason: 'r',
          changes: {
            title,
            type: 'system',
            content: 'Acme secret content',
            owners: [{ kind: 'group', ref_id: f.s.acme.groupId }],
          },
        },
      });
      const id = created.json().proposalId;
      const decided = await f.call({
        method: 'POST',
        url: `/v1/proposals/${id}/decisions`,
        cookie: acmeOwner,
        headers: { 'if-match': `"${id}:open"` },
        body: { outcome: 'approve' },
      });
      return {
        itemId: created.json().itemId as string,
        versionId: decided.json().versionId as string,
      };
    };
    acmeItem = await make('Acme ledger');
    const other = await make('Acme warehouse');
    const link = await f.call({
      method: 'POST',
      url: '/v1/proposals',
      cookie: acmeOwner,
      headers: { 'idempotency-key': randomUUID() },
      body: {
        kind: 'add-link',
        itemId: acmeItem.itemId,
        baseVersionId: acmeItem.versionId,
        reason: 'r',
        changes: { addLinks: [{ toItemId: other.itemId, linkType: 'depends-on' }] },
      },
    });
    acmeProposalId = link.json().proposalId;
  });
  beforeEach(async () => {
    before = await snapshotOf(f.t, f.s.acme.organisationId);
  });
  afterAll(() => f?.close());

  const unchanged = async () =>
    expect(await snapshotOf(f.t, f.s.acme.organisationId)).toEqual(before);
  const asGlobex = (url: string, extra: object = {}) =>
    f.call({ url, org: 'globex', cookie: globexOwner, ...extra });

  it('isolation: GET /v1/items', async () => {
    const res = await asGlobex('/v1/items');
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toEqual([]);
  });

  it('isolation: GET /v1/items/{itemId}', async () => {
    expect((await asGlobex(`/v1/items/${acmeItem.itemId}`)).statusCode).toBe(404);
  });

  it('isolation: GET /v1/items/{itemId}/versions', async () => {
    expect((await asGlobex(`/v1/items/${acmeItem.itemId}/versions`)).statusCode).toBe(404);
  });

  it('isolation: POST /v1/proposals', async () => {
    const change = await asGlobex('/v1/proposals', {
      method: 'POST',
      headers: { 'idempotency-key': randomUUID() },
      body: {
        kind: 'change',
        itemId: acmeItem.itemId,
        baseVersionId: acmeItem.versionId,
        reason: 'r',
        changes: { content: 'x' },
      },
    });
    expect(change.statusCode).toBe(404);
    const linkToAcme = await asGlobex('/v1/proposals', {
      method: 'POST',
      headers: { 'idempotency-key': randomUUID() },
      body: {
        kind: 'create',
        reason: 'r',
        changes: {
          title: 't',
          type: 'system',
          content: 'c',
          owners: [{ kind: 'user', ref_id: f.s.acme.ownerId }],
          addLinks: [{ toItemId: acmeItem.itemId, linkType: 'relates-to' }],
        },
      },
    });
    expect(linkToAcme.statusCode).toBe(422);
    expect(linkToAcme.json().errors.map((e: { field: string }) => e.field)).toEqual([
      'owners[0]',
      'addLinks[0].toItemId',
    ]);
    await unchanged();
  });

  it('isolation: GET /v1/proposals', async () => {
    const res = await asGlobex('/v1/proposals');
    expect(res.json().proposals).toEqual([]);
  });

  it('isolation: GET /v1/proposals/{proposalId}', async () => {
    expect((await asGlobex(`/v1/proposals/${acmeProposalId}`)).statusCode).toBe(404);
  });

  it('isolation: POST /v1/proposals/{proposalId}/decisions', async () => {
    const res = await asGlobex(`/v1/proposals/${acmeProposalId}/decisions`, {
      method: 'POST',
      headers: { 'if-match': `"${acmeProposalId}:open"` },
      body: { outcome: 'approve' },
    });
    expect(res.statusCode).toBe(404);
    await unchanged();
  });

  it('isolation: GET /v1/query/search', async () => {
    const res = await asGlobex('/v1/query/search?q=acme');
    expect(res.json().results).toEqual([]);
  });

  it('isolation: tool search_knowledge', async () => {
    const { result } = await f.tool('globex', f.s.globex.agent.token, 'search_knowledge', {
      query: 'Acme',
    });
    expect(result).toEqual({ results: [] });
  });

  it('isolation: tool get_item', async () => {
    const { isError, result } = await f.tool('globex', f.s.globex.agent.token, 'get_item', {
      itemId: acmeItem.itemId,
    });
    expect(isError).toBe(true);
    expect(result).toMatchObject({ code: 'not-found' });
  });

  it('isolation: tool propose_change', async () => {
    const { isError, result } = await f.tool('globex', f.s.globex.agent.token, 'propose_change', {
      kind: 'change',
      itemId: acmeItem.itemId,
      baseVersionId: acmeItem.versionId,
      reason: 'r',
      changes: { content: 'x' },
      idempotencyKey: randomUUID(),
    });
    expect(isError).toBe(true);
    expect(result).toMatchObject({ code: 'not-found' });
    await unchanged();
  });

  it("organisation A's agent token at B's address is not found, and touches nothing", async () => {
    const res = await f.call({ url: '/v1/items', org: 'globex', token: f.s.acme.agent.token });
    expect(res.statusCode).toBe(404);
    await expect(
      f.tool('globex', f.s.acme.agent.token, 'search_knowledge', { query: 'Acme' }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await unchanged();
  });
});
