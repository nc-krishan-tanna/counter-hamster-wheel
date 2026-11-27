import type { Db } from '../db/pool.ts';

export interface Organisation {
  organisationId: string;
  address: string;
  status: string;
}

/**
 * Resolves an address before anything else is known. `organisations` is outside row-level
 * security on purpose: it holds names and addresses only (security design).
 */
export async function findOrganisationByAddress(
  db: Db,
  address: string,
): Promise<Organisation | undefined> {
  return db
    .selectFrom('organisations')
    .select(['organisation_id as organisationId', 'address', 'status'])
    .where('address', '=', address)
    .executeTakeFirst();
}

/** Every organisation's address (for Better Auth's trusted origins). */
export async function listOrganisationAddresses(db: Db): Promise<string[]> {
  const rows = await db.selectFrom('organisations').select('address').execute();
  return rows.map((r) => r.address);
}
