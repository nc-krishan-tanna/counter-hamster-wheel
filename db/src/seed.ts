/**
 * Seeds the configured organisations and their accounts (functional spec, Seeded actors; security
 * design, Seeding). Secrets come only from the environment. People are created through Better
 * Auth's sign-up API and agent keys are stored with the API-key plugin's own hashing, so nothing is
 * stored in plain text. An organisation that already exists is skipped, so the seed is idempotent.
 */
import { createHash, randomUUID } from 'node:crypto';
import { defaultKeyHasher } from '@better-auth/api-key';
import type { Kysely } from 'kysely';
import { seedSignUp, type Auth } from './auth.ts';
import type { Database } from './schema.ts';

interface OrgSeed {
  address: string;
  name: string;
  /** Prefix of its variables: SEED_<key>_OWNER_PASSWORD and so on. */
  key: string;
}

/** acme and globex for local development and CI; e2e-a and e2e-b for the hosted live copy. */
export const SEEDED_ORGANISATIONS: readonly OrgSeed[] = [
  { address: 'acme', name: 'Acme', key: 'ACME' },
  { address: 'globex', name: 'Globex', key: 'GLOBEX' },
  { address: 'e2e-a', name: 'End-to-end test A', key: 'E2E_A' },
  { address: 'e2e-b', name: 'End-to-end test B', key: 'E2E_B' },
];

/**
 * The seeded Owners group's id, derived from the organisation's address, so the W7 end-to-end
 * check can name it as an owner (U1 has no route that lists groups; U2 adds one).
 */
export function ownersGroupId(address: string): string {
  const h = createHash('sha256').update(`context-engine:owners-group:${address}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Seeded people use the reserved `.example` domain (RFC 2606): never a real address. */
export const seedEmail = (role: 'owner' | 'contributor', address: string) =>
  `${role}@${address}.example`;

export async function runSeed(db: Kysely<Database>, auth: Auth, env: NodeJS.ProcessEnv) {
  for (const org of SEEDED_ORGANISATIONS) {
    const ownerPassword = env[`SEED_${org.key}_OWNER_PASSWORD`];
    const agentToken = env[`SEED_${org.key}_AGENT_TOKEN`];
    const contributorPassword = env[`SEED_${org.key}_CONTRIBUTOR_PASSWORD`];
    if (!ownerPassword || !agentToken) continue;
    const existing = await db
      .selectFrom('organisations')
      .select('organisation_id')
      .where('address', '=', org.address)
      .executeTakeFirst();
    if (existing) continue;

    const { organisation_id } = await db
      .insertInto('organisations')
      .values({ name: org.name, address: org.address })
      .returning('organisation_id')
      .executeTakeFirstOrThrow();
    try {
      const signUp = async (role: 'owner' | 'contributor', password: string) => {
        const result = await seedSignUp.run(
          { organisationId: organisation_id, role: 'Contributor' },
          () =>
            auth.api.signUpEmail({
              body: { email: seedEmail(role, org.address), password, name: `${org.name} ${role}` },
            }),
        );
        return result.user.id;
      };
      const ownerId = await signUp('owner', ownerPassword);
      if (contributorPassword) await signUp('contributor', contributorPassword);

      const group = await db
        .insertInto('groups')
        .values({ group_id: ownersGroupId(org.address), organisation_id, name: 'Owners' })
        .returning('group_id')
        .executeTakeFirstOrThrow();
      await db
        .insertInto('group_members')
        .values({ organisation_id, group_id: group.group_id, user_id: ownerId })
        .execute();

      const serviceAccountId = randomUUID();
      const apiKeyId = randomUUID();
      const now = new Date();
      await db
        .insertInto('apikey')
        .values({
          id: apiKeyId,
          configId: 'default',
          name: `${org.name} agent`,
          start: null,
          referenceId: serviceAccountId,
          prefix: null,
          key: await defaultKeyHasher(agentToken),
          enabled: true,
          rateLimitEnabled: false,
          requestCount: 0,
          createdAt: now,
          updatedAt: now,
        })
        .execute();
      await db
        .insertInto('service_accounts')
        .values({
          service_account_id: serviceAccountId,
          organisation_id,
          name: `${org.name} agent`,
          role: 'Contributor',
          api_key_id: apiKeyId,
        })
        .execute();
    } catch (error) {
      // Leave nothing half-seeded: the next run would otherwise skip this organisation for good.
      await removeOrganisation(db, organisation_id);
      throw error;
    }
  }
}

async function removeOrganisation(db: Kysely<Database>, organisationId: string) {
  const agents = await db
    .selectFrom('service_accounts')
    .select('api_key_id')
    .where('organisation_id', '=', organisationId)
    .execute();
  const users = db.selectFrom('user').select('id').where('organisation_id', '=', organisationId);
  await db.deleteFrom('group_members').where('organisation_id', '=', organisationId).execute();
  await db.deleteFrom('groups').where('organisation_id', '=', organisationId).execute();
  await db.deleteFrom('service_accounts').where('organisation_id', '=', organisationId).execute();
  if (agents.length > 0) {
    await db
      .deleteFrom('apikey')
      .where(
        'id',
        'in',
        agents.map((a) => a.api_key_id),
      )
      .execute();
  }
  await db.deleteFrom('user').where('id', 'in', users).execute();
  await db.deleteFrom('organisations').where('organisation_id', '=', organisationId).execute();
}
