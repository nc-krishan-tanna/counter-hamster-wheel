import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiFixture, type ApiFixture } from '../http/harness.ts';

/** C2: three tools over Streamable HTTP at /mcp, bearer tokens only (W3, W6). */
describe('MCP server', () => {
  let f: ApiFixture;
  let itemId: string;

  beforeAll(async () => {
    f = await apiFixture();
    const owner = await f.signIn('acme', 'owner');
    const created = await f.call({
      method: 'POST',
      url: '/v1/proposals',
      cookie: owner,
      headers: { 'idempotency-key': randomUUID() },
      body: {
        kind: 'create',
        reason: 'r',
        changes: {
          title: 'Holiday rules',
          type: 'business-rule-or-policy',
          content: 'Book leave two weeks ahead',
          owners: [{ kind: 'group', ref_id: f.s.acme.groupId }],
          sources: [{ title: 'HR wiki', url: 'https://hr.example/leave' }],
        },
      },
    });
    itemId = created.json().itemId;
    const id = created.json().proposalId;
    await f.call({
      method: 'POST',
      url: `/v1/proposals/${id}/decisions`,
      cookie: owner,
      headers: { 'if-match': `"${id}:open"` },
      body: { outcome: 'approve' },
    });
  });
  afterAll(() => f?.close());

  const token = () => f.s.acme.agent.token;

  it('lists exactly the three U1 tools', async () => {
    const res = await f.call({
      method: 'POST',
      url: '/mcp',
      token: token(),
      headers: {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
      },
      body: { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} },
    });
    expect(res.statusCode).toBe(200);
    expect(
      res
        .json()
        .result.tools.map((t: { name: string }) => t.name)
        .sort(),
    ).toEqual(['get_item', 'propose_change', 'search_knowledge']);
  });

  it('search_knowledge returns approved items with type, owners, sources and last reviewed date', async () => {
    const { isError, result } = await f.tool('acme', token(), 'search_knowledge', {
      query: 'holiday',
    });
    expect(isError).toBeFalsy();
    expect(result).toEqual({
      results: [
        expect.objectContaining({
          itemId,
          title: 'Holiday rules',
          type: 'business-rule-or-policy',
          status: 'approved',
          lastReviewedAt: expect.any(String),
          owners: [expect.objectContaining({ kind: 'group', name: 'Owners' })],
          sources: expect.arrayContaining([expect.objectContaining({ title: 'HR wiki' })]),
        }),
      ],
    });
  });

  it('propose_change records an ai-agent proposal; get_item lists it apart as not yet approved', async () => {
    const args = {
      kind: 'change',
      itemId,
      baseVersionId: '',
      reason: 'New rule',
      changes: { content: 'Book leave three weeks ahead' },
      idempotencyKey: randomUUID(),
    };
    const item = await f.tool('acme', token(), 'get_item', { itemId });
    args.baseVersionId = (item.result as { version: { versionId: string } }).version.versionId;
    const proposed = await f.tool('acme', token(), 'propose_change', args);
    expect(proposed.isError).toBeFalsy();
    expect(proposed.result).toMatchObject({ status: 'open', origin: 'ai-agent' });
    const again = await f.tool('acme', token(), 'propose_change', args);
    expect((again.result as { proposalId: string }).proposalId).toBe(
      (proposed.result as { proposalId: string }).proposalId,
    );

    const read = await f.tool('acme', token(), 'get_item', { itemId });
    expect(read.result).toMatchObject({
      content: 'Book leave two weeks ahead',
      pendingProposals: [
        expect.objectContaining({ status: 'not yet approved', origin: 'ai-agent' }),
      ],
    });
  });

  it('returns tool errors as isError with the C1 code', async () => {
    const missing = await f.tool('acme', token(), 'get_item', { itemId: randomUUID() });
    expect(missing.isError).toBe(true);
    expect(missing.result).toMatchObject({ code: 'not-found' });
    const invalid = await f.tool('acme', token(), 'propose_change', {
      kind: 'create',
      reason: '',
      changes: {},
      idempotencyKey: randomUUID(),
    });
    expect(invalid.isError).toBe(true);
    expect(invalid.result).toMatchObject({ code: 'validation-failed' });
  });

  it('refuses an unknown token and a deactivated agent', async () => {
    await expect(
      f.tool('acme', 'ce_unknown', 'search_knowledge', { query: 'x' }),
    ).rejects.toMatchObject({ statusCode: 401 });
    await f.t
      .pool('superuser')
      .query(`UPDATE service_accounts SET status = 'deactivated' WHERE service_account_id = $1`, [
        f.s.globex.agent.serviceAccountId,
      ]);
    await expect(
      f.tool('globex', f.s.globex.agent.token, 'search_knowledge', { query: 'x' }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});
