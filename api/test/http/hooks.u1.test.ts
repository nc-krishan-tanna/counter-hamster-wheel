import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { apiFixture, type ApiFixture } from './harness.ts';
import { PROBLEMS } from '../../src/domain/errors.ts';

describe('request hooks and edge rules', () => {
  let f: ApiFixture;
  let ownerCookie: string;

  beforeAll(async () => {
    f = await apiFixture();
    ownerCookie = await f.signIn('acme', 'owner');
  });
  afterAll(() => f?.close());

  it('runs the organisation hook first: an unknown address is 404 even without a credential', async () => {
    const res = await f.call({ url: '/v1/items', host: 'nobody.localhost' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({
      code: 'not-found',
      status: 404,
      detail: PROBLEMS['not-found'].detail,
    });
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
  });

  it('then authentication: no credential at a known address is 401', async () => {
    const res = await f.call({ url: '/v1/items', org: 'acme' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({
      code: 'unauthenticated',
      detail: PROBLEMS.unauthenticated.detail,
    });
  });

  it('then the Origin rule: a cookie write with a missing or foreign Origin is 403 and changes nothing', async () => {
    for (const origin of [null, 'https://globex.localhost', 'https://evil.example']) {
      const res = await f.call({
        method: 'POST',
        url: '/v1/proposals',
        org: 'acme',
        cookie: ownerCookie,
        origin,
        headers: { 'idempotency-key': `k-${String(origin)}` },
        body: { kind: 'create', reason: 'r', changes: {} },
      });
      expect(res.statusCode, String(origin)).toBe(403);
      expect(res.json().code).toBe('forbidden');
    }
    const { rows } = await f.t.pool('superuser').query('SELECT count(*)::int AS n FROM proposals');
    expect(rows[0].n).toBe(0);
  });

  it('bearer-token writes are exempt from the Origin rule', async () => {
    const res = await f.call({
      method: 'POST',
      url: '/v1/proposals',
      org: 'acme',
      token: f.s.acme.agent.token,
      headers: { 'idempotency-key': 'agent-1' },
      body: { kind: 'create', reason: 'r', changes: {} },
    });
    expect(res.statusCode).toBe(422);
  });

  it.each(['/healthz', '/readyz', '/metrics'])(
    '%s answers on the private host and skips the chain',
    async (url) => {
      const res = await f.call({ url, host: 'api:3000' });
      expect(res.statusCode).toBe(200);
    },
  );

  it('answers 422 as a problem with one entry per field', async () => {
    const res = await f.call({
      method: 'POST',
      url: '/v1/proposals',
      org: 'acme',
      cookie: ownerCookie,
      headers: { 'idempotency-key': 'v-1' },
      // Values that cannot be read as text (numbers would be coerced to strings).
      body: { kind: 'create', reason: { text: 'x' }, changes: { title: ['a', 'b'] } },
    });
    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body).toMatchObject({
      code: 'validation-failed',
      detail: PROBLEMS['validation-failed'].detail,
    });
    expect(body.errors.map((e: { field: string }) => e.field)).toEqual(
      expect.arrayContaining(['reason', 'changes.title']),
    );
  });

  it('never sends CORS headers, even to a preflight', async () => {
    const responses = [
      await f.call({
        method: 'OPTIONS',
        url: '/v1/items',
        org: 'acme',
        headers: { origin: 'https://evil.example', 'access-control-request-method': 'POST' },
      }),
      await f.call({
        url: '/v1/items',
        org: 'acme',
        cookie: ownerCookie,
        headers: { origin: 'https://evil.example' },
      }),
    ];
    for (const res of responses) {
      expect(Object.keys(res.headers).filter((h) => h.startsWith('access-control-'))).toEqual([]);
    }
  });

  it('issues the session cookie Secure, HttpOnly, SameSite=Lax, Path=/ and with no Domain', async () => {
    const res = await f.call({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      org: 'acme',
      headers: { origin: 'https://acme.localhost', 'content-type': 'application/json' },
      body: { email: f.s.acme.ownerEmail, password: f.s.acme.ownerPassword },
    });
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const session = cookies.find((c) => c.includes('session_token'))!;
    expect(session).toMatch(/; Secure/i);
    expect(session).toMatch(/; HttpOnly/i);
    expect(session).toMatch(/; SameSite=Lax/i);
    expect(session).toMatch(/; Path=\//i);
    expect(session).not.toMatch(/Domain=/i);
  });

  it('refuses a wrong password and an unknown address on the sign-in route', async () => {
    const wrong = await f.call({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      org: 'acme',
      headers: { origin: 'https://acme.localhost', 'content-type': 'application/json' },
      body: { email: f.s.acme.ownerEmail, password: 'not-the-password' },
    });
    expect(wrong.statusCode).toBe(401);
    const unknown = await f.call({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      host: 'nobody.localhost',
      body: {},
    });
    expect(unknown.statusCode).toBe(404);
  });

  it('does not let a session be used at another organisation’s address', async () => {
    const res = await f.call({ url: '/v1/items', org: 'globex', cookie: ownerCookie });
    expect(res.statusCode).toBe(404);
  });
});
