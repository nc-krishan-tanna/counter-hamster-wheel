import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiFixture, type ApiFixture } from './harness.ts';

/** NFR13.1 to NFR13.4, NFR2.1, NFR6.1. */
describe('logs and metrics', () => {
  let f: ApiFixture;
  let owner: string;
  const marker = `MARKER-${randomUUID()}`;

  beforeAll(async () => {
    f = await apiFixture();
    owner = await f.signIn('acme', 'owner');
  });
  afterAll(() => f?.close());

  const lines = () =>
    f.logs
      .flatMap((l) => l.split('\n'))
      .filter(Boolean)
      .map((l) => JSON.parse(l));

  it('writes one JSON line per request with reqId, org, route, status and duration, and never the content', async () => {
    const created = await f.call({
      method: 'POST',
      url: '/v1/proposals',
      cookie: owner,
      headers: { 'idempotency-key': randomUUID(), 'x-request-id': 'req-abc-123' },
      body: {
        kind: 'create',
        reason: marker,
        changes: {
          title: marker,
          type: 'process',
          content: marker,
          owners: [{ kind: 'group', ref_id: f.s.acme.groupId }],
        },
      },
    });
    expect(created.statusCode).toBe(201);
    const invalid = await f.call({
      method: 'POST',
      url: '/v1/proposals',
      cookie: owner,
      headers: { 'idempotency-key': randomUUID() },
      body: { kind: 'create', reason: marker, changes: { title: marker } },
    });
    expect(invalid.statusCode).toBe(422);
    expect(invalid.body).not.toContain(marker);

    const line = lines().find((l) => l.reqId === 'req-abc-123' && l.route === '/v1/proposals');
    expect(line).toMatchObject({
      org: f.s.acme.organisationId,
      method: 'POST',
      route: '/v1/proposals',
      status: 201,
      ms: expect.any(Number),
    });
    expect(f.logs.join('\n')).not.toContain(marker);
    expect(f.logs.join('\n')).not.toContain('Acme');
    expect(f.logs.join('\n')).not.toMatch(/session_token|Bearer /);
  });

  it('returns X-Request-Id, keeping a well-formed one and replacing anything else', async () => {
    const kept = await f.call({
      url: '/v1/items',
      cookie: owner,
      headers: { 'x-request-id': 'abc-123' },
    });
    expect(kept.headers['x-request-id']).toBe('abc-123');
    const replaced = await f.call({
      url: '/v1/items',
      cookie: owner,
      headers: { 'x-request-id': 'bad id <script>' },
    });
    expect(replaced.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    const problem = await f.call({ url: '/v1/items', headers: { 'x-request-id': 'p-1' } });
    expect(problem.json().instance).toBe('p-1');
  });

  it('exposes the U1 metrics, labelling unknown URLs as unmatched', async () => {
    await f.call({ url: `/nope/${randomUUID()}`, cookie: owner });
    const id = (
      await f.call({
        method: 'POST',
        url: '/v1/proposals',
        cookie: owner,
        headers: { 'idempotency-key': randomUUID() },
        body: {
          kind: 'create',
          reason: 'r',
          changes: {
            title: 'm',
            type: 'process',
            content: 'c',
            owners: [{ kind: 'group', ref_id: f.s.acme.groupId }],
          },
        },
      })
    ).json().proposalId;
    await f.call({
      method: 'POST',
      url: `/v1/proposals/${id}/decisions`,
      cookie: owner,
      headers: { 'if-match': `"${id}:open"` },
      body: { outcome: 'approve' },
    });
    await f.tool('acme', f.s.acme.agent.token, 'search_knowledge', { query: 'm' });

    const metrics = (await f.call({ url: '/metrics', host: 'api:3000' })).body;
    for (const name of [
      'http_requests_total',
      'http_request_duration_seconds_bucket',
      'mcp_tool_duration_seconds_bucket',
      'proposal_decision_seconds_bucket',
      'process_cpu_seconds_total',
    ]) {
      expect(metrics).toContain(name);
    }
    expect(metrics).toMatch(/http_requests_total\{method="GET",route="unmatched",status="404"\} 1/);
    expect(metrics).toMatch(
      /mcp_tool_duration_seconds_count\{tool="search_knowledge",outcome="ok"\} 1/,
    );
    expect(metrics).toMatch(/proposal_decision_seconds_count\{outcome="approved"\} 1/);
    expect(metrics).not.toContain('/nope');
    expect(metrics).not.toContain(f.s.acme.organisationId);
  });
});
