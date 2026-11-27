/**
 * Integration-test database helper (logical components: build, test and run).
 *
 * The default export is Vitest's global setup: one PostgreSQL 16 container per run, whose init
 * script is the real `db/init/01-roles.sql`, so tests run as the same three roles as production.
 * Each test file then calls `freshDatabase()` for its own database, copied from a template that
 * `migrate` has already run on, so files never see each other's rows.
 */
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import { inject } from 'vitest';
import type { TestProject } from 'vitest/node';
import type { Database } from '../db/src/schema.ts';

export type Role = 'ce_migrate' | 'ce_api' | 'ce_worker' | 'superuser';

export interface PgInfo {
  host: string;
  port: number;
  passwords: Record<Role, string>;
}

declare module 'vitest' {
  export interface ProvidedContext {
    pg: PgInfo;
  }
}

const ROLES_SQL = fileURLToPath(new URL('../db/init/01-roles.sql', import.meta.url));
const SUPERUSER = 'postgres';

// One container per Vitest run, shared by every project that lists this global setup.
const shared = globalThis as { __cePg?: Promise<{ info: PgInfo; stop: () => Promise<unknown> }> };
let users = 0;

// The teardown below stops the container; Ryuk (a second image to pull) only covers crashed runs.
// shortcut: Ryuk off by default, so a killed run can leave a container behind; set
// TESTCONTAINERS_RYUK_DISABLED=false to turn it back on.
process.env.TESTCONTAINERS_RYUK_DISABLED ??= 'true';

async function startContainer() {
  const passwords: Record<Role, string> = {
    superuser: secret(),
    ce_migrate: secret(),
    ce_api: secret(),
    ce_worker: secret(),
  };
  const container = await new PostgreSqlContainer('postgres:16')
    .withDatabase('ce')
    .withUsername(SUPERUSER)
    .withPassword(passwords.superuser)
    .withEnvironment({
      CE_MIGRATE_PASSWORD: passwords.ce_migrate,
      CE_API_PASSWORD: passwords.ce_api,
      CE_WORKER_PASSWORD: passwords.ce_worker,
    })
    .withCopyFilesToContainer([
      { source: ROLES_SQL, target: '/docker-entrypoint-initdb.d/01-roles.sql' },
    ])
    .start();
  const info = { host: container.getHost(), port: container.getPort(), passwords };
  return { info, stop: () => container.stop() };
}

export default async function setup(project: TestProject) {
  shared.__cePg ??= startContainer();
  const { info, stop } = await shared.__cePg;
  project.provide('pg', info);
  users += 1;
  return async () => {
    users -= 1;
    if (users === 0) await stop();
  };
}

function secret() {
  return randomBytes(18).toString('base64url');
}

export function connectionUrl(info: PgInfo, role: Role, database: string) {
  const user = role === 'superuser' ? SUPERUSER : role;
  return `postgres://${user}:${encodeURIComponent(info.passwords[role])}@${info.host}:${info.port}/${database}`;
}

async function asSuperuser<T>(info: PgInfo, fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: connectionUrl(info, 'superuser', 'postgres') });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** The migrated template, built once per run under an advisory lock (test files run in parallel). */
async function ensureMigratedTemplate(info: PgInfo) {
  await asSuperuser(info, async (client) => {
    await client.query('SELECT pg_advisory_lock(4242)');
    try {
      const { rowCount } = await client.query(
        "SELECT 1 FROM pg_database WHERE datname = 'ce_migrated'",
      );
      if (rowCount) return;
      await client.query('CREATE DATABASE ce_migrating TEMPLATE ce');
      await client.query('GRANT CREATE ON DATABASE ce_migrating TO ce_migrate');
      const { runMigrate } = await import('../db/src/migrate.ts');
      await runMigrate({ url: connectionUrl(info, 'ce_migrate', 'ce_migrating'), env: {} });
      await client.query('ALTER DATABASE ce_migrating RENAME TO ce_migrated');
    } finally {
      await client.query('SELECT pg_advisory_unlock(4242)');
    }
  });
}

export interface TestDb {
  name: string;
  url(role: Role): string;
  /** A Kysely handle connected as the given role (cached; closed by `close`). */
  db(role: Role): Kysely<Database>;
  /** A raw pg pool as the given role, for statements Kysely cannot express in a test. */
  pool(role: Role): pg.Pool;
  close(): Promise<void>;
}

/**
 * A database of its own for one test file. `migrated: false` gives a database with only the roles
 * and schemas of `db/init/01-roles.sql`, as on a fresh install.
 */
export async function freshDatabase(options: { migrated?: boolean } = {}): Promise<TestDb> {
  const info = inject('pg');
  const migrated = options.migrated ?? true;
  if (migrated) await ensureMigratedTemplate(info);
  const name = `t_${randomBytes(6).toString('hex')}`;
  await asSuperuser(info, async (client) => {
    await client.query(`CREATE DATABASE ${name} TEMPLATE ${migrated ? 'ce_migrated' : 'ce'}`);
    // Database-level rights are not copied from a template; repeat 01-roles.sql's grant.
    await client.query(`GRANT CREATE ON DATABASE ${name} TO ce_migrate`);
  });
  const pools = new Map<Role, pg.Pool>();
  const dbs = new Map<Role, Kysely<Database>>();
  const pool = (role: Role) => {
    let p = pools.get(role);
    if (!p) {
      p = new pg.Pool({ connectionString: connectionUrl(info, role, name), max: 4 });
      pools.set(role, p);
    }
    return p;
  };
  return {
    name,
    url: (role) => connectionUrl(info, role, name),
    pool,
    db(role) {
      let k = dbs.get(role);
      if (!k) {
        k = new Kysely<Database>({ dialect: new PostgresDialect({ pool: pool(role) }) });
        dbs.set(role, k);
      }
      return k;
    },
    async close() {
      // Kysely's destroy ends the pool it wraps; end the rest directly.
      for (const [role, k] of dbs) {
        await k.destroy();
        pools.delete(role);
      }
      for (const p of pools.values()) await p.end();
      await asSuperuser(info, (client) => client.query(`DROP DATABASE ${name} WITH (FORCE)`));
    },
  };
}
