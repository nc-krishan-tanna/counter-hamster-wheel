import { sql, type Kysely } from 'kysely';

export const KNOWLEDGE_TABLES = [
  'items',
  'item_versions',
  'links',
  'proposals',
  'decisions',
  'groups',
  'group_members',
  'service_accounts',
] as const;

/**
 * NFR14.1: row-level security on every knowledge table. NULLIF turns both an unset setting (null)
 * and a pooled connection's leftover '' into null, so a forgotten organisation matches no row.
 * Plus the one definer function the bearer-token check needs before an organisation is known.
 */
export async function up(db: Kysely<unknown>) {
  for (const table of KNOWLEDGE_TABLES) {
    await sql`ALTER TABLE ${sql.table(table)} ENABLE ROW LEVEL SECURITY`.execute(db);
    await sql`
      CREATE POLICY organisation_only ON ${sql.table(table)}
        USING (organisation_id = NULLIF(current_setting('app.organisation_id', true), '')::uuid)
        WITH CHECK (organisation_id = NULLIF(current_setting('app.organisation_id', true), '')::uuid)
    `.execute(db);
  }

  await sql`
    CREATE FUNCTION auth_service_account(p_api_key_id text)
    RETURNS TABLE (service_account_id uuid, organisation_id uuid, role text, status text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = pg_catalog, public
    AS $$
      SELECT s.service_account_id, s.organisation_id, s.role, s.status
        FROM public.service_accounts s
       WHERE s.api_key_id = p_api_key_id
    $$;
    REVOKE ALL ON FUNCTION auth_service_account(text) FROM PUBLIC;
  `.execute(db);
}
