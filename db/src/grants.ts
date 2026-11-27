import { sql, type Kysely } from 'kysely';
import type { Database } from './schema.ts';

/**
 * Grants exactly as the security design's role tables (NFR9.2), applied on every `migrate` run.
 * GRANT and REVOKE are idempotent, and running them after pg-boss's own migrations covers every
 * job-queue table it created. History tables get no UPDATE or DELETE for `ce_api`; `ce_worker`
 * gets the job-queue schema only.
 */
export async function applyGrants(db: Kysely<Database>) {
  await sql`
    GRANT USAGE ON SCHEMA public TO ce_api;
    GRANT SELECT, INSERT ON item_versions, decisions TO ce_api;
    GRANT SELECT, INSERT ON items TO ce_api;
    GRANT UPDATE (current_version_id, last_reviewed_at) ON items TO ce_api;
    GRANT SELECT, INSERT ON proposals TO ce_api;
    GRANT UPDATE (status) ON proposals TO ce_api;
    GRANT SELECT, INSERT ON links TO ce_api;
    GRANT UPDATE (removed_in_version_id) ON links TO ce_api;
    GRANT SELECT ON organisations, groups, group_members, service_accounts TO ce_api;
    GRANT SELECT, INSERT, UPDATE, DELETE ON "user", session, account, verification, apikey TO ce_api;
    GRANT EXECUTE ON FUNCTION auth_service_account(text) TO ce_api;

    GRANT USAGE ON SCHEMA pgboss TO ce_api, ce_worker;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA pgboss TO ce_api, ce_worker;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA pgboss TO ce_api, ce_worker;
  `.execute(db);

  // Hosted shape: Supabase's own API roles never reach our tables (infrastructure specification).
  await sql`
    DO $$
    DECLARE r text;
    BEGIN
      FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
          EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public, pgboss FROM %I', r);
          EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public, pgboss FROM %I', r);
          EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public, pgboss FROM %I', r);
          EXECUTE format('REVOKE USAGE ON SCHEMA pgboss FROM %I', r);
          EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public, pgboss REVOKE ALL ON TABLES FROM %I', r);
        END IF;
      END LOOP;
    END $$;
  `.execute(db);
}
