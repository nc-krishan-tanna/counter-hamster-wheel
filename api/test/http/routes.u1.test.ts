import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiFixture, type ApiFixture } from './harness.ts';

const doc = JSON.parse(readFileSync(new URL('../../openapi/v1.yaml', import.meta.url), 'utf8')) as {
  paths: Record<string, Record<string, unknown>>;
};

describe('/v1 routes', () => {
  let f: ApiFixture;
  let owner: string;
  let contributor: string;

  beforeAll(async () => {
    f = await apiFixture();
    owner = await f.signIn('acme', 'owner');
    contributor = await f.signIn('acme', 'contributor');
  });
  afterAll(() => f?.close());

  const newItem = (title: string) => ({
    kind: 'create',
    reason: 'Asked twice this week',
    changes: {
      title,
      type: 'glossary-term',
      content: 'A definition',
      owners: [{ kind: 'group', ref_id: f.s.acme.groupId }],
    },
  });

  async function createApproved(title: string) {
    const created = await f.call({
      method: 'POST',
      url: '/v1/proposals',
      cookie: owner,
      headers: { 'idempotency-key': randomUUID() },
      body: newItem(title),
    });
    expect(created.statusCode).toBe(201);
    const proposal = created.json();
    const etag = (await f.call({ url: `/v1/proposals/${proposal.proposalId}`, cookie: owner }))
      .headers.etag as string;
    const decided = await f.call({
      method: 'POST',
      url: `/v1/proposals/${proposal.proposalId}/decisions`,
      cookie: owner,
      headers: { 'if-match': etag },
      body: { outcome: 'approve' },
    });
    expect(decided.statusCode).toBe(201);
    return { itemId: proposal.itemId as string, versionId: decided.json().versionId as string };
  }

  it('POST /v1/proposals needs an Idempotency-Key, and the same key returns the same proposal', async () => {
    const missing = await f.call({
      method: 'POST',
      url: '/v1/proposals',
      cookie: contributor,
      body: newItem('No key'),
    });
    expect(missing.statusCode).toBe(422);
    expect(missing.json().errors).toEqual([expect.objectContaining({ field: 'idempotency-key' })]);

    const key = randomUUID();
    const first = await f.call({
      method: 'POST',
      url: '/v1/proposals',
      cookie: contributor,
      headers: { 'idempotency-key': key },
      body: newItem('Keyed'),
    });
    const again = await f.call({
      method: 'POST',
      url: '/v1/proposals',
      cookie: contributor,
      headers: { 'idempotency-key': key },
      body: newItem('Keyed'),
    });
    expect(first.statusCode).toBe(201);
    expect(first.json()).toMatchObject({
      kind: 'create',
      status: 'open',
      origin: 'person',
      proposer: { kind: 'user', id: f.s.acme.contributorId },
    });
    expect(again.statusCode).toBe(201);
    expect(again.json().proposalId).toBe(first.json().proposalId);
    const conflict = await f.call({
      method: 'POST',
      url: '/v1/proposals',
      cookie: contributor,
      headers: { 'idempotency-key': key },
      body: newItem('Other'),
    });
    expect(conflict.statusCode).toBe(409);
  });

  it('GET /v1/proposals lists proposals; GET /v1/proposals/{id} gives an ETag', async () => {
    const list = await f.call({ url: '/v1/proposals?status=open', cookie: contributor });
    expect(list.statusCode).toBe(200);
    expect(list.json().proposals.length).toBeGreaterThan(0);
    const id = list.json().proposals[0].proposalId;
    const one = await f.call({ url: `/v1/proposals/${id}`, cookie: contributor });
    expect(one.statusCode).toBe(200);
    expect(one.headers.etag).toBe(`"${id}:open"`);
    expect(one.json().proposal.proposalId).toBe(id);
  });

  it('POST /v1/proposals/{id}/decisions needs If-Match, refuses a stale one with 412, then decides', async () => {
    const created = await f.call({
      method: 'POST',
      url: '/v1/proposals',
      cookie: contributor,
      headers: { 'idempotency-key': randomUUID() },
      body: newItem('Decide me'),
    });
    const id = created.json().proposalId;
    const url = `/v1/proposals/${id}/decisions`;
    expect(
      (await f.call({ method: 'POST', url, cookie: owner, body: { outcome: 'approve' } }))
        .statusCode,
    ).toBe(422);
    expect(
      (
        await f.call({
          method: 'POST',
          url,
          cookie: owner,
          headers: { 'if-match': '"stale"' },
          body: { outcome: 'approve' },
        })
      ).statusCode,
    ).toBe(412);
    const rejected = await f.call({
      method: 'POST',
      url,
      cookie: owner,
      headers: { 'if-match': `"${id}:open"` },
      body: { outcome: 'reject' },
    });
    expect(rejected.statusCode).toBe(422);
    expect(rejected.json().code).toBe('reason-required');
    const decided = await f.call({
      method: 'POST',
      url,
      cookie: owner,
      headers: { 'if-match': `"${id}:open"` },
      body: { outcome: 'approve', comment: 'Good' },
    });
    expect(decided.statusCode).toBe(201);
    expect(decided.json()).toMatchObject({
      decision: { outcome: 'approved', comment: 'Good' },
      proposal: { status: 'approved' },
    });
    const contributorTries = await f.call({
      method: 'POST',
      url,
      cookie: contributor,
      headers: { 'if-match': `"${id}:approved"` },
      body: { outcome: 'approve' },
    });
    expect(contributorTries.statusCode).toBe(403);
  });

  it('GET /v1/items, /v1/items/{id} (with ETag) and /v1/items/{id}/versions read approved items', async () => {
    const { itemId, versionId } = await createApproved('Readable');
    const list = await f.call({ url: '/v1/items?limit=200', cookie: contributor });
    expect(list.statusCode).toBe(200);
    expect(list.json().items.map((i: { itemId: string }) => i.itemId)).toContain(itemId);
    const item = await f.call({ url: `/v1/items/${itemId}`, cookie: contributor });
    expect(item.statusCode).toBe(200);
    expect(item.headers.etag).toBe(`"${versionId}"`);
    expect(item.json()).toMatchObject({
      itemId,
      title: 'Readable',
      type: 'glossary-term',
      version: { versionId, versionNumber: 1 },
      owners: [{ kind: 'group', refId: f.s.acme.groupId, name: 'Owners' }],
    });
    const versions = await f.call({ url: `/v1/items/${itemId}/versions`, cookie: contributor });
    expect(versions.json().versions).toEqual([
      expect.objectContaining({ versionNumber: 1, selfApproved: true }),
    ]);
    expect(
      (await f.call({ url: `/v1/items/${randomUUID()}`, cookie: contributor })).statusCode,
    ).toBe(404);
    expect((await f.call({ url: '/v1/items?limit=500', cookie: contributor })).statusCode).toBe(
      422,
    );
  });

  it('GET /v1/query/search finds approved items', async () => {
    await createApproved('Searchable thing');
    const res = await f.call({ url: '/v1/query/search?q=searchable', token: f.s.acme.agent.token });
    expect(res.statusCode).toBe(200);
    expect(res.json().results.map((r: { title: string }) => r.title)).toEqual(['Searchable thing']);
  });

  it('serves exactly the routes in api/openapi/v1.yaml, and none edits or deletes history (NFR9.1)', () => {
    const documented = Object.entries(doc.paths)
      .flatMap(([path, ops]) => Object.keys(ops).map((m) => `${m.toUpperCase()} /v1${path}`))
      .sort();
    const served = f.app.registeredRoutes
      .filter((r) => r.startsWith('GET /v1') || r.startsWith('POST /v1'))
      .sort();
    expect(served).toEqual(documented);
    expect(f.app.registeredRoutes.filter((r) => /^(PUT|PATCH|DELETE) \/v1/.test(r))).toEqual([]);
  });
});
