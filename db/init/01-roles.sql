-- Self-hosted postgres container init (runs once, on an empty data volume, as the superuser).
-- Creates the three roles of the security design; passwords come from the environment.
-- deploy/bootstrap-supabase.sql does the same on the hosted shape.
\set ON_ERROR_STOP on
\getenv ce_migrate_password CE_MIGRATE_PASSWORD
\getenv ce_api_password CE_API_PASSWORD
\getenv ce_worker_password CE_WORKER_PASSWORD

-- None of the three roles bypasses row-level security (NFR14.1).
CREATE ROLE ce_migrate LOGIN NOSUPERUSER NOCREATEROLE NOBYPASSRLS PASSWORD :'ce_migrate_password';
CREATE ROLE ce_api LOGIN NOSUPERUSER NOCREATEROLE NOBYPASSRLS PASSWORD :'ce_api_password';
CREATE ROLE ce_worker LOGIN NOSUPERUSER NOCREATEROLE NOBYPASSRLS PASSWORD :'ce_worker_password';

-- ce_migrate owns every table (public) and the job queue schema (pgboss).
GRANT CREATE ON SCHEMA public TO ce_migrate;
-- pg-boss's own migrations run CREATE SCHEMA IF NOT EXISTS, which checks this right first.
GRANT CREATE ON DATABASE :"DBNAME" TO ce_migrate;
CREATE SCHEMA pgboss AUTHORIZATION ce_migrate;
