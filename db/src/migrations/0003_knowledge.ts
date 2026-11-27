import { sql, type Kysely } from 'kysely';

/**
 * Knowledge tables (entities `ServiceAccount`, `Group`, `Item`, `ItemVersion`, `Link`,
 * `Proposal`, `Decision`). Every reference between them is composite with `organisation_id`, so a
 * row can only point at a row of its own organisation (security design); indexes lead with
 * `organisation_id` (performance design).
 */
export async function up(db: Kysely<unknown>) {
  await sql`
    CREATE TABLE service_accounts (
      service_account_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organisation_id uuid NOT NULL REFERENCES organisations (organisation_id),
      name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
      role text NOT NULL DEFAULT 'Contributor' CHECK (role IN ('Reader', 'Contributor')),
      status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deactivated')),
      api_key_id text NOT NULL UNIQUE REFERENCES apikey (id),
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (organisation_id, service_account_id)
    );

    CREATE TABLE groups (
      group_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organisation_id uuid NOT NULL REFERENCES organisations (organisation_id),
      name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (organisation_id, name),
      UNIQUE (organisation_id, group_id)
    );

    CREATE TABLE group_members (
      organisation_id uuid NOT NULL,
      group_id uuid NOT NULL,
      user_id text NOT NULL,
      PRIMARY KEY (organisation_id, group_id, user_id),
      FOREIGN KEY (organisation_id, group_id) REFERENCES groups (organisation_id, group_id),
      FOREIGN KEY (organisation_id, user_id) REFERENCES "user" (organisation_id, id)
    );
    CREATE INDEX group_members_user_idx ON group_members (organisation_id, user_id);

    CREATE TABLE proposals (
      proposal_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organisation_id uuid NOT NULL REFERENCES organisations (organisation_id),
      kind text NOT NULL CHECK (kind IN ('create', 'change', 'add-link', 'remove-link')),
      item_id uuid NOT NULL,
      base_version_id uuid,
      changes jsonb NOT NULL,
      reason text NOT NULL CHECK (char_length(reason) >= 1),
      origin text NOT NULL CHECK (origin IN ('person', 'ai-agent')),
      proposer_kind text NOT NULL CHECK (proposer_kind IN ('user', 'service-account')),
      proposer_id text NOT NULL,
      status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'approved', 'rejected', 'out-of-date')),
      created_at timestamptz NOT NULL DEFAULT now(),
      idempotency_key text NOT NULL CHECK (char_length(idempotency_key) BETWEEN 1 AND 200),
      request_hash text NOT NULL,
      CHECK ((kind = 'create') = (base_version_id IS NULL)),
      UNIQUE (organisation_id, proposal_id),
      UNIQUE (organisation_id, proposer_id, idempotency_key)
    );
    CREATE INDEX proposals_item_idx ON proposals (organisation_id, item_id, status);

    CREATE TABLE items (
      item_id uuid PRIMARY KEY,
      organisation_id uuid NOT NULL REFERENCES organisations (organisation_id),
      type text NOT NULL CHECK (type IN ('business-rule-or-policy', 'process', 'glossary-term', 'person', 'team', 'system', 'decision')),
      current_version_id uuid NOT NULL,
      status text NOT NULL DEFAULT 'active' CHECK (status IN ('active')),
      last_reviewed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (organisation_id, item_id)
    );

    CREATE TABLE item_versions (
      version_id uuid PRIMARY KEY,
      organisation_id uuid NOT NULL,
      item_id uuid NOT NULL,
      version_number integer NOT NULL CHECK (version_number >= 1),
      title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
      content text NOT NULL CHECK (char_length(content) >= 1),
      why text,
      owners jsonb NOT NULL CHECK (jsonb_typeof(owners) = 'array' AND jsonb_array_length(owners) >= 1),
      sources jsonb NOT NULL CHECK (jsonb_typeof(sources) = 'array' AND jsonb_array_length(sources) >= 1),
      proposal_id uuid NOT NULL UNIQUE,
      approved_by text NOT NULL,
      approved_at timestamptz NOT NULL,
      flags text[] NOT NULL DEFAULT '{}' CHECK (flags <@ ARRAY['self-approved']::text[]),
      UNIQUE (item_id, version_number),
      UNIQUE (organisation_id, version_id),
      FOREIGN KEY (organisation_id, item_id) REFERENCES items (organisation_id, item_id),
      FOREIGN KEY (organisation_id, proposal_id) REFERENCES proposals (organisation_id, proposal_id),
      FOREIGN KEY (organisation_id, approved_by) REFERENCES "user" (organisation_id, id)
    );
    CREATE INDEX item_versions_item_idx ON item_versions (organisation_id, item_id);

    -- An item and its first version are inserted in one transaction, so the pointer is checked at commit.
    ALTER TABLE items ADD FOREIGN KEY (organisation_id, current_version_id)
      REFERENCES item_versions (organisation_id, version_id) DEFERRABLE INITIALLY DEFERRED;
    ALTER TABLE proposals ADD FOREIGN KEY (organisation_id, base_version_id)
      REFERENCES item_versions (organisation_id, version_id);

    CREATE TABLE decisions (
      decision_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organisation_id uuid NOT NULL,
      proposal_id uuid NOT NULL UNIQUE,
      decider_id text NOT NULL,
      outcome text NOT NULL CHECK (outcome IN ('approved', 'rejected')),
      comment text,
      is_self_approval boolean NOT NULL DEFAULT false,
      decided_at timestamptz NOT NULL DEFAULT now(),
      FOREIGN KEY (organisation_id, proposal_id) REFERENCES proposals (organisation_id, proposal_id),
      FOREIGN KEY (organisation_id, decider_id) REFERENCES "user" (organisation_id, id)
    );

    CREATE TABLE links (
      link_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organisation_id uuid NOT NULL,
      from_item_id uuid NOT NULL,
      to_item_id uuid NOT NULL,
      link_type text NOT NULL CHECK (link_type IN ('relates-to', 'depends-on', 'part-of', 'applies-to')),
      added_in_version_id uuid NOT NULL,
      removed_in_version_id uuid,
      CHECK (from_item_id <> to_item_id),
      FOREIGN KEY (organisation_id, from_item_id) REFERENCES items (organisation_id, item_id),
      FOREIGN KEY (organisation_id, to_item_id) REFERENCES items (organisation_id, item_id),
      FOREIGN KEY (organisation_id, added_in_version_id) REFERENCES item_versions (organisation_id, version_id),
      FOREIGN KEY (organisation_id, removed_in_version_id) REFERENCES item_versions (organisation_id, version_id)
    );
    CREATE UNIQUE INDEX links_live_key ON links (organisation_id, from_item_id, to_item_id, link_type)
      WHERE removed_in_version_id IS NULL;
    CREATE INDEX links_to_idx ON links (organisation_id, to_item_id);
  `.execute(db);
}
