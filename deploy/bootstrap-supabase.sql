-- One-off setup of the hosted service's Supabase project (deploy/README.md, step 2).
-- Run ONCE in Supabase's SQL editor as Supabase's `postgres` role. Replace the three
-- <...> placeholders with passwords you generate now; store them only in the VM's .env.
-- Everything that changes per release (tables, policies, grants, seed) stays in `migrate`.

-- The three roles of the security design; none bypasses row-level security.
CREATE ROLE ce_migrate LOGIN NOSUPERUSER NOCREATEROLE NOBYPASSRLS PASSWORD '<ce_migrate password>';
CREATE ROLE ce_api LOGIN NOSUPERUSER NOCREATEROLE NOBYPASSRLS PASSWORD '<ce_api password>';
CREATE ROLE ce_worker LOGIN NOSUPERUSER NOCREATEROLE NOBYPASSRLS PASSWORD '<ce_worker password>';

-- ce_migrate creates our tables in public and owns the job-queue schema.
GRANT CREATE ON SCHEMA public TO ce_migrate;
GRANT CREATE ON DATABASE postgres TO ce_migrate;
CREATE SCHEMA pgboss AUTHORIZATION ce_migrate;

-- Supabase's own API roles never reach our schemas. (migrate also revokes table rights from
-- them on every run, and its lockdown test checks it.)
REVOKE USAGE ON SCHEMA pgboss FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Then, in the Supabase dashboard: Project Settings > Data API > turn the Data API off.
