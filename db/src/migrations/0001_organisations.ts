import { sql, type Kysely } from 'kysely';

/** Entities `Organisation`; security design, "Organisation from the address". */
export async function up(db: Kysely<unknown>) {
  await sql`
    CREATE TABLE organisations (
      organisation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
      address text NOT NULL UNIQUE CHECK (address ~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$'),
      status text NOT NULL DEFAULT 'active' CHECK (status IN ('active')),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `.execute(db);
}
