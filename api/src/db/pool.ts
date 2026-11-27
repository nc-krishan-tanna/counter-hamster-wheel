import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Database } from '@ce/db/schema';

export type Db = Kysely<Database>;

/**
 * The process's one connection pool (performance design: pg default of 10 for `api`). Only
 * `withOrganisation` and the pre-organisation lookups (address, credential) use it directly.
 */
export function createDb(connectionString: string, max = 10): Db {
  const pool = new pg.Pool({ connectionString, max });
  // An idle client's network error must not crash the process; the next query reconnects.
  pool.on('error', (error) =>
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'pg pool error',
        code: (error as { code?: string }).code,
      }),
    ),
  );
  return new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
}
