import { sql, type Transaction } from 'kysely';
import type { Database } from '@ce/db/schema';
import type { Db } from './pool.ts';

export type OrgTransaction = Transaction<Database>;

/**
 * Runs `fn` in one transaction with the organisation set (security design, "Every knowledge query
 * runs with the organisation set"). `set_config(..., true)` is the parameterised form of
 * `SET LOCAL`: the setting ends with the transaction, so a pooled connection never carries one
 * organisation into another request, and row-level security sees only this organisation's rows.
 * Route handlers and MCP tools get their database handle only from here (C7 lint rule).
 */
export function withOrganisation<T>(
  db: Db,
  organisationId: string,
  fn: (trx: OrgTransaction) => Promise<T>,
): Promise<T> {
  return db.transaction().execute(async (trx) => {
    await sql`SELECT set_config('app.organisation_id', ${organisationId}::uuid::text, true)`.execute(
      trx,
    );
    return fn(trx);
  });
}
