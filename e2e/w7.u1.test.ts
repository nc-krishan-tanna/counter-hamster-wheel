/**
 * W7, the skeleton's proof (functional spec): against a running stack, through Caddy, at two
 * organisations' addresses. Run (unit-test instructions):
 *   docker compose up -d --wait
 *   E2E_BASE_HOSTS=acme.localhost,globex.localhost npx vitest run --coverage.enabled=false e2e/w7.u1.test.ts
 *
 * Environment: E2E_BASE_HOSTS (organisation A's host, organisation B's host); E2E_CONNECT_HOST to
 * connect to another machine than the host name (default 127.0.0.1 for *.localhost); E2E_PORT
 * (default 443); E2E_CA_FILE for Caddy's local CA. Credentials are the seed variables of each
 * organisation (SEED_<ADDRESS>_CONTRIBUTOR_PASSWORD, ..._OWNER_PASSWORD, ..._AGENT_TOKEN).
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { request as httpsRequest } from 'node:https';
import { beforeAll, describe, expect, it } from 'vitest';
import { ownersGroupId, seedEmail } from '../db/src/seed.ts';

const [hostA, hostB] = (process.env.E2E_BASE_HOSTS ?? '').split(',').map((h) => h.trim());
const port = Number(process.env.E2E_PORT || 443);
const ca = process.env.E2E_CA_FILE ? readFileSync(process.env.E2E_CA_FILE) : undefined;
const run = randomUUID().slice(0, 8);

interface Org {
  host: string;
  address: string;
  env: (name: string) => string;
}

function org(host: string | undefined): Org {
  if (!host)
    throw new Error(
      'E2E_BASE_HOSTS must name two hosts, for example acme.localhost,globex.localhost',
    );
  const address = host.split('.')[0]!;
  const key = `SEED_${address.toUpperCase().replace(/-/g, '_')}`;
  return {
    host,
    address,
    env: (name) => {
      const value = process.env[`${key}_${name}`];
      if (!value) throw new Error(`${key}_${name} is not set`);
      return value;
    },
  };
}

interface Reply {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
  json: () => any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/** HTTPS to the organisation's host name, connecting to E2E_CONNECT_HOST when set. */
function call(
  o: Org,
  method: string,
  path: string,
  options: {
    cookie?: string;
    token?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Promise<Reply> {
  const connect =
    process.env.E2E_CONNECT_HOST ?? (o.host.endsWith('.localhost') ? '127.0.0.1' : o.host);
  const origin = `https://${o.host}${port === 443 ? '' : `:${port}`}`;
  const headers: Record<string, string> = {
    host: `${o.host}${port === 443 ? '' : `:${port}`}`,
    accept: 'application/json, text/event-stream',
    ...options.headers,
  };
  if (options.cookie) headers.cookie = options.cookie;
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (method !== 'GET') headers.origin = origin;
  const payload = options.body === undefined ? undefined : JSON.stringify(options.body);
  if (payload) headers['content-type'] = 'application/json';
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      { host: connect, port, servername: o.host, method, path, headers, ca },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body,
            json: () => JSON.parse(body),
          }),
        );
      },
    );
    req.on('error', reject);
    req.setTimeout(10_000, () => req.destroy(new Error(`timeout: ${method} ${path}`)));
    if (payload) req.write(payload);
    req.end();
  });
}

async function signIn(o: Org, who: 'owner' | 'contributor') {
  const res = await call(o, 'POST', '/api/auth/sign-in/email', {
    body: { email: seedEmail(who, o.address), password: o.env(`${who.toUpperCase()}_PASSWORD`) },
  });
  expect(res.status, `sign-in ${who}@${o.address}: ${res.body}`).toBe(200);
  const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  return cookies.map((c) => c.split(';')[0]).join('; ');
}

async function tool(o: Org, token: string, name: string, args: object) {
  const res = await call(o, 'POST', '/mcp', {
    token,
    body: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } },
  });
  return {
    status: res.status,
    ...(res.status === 200
      ? (() => {
          const r = res.json().result;
          return { isError: Boolean(r.isError), result: JSON.parse(r.content[0].text) };
        })()
      : { isError: true, result: null }),
  };
}

async function approve(o: Org, cookie: string, proposalId: string) {
  const etag = (await call(o, 'GET', `/v1/proposals/${proposalId}`, { cookie })).headers
    .etag as string;
  const res = await call(o, 'POST', `/v1/proposals/${proposalId}/decisions`, {
    cookie,
    headers: { 'if-match': etag },
    body: { outcome: 'approve' },
  });
  expect(res.status, res.body).toBe(201);
  return res.json();
}

describe('W7 end-to-end check', () => {
  const A = org(hostA);
  const B = org(hostB);
  const title = `W7 check ${run}`;
  let item: { itemId: string; versionId: string };
  let ownerA: string;

  beforeAll(async () => {
    ownerA = await signIn(A, 'owner');
  });

  it('step 1: the containers answer, and private endpoints stay private', async () => {
    expect((await call(A, 'GET', '/healthz')).status).toBe(200);
    expect((await call(A, 'GET', '/readyz')).status).toBe(404);
    expect((await call(A, 'GET', '/metrics')).status).toBe(404);
    const page = await call(A, 'GET', '/');
    expect(page.status).toBe(200);
    expect(page.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('steps 2 and 3: the contributor creates an item owned by the seeded group; the owner approves it', async () => {
    const contributor = await signIn(A, 'contributor');
    const created = await call(A, 'POST', '/v1/proposals', {
      cookie: contributor,
      headers: { 'idempotency-key': randomUUID() },
      body: {
        kind: 'create',
        reason: 'W7 end-to-end check',
        changes: {
          title,
          type: 'process',
          content: `Content of ${title}`,
          owners: [{ kind: 'group', ref_id: ownersGroupId(A.address) }],
        },
      },
    });
    expect(created.status, created.body).toBe(201);
    const decided = await approve(A, ownerA, created.json().proposalId);
    item = { itemId: created.json().itemId, versionId: decided.versionId };
  });

  it('step 4: the item shows on the page with its history, and through MCP search and read', async () => {
    const page = await call(A, 'GET', `/v1/items/${item.itemId}`, { cookie: ownerA });
    expect(page.status).toBe(200);
    expect(page.json()).toMatchObject({
      title,
      history: [expect.objectContaining({ versionNumber: 1 })],
    });
    const token = A.env('AGENT_TOKEN');
    const search = await tool(A, token, 'search_knowledge', { query: title });
    expect(search.result.results.map((r: { itemId: string }) => r.itemId)).toContain(item.itemId);
    const read = await tool(A, token, 'get_item', { itemId: item.itemId });
    expect(read.result).toMatchObject({ title, version: { versionNumber: 1 } });
  });

  it('step 5: the agent proposes a change through MCP; once approved it shows with its AI-agent origin', async () => {
    const token = A.env('AGENT_TOKEN');
    const proposed = await tool(A, token, 'propose_change', {
      kind: 'change',
      itemId: item.itemId,
      baseVersionId: item.versionId,
      reason: 'Agent update',
      changes: { content: `Agent content ${run}` },
      idempotencyKey: randomUUID(),
    });
    expect(proposed.isError, JSON.stringify(proposed.result)).toBe(false);
    expect(proposed.result.origin).toBe('ai-agent');
    await approve(A, ownerA, proposed.result.proposalId);
    const page = (await call(A, 'GET', `/v1/items/${item.itemId}`, { cookie: ownerA })).json();
    expect(page.version.versionNumber).toBe(2);
    expect(page.history[0]).toMatchObject({ versionNumber: 2, origin: 'ai-agent' });
    const read = await tool(A, token, 'get_item', { itemId: item.itemId });
    expect(read.result.content).toBe(`Agent content ${run}`);
  });

  it('step 6: the second organisation finds nothing of the first, and changes nothing', async () => {
    const ownerB = await signIn(B, 'owner');
    const tokenB = B.env('AGENT_TOKEN');
    // An open proposal of A for B to try to decide on.
    const open = await tool(A, A.env('AGENT_TOKEN'), 'propose_change', {
      kind: 'change',
      itemId: item.itemId,
      baseVersionId: (await call(A, 'GET', `/v1/items/${item.itemId}`, { cookie: ownerA })).json()
        .version.versionId,
      reason: 'left open',
      changes: { why: 'open' },
      idempotencyKey: randomUUID(),
    });

    expect((await call(B, 'GET', `/v1/items/${item.itemId}`, { cookie: ownerB })).status).toBe(404);
    expect((await tool(B, tokenB, 'get_item', { itemId: item.itemId })).result).toMatchObject({
      code: 'not-found',
    });
    expect((await tool(B, tokenB, 'search_knowledge', { query: title })).result.results).toEqual(
      [],
    );
    const link = await call(B, 'POST', '/v1/proposals', {
      cookie: ownerB,
      headers: { 'idempotency-key': randomUUID() },
      body: {
        kind: 'create',
        reason: 'r',
        changes: {
          title: 'B item',
          type: 'process',
          content: 'c',
          owners: [{ kind: 'group', ref_id: ownersGroupId(B.address) }],
          addLinks: [{ toItemId: item.itemId, linkType: 'relates-to' }],
        },
      },
    });
    expect(link.status).toBe(422);
    const decision = await call(B, 'POST', `/v1/proposals/${open.result.proposalId}/decisions`, {
      cookie: ownerB,
      headers: { 'if-match': `"${open.result.proposalId}:open"` },
      body: { outcome: 'approve' },
    });
    expect(decision.status).toBe(404);
    expect(
      (await call(A, 'GET', `/v1/proposals/${open.result.proposalId}`, { cookie: ownerA })).json()
        .proposal.status,
    ).toBe('open');

    // Organisation A's agent token at organisation B's address.
    expect((await call(B, 'GET', '/v1/items', { token: A.env('AGENT_TOKEN') })).status).toBe(404);
    expect((await tool(B, A.env('AGENT_TOKEN'), 'search_knowledge', { query: title })).status).toBe(
      404,
    );
  });
});
