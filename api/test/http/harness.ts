import pg from 'pg';
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify';
import { freshDatabase, type TestDb } from '../../../test/postgres.ts';
import { seedOrganisations, type Seeded } from '../../../test/fixtures.ts';
import { buildApp } from '../../src/app.ts';
import { createApiAuth } from '../../src/auth.ts';
import { createDb, type Db } from '../../src/db/pool.ts';

export type Org = 'acme' | 'globex';

export interface CallOptions {
  method?: InjectOptions['method'];
  url: string;
  /** The organisation address the request arrives at, or a raw Host header. */
  org?: Org;
  host?: string;
  cookie?: string;
  token?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Override the Origin sent with cookie-authenticated writes (`null` sends none). */
  origin?: string | null;
}

export interface ApiFixture {
  t: TestDb;
  s: Seeded;
  db: Db;
  app: FastifyInstance;
  /** Every log line the app wrote. */
  logs: string[];
  signIn(org: Org, who: 'owner' | 'contributor'): Promise<string>;
  call(options: CallOptions): Promise<LightMyRequestResponse>;
  /** JSON-RPC `tools/call` on /mcp with a bearer token; returns the tool result. */
  tool(
    org: Org,
    token: string,
    name: string,
    args: object,
  ): Promise<{ isError?: boolean; content: { type: string; text: string }[]; result: unknown }>;
  close(): Promise<void>;
}

export async function apiFixture(): Promise<ApiFixture> {
  const t = await freshDatabase();
  const s = await seedOrganisations(t);
  const db = createDb(t.url('ce_api'));
  const pool = new pg.Pool({ connectionString: t.url('ce_api') });
  const logs: string[] = [];
  const config = { baseDomain: 'localhost', publicPort: 443 };
  const auth = createApiAuth({ pool, db, secret: s.env.BETTER_AUTH_SECRET!, ...config });
  const app = await buildApp({
    db,
    auth,
    config,
    logStream: { write: (line: string) => void logs.push(line) },
  });
  await app.ready();

  const call = (o: CallOptions) => {
    const method = o.method ?? 'GET';
    const host = o.host ?? `${o.org ?? 'acme'}.localhost`;
    const headers: Record<string, string> = { host, ...o.headers };
    if (o.cookie) headers.cookie = o.cookie;
    if (o.token) headers.authorization = `Bearer ${o.token}`;
    if (o.cookie && method !== 'GET' && o.origin !== null)
      headers.origin = o.origin ?? `https://${host}`;
    return app.inject({
      method,
      url: o.url,
      headers,
      ...(o.body !== undefined ? { payload: o.body as object } : {}),
    });
  };

  return {
    t,
    s,
    db,
    app,
    logs,
    call,
    async signIn(org, who) {
      const seeded = s[org];
      const email = who === 'owner' ? seeded.ownerEmail : seeded.contributorEmail;
      const password = who === 'owner' ? seeded.ownerPassword : seeded.contributorPassword;
      const res = await call({
        method: 'POST',
        url: '/api/auth/sign-in/email',
        org,
        headers: { origin: `https://${org}.localhost`, 'content-type': 'application/json' },
        body: { email, password },
      });
      if (res.statusCode !== 200) throw new Error(`sign-in failed: ${res.statusCode} ${res.body}`);
      const setCookie = res.headers['set-cookie'];
      const first = Array.isArray(setCookie) ? setCookie[0] : setCookie;
      return (first ?? '').split(';')[0]!;
    },
    async tool(org, token, name, args) {
      const res = await call({
        method: 'POST',
        url: '/mcp',
        org,
        token,
        headers: {
          accept: 'application/json, text/event-stream',
          'content-type': 'application/json',
        },
        body: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } },
      });
      if (res.statusCode !== 200)
        throw Object.assign(new Error(`mcp ${res.statusCode}`), {
          statusCode: res.statusCode,
          body: res.body,
        });
      const result = res.json().result as {
        isError?: boolean;
        content: { type: string; text: string }[];
      };
      return { ...result, result: JSON.parse(result.content[0]!.text) };
    },
    async close() {
      await app.close();
      await pool.end();
      await db.destroy();
      await t.close();
    },
  };
}

/** Counts of every knowledge row of one organisation, to prove a request changed nothing. */
export async function snapshotOf(t: TestDb, organisationId: string) {
  const { rows } = await t.pool('superuser').query(
    `SELECT (SELECT count(*) FROM items WHERE organisation_id = $1) AS items,
            (SELECT count(*) FROM item_versions WHERE organisation_id = $1) AS versions,
            (SELECT count(*) FROM links WHERE organisation_id = $1) AS links,
            (SELECT count(*) FROM proposals WHERE organisation_id = $1) AS proposals,
            (SELECT string_agg(status, ',' ORDER BY proposal_id) FROM proposals WHERE organisation_id = $1) AS statuses,
            (SELECT count(*) FROM decisions WHERE organisation_id = $1) AS decisions`,
    [organisationId],
  );
  return rows[0];
}
