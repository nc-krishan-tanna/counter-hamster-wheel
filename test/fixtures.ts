/**
 * Test data for integration tests. Organisations are seeded through the real `migrate` step
 * (the production seed), with passwords and tokens generated per test file: nothing real is stored.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import type { TestDb } from './postgres.ts';

export interface SeededOrg {
  organisationId: string;
  address: string;
  ownerId: string;
  ownerEmail: string;
  ownerPassword: string;
  contributorId?: string;
  contributorEmail?: string;
  contributorPassword?: string;
  groupId: string;
  agent: { serviceAccountId: string; apiKeyId: string; token: string };
}

export interface Seeded {
  acme: SeededOrg & {
    contributorId: string;
    contributorEmail: string;
    contributorPassword: string;
  };
  globex: SeededOrg;
  env: Record<string, string>;
}

export const secret = () => randomBytes(24).toString('base64url');

export function seedEnv(): Record<string, string> {
  return {
    BETTER_AUTH_SECRET: secret() + secret(),
    SEED_ACME_CONTRIBUTOR_PASSWORD: secret(),
    SEED_ACME_OWNER_PASSWORD: secret(),
    SEED_ACME_AGENT_TOKEN: `ce_${secret()}`,
    SEED_GLOBEX_OWNER_PASSWORD: secret(),
    SEED_GLOBEX_AGENT_TOKEN: `ce_${secret()}`,
  };
}

/** Runs the production migrate step (idempotent) with seed variables, then reads back the ids. */
export async function seedOrganisations(t: TestDb, env = seedEnv()): Promise<Seeded> {
  const { runMigrate } = await import('../db/src/migrate.ts');
  await runMigrate({ url: t.url('ce_migrate'), env });
  const acme = await readOrg(t, 'acme', env.SEED_ACME_AGENT_TOKEN!);
  const globex = await readOrg(t, 'globex', env.SEED_GLOBEX_AGENT_TOKEN!);
  return {
    acme: {
      ...acme,
      ownerPassword: env.SEED_ACME_OWNER_PASSWORD!,
      contributorId: acme.contributorId!,
      contributorEmail: acme.contributorEmail!,
      contributorPassword: env.SEED_ACME_CONTRIBUTOR_PASSWORD!,
    },
    globex: { ...globex, ownerPassword: env.SEED_GLOBEX_OWNER_PASSWORD! },
    env,
  };
}

async function readOrg(t: TestDb, address: string, token: string) {
  const db = t.db('ce_migrate');
  const org = await db
    .selectFrom('organisations')
    .select('organisation_id')
    .where('address', '=', address)
    .executeTakeFirstOrThrow();
  const users = await db
    .selectFrom('user')
    .select(['id', 'email'])
    .where('organisation_id', '=', org.organisation_id)
    .execute();
  const owner = users.find((u) => u.email.startsWith('owner@'))!;
  const contributor = users.find((u) => u.email.startsWith('contributor@'));
  const group = await db
    .selectFrom('groups')
    .select('group_id')
    .where('organisation_id', '=', org.organisation_id)
    .executeTakeFirstOrThrow();
  const agent = await db
    .selectFrom('service_accounts')
    .select(['service_account_id', 'api_key_id'])
    .where('organisation_id', '=', org.organisation_id)
    .executeTakeFirstOrThrow();
  return {
    organisationId: org.organisation_id,
    address,
    ownerId: owner.id,
    ownerEmail: owner.email,
    ownerPassword: '',
    contributorId: contributor?.id,
    contributorEmail: contributor?.email,
    groupId: group.group_id,
    agent: { serviceAccountId: agent.service_account_id, apiKeyId: agent.api_key_id, token },
  };
}

export interface ItemFixture {
  itemId: string;
  versionId: string;
  proposalId: string;
}

/**
 * Inserts an approved item directly as the owning role (bypassing the proposal service), for
 * tests below the business-logic layer. Owners default to the organisation's Owners group.
 */
export async function insertApprovedItem(
  t: TestDb,
  org: SeededOrg,
  fields: { title?: string; content?: string; owners?: { kind: string; ref_id: string }[] } = {},
): Promise<ItemFixture> {
  const itemId = randomUUID();
  const versionId = randomUUID();
  const proposalId = randomUUID();
  const owners = fields.owners ?? [{ kind: 'group', ref_id: org.groupId }];
  const now = new Date();
  await t
    .db('ce_migrate')
    .transaction()
    .execute(async (trx) => {
      await trx
        .insertInto('proposals')
        .values({
          proposal_id: proposalId,
          organisation_id: org.organisationId,
          kind: 'create',
          item_id: itemId,
          base_version_id: null,
          changes: JSON.stringify({ title: fields.title ?? 'Fixture item' }),
          reason: 'fixture',
          origin: 'person',
          proposer_kind: 'user',
          proposer_id: org.ownerId,
          status: 'approved',
          idempotency_key: randomUUID(),
          request_hash: 'fixture',
        })
        .execute();
      await trx
        .insertInto('items')
        .values({
          item_id: itemId,
          organisation_id: org.organisationId,
          type: 'glossary-term',
          current_version_id: versionId,
          last_reviewed_at: now,
        })
        .execute();
      await trx
        .insertInto('item_versions')
        .values({
          version_id: versionId,
          organisation_id: org.organisationId,
          item_id: itemId,
          version_number: 1,
          title: fields.title ?? 'Fixture item',
          content: fields.content ?? 'Fixture content',
          why: null,
          owners: JSON.stringify(owners),
          sources: JSON.stringify([{ kind: 'system', title: 'Fixture', channel: 'web' }]),
          proposal_id: proposalId,
          approved_by: org.ownerId,
          approved_at: now,
          // The owner proposed and approved it: a self-approval (BR2.4).
          flags: sql`ARRAY['self-approved']::text[]`,
        })
        .execute();
      await trx
        .insertInto('decisions')
        .values({
          organisation_id: org.organisationId,
          proposal_id: proposalId,
          decider_id: org.ownerId,
          outcome: 'approved',
          comment: null,
          is_self_approval: true,
        })
        .execute();
    });
  return { itemId, versionId, proposalId };
}

/**
 * Creates a test-only job type's queues as the owning role (as `migrate` would for a real type),
 * then re-applies the grants so ce_api and ce_worker can use the new queue tables.
 */
export async function createTestQueue(
  t: TestDb,
  type: string,
  options: { retryDelay?: number; expireInSeconds?: number } = {},
) {
  const PgBoss = (await import('pg-boss')).default;
  const { ensureQueue } = await import('../db/src/queues.ts');
  const { applyGrants } = await import('../db/src/grants.ts');
  const boss = new PgBoss({
    connectionString: t.url('ce_migrate'),
    max: 1,
    migrate: false,
    supervise: false,
    schedule: false,
  });
  boss.on('error', () => undefined);
  await boss.start();
  try {
    await ensureQueue(boss, type, options);
  } finally {
    await boss.stop({ graceful: false, wait: true });
  }
  await applyGrants(t.db('ce_migrate'));
}

/** Inserts a live link as the owning role. */
export async function insertLink(
  t: TestDb,
  org: SeededOrg,
  from: ItemFixture,
  to: ItemFixture,
  linkType = 'relates-to',
) {
  const row = await t
    .db('ce_migrate')
    .insertInto('links')
    .values({
      organisation_id: org.organisationId,
      from_item_id: from.itemId,
      to_item_id: to.itemId,
      link_type: linkType,
      added_in_version_id: from.versionId,
    })
    .returning('link_id')
    .executeTakeFirstOrThrow();
  return row.link_id;
}
