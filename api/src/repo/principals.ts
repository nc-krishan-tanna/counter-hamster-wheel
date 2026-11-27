/**
 * People, groups and service accounts. The Better Auth `user` table is outside row-level security,
 * so every read of it inside a request filters on the organisation explicitly.
 */
import { sql } from 'kysely';
import type { Db } from '../db/pool.ts';
import type { OrgTransaction } from '../db/with-organisation.ts';
import { currentOrganisation } from './current-organisation.ts';

export interface ServiceAccountRecord {
  serviceAccountId: string;
  organisationId: string;
  role: string;
  status: string;
}

/** The one narrow definer function: a verified key to its account, before any organisation is set. */
export async function serviceAccountForApiKey(
  db: Db,
  apiKeyId: string,
): Promise<ServiceAccountRecord | undefined> {
  const { rows } = await sql<{
    service_account_id: string;
    organisation_id: string;
    role: string;
    status: string;
  }>`
    SELECT service_account_id, organisation_id, role, status FROM auth_service_account(${apiKeyId})
  `.execute(db);
  const row = rows[0];
  return (
    row && {
      serviceAccountId: row.service_account_id,
      organisationId: row.organisation_id,
      role: row.role,
      status: row.status,
    }
  );
}

/** Active users of the current organisation among `ids`. */
export async function activeUsers(trx: OrgTransaction, ids: string[]) {
  if (ids.length === 0) return [];
  return trx
    .selectFrom('user')
    .select(['id', 'name'])
    .where('id', 'in', ids)
    .where('status', '=', 'active')
    .where('organisation_id', '=', currentOrganisation())
    .execute();
}

/** Groups (of this organisation, by row-level security) among `ids`, with their member counts. */
export async function groupsWithMemberCounts(trx: OrgTransaction, ids: string[]) {
  if (ids.length === 0) return [];
  return trx
    .selectFrom('groups as g')
    .leftJoin('group_members as m', 'm.group_id', 'g.group_id')
    .select([
      'g.group_id as groupId',
      'g.name',
      (eb) => eb.fn.count<string>('m.user_id').as('members'),
    ])
    .where('g.group_id', 'in', ids)
    .groupBy(['g.group_id', 'g.name'])
    .execute();
}

/** Active service accounts (of this organisation) among `ids`. */
export async function activeServiceAccounts(trx: OrgTransaction, ids: string[]) {
  if (ids.length === 0) return [];
  return trx
    .selectFrom('service_accounts')
    .select(['service_account_id as id', 'name'])
    .where('service_account_id', 'in', ids)
    .where('status', '=', 'active')
    .execute();
}

/** True when the user belongs to any of the groups (BR2.1, group ownership). */
export async function isMemberOfAny(trx: OrgTransaction, userId: string, groupIds: string[]) {
  if (groupIds.length === 0) return false;
  const row = await trx
    .selectFrom('group_members')
    .select('user_id')
    .where('user_id', '=', userId)
    .where('group_id', 'in', groupIds)
    .executeTakeFirst();
  return Boolean(row);
}

/** Display names for people, groups and agents of this organisation, by id. */
export async function displayNames(
  trx: OrgTransaction,
  ids: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  const names = new Map<string, string>();
  if (unique.length === 0) return names;
  const uuids = unique.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  for (const u of await trx
    .selectFrom('user')
    .select(['id', 'name'])
    .where('id', 'in', unique)
    .where('organisation_id', '=', currentOrganisation())
    .execute())
    names.set(u.id, u.name);
  if (uuids.length > 0) {
    for (const g of await trx
      .selectFrom('groups')
      .select(['group_id', 'name'])
      .where('group_id', 'in', uuids)
      .execute())
      names.set(g.group_id, g.name);
    for (const a of await trx
      .selectFrom('service_accounts')
      .select(['service_account_id', 'name'])
      .where('service_account_id', 'in', uuids)
      .execute())
      names.set(a.service_account_id, a.name);
  }
  return names;
}
