/**
 * Who is calling (security design, Authentication): a Better Auth session for people, an API-key
 * bearer token for agents. The credential must belong to the organisation of the address;
 * otherwise the answer is `404 not-found`, so nothing about the other organisation is revealed.
 */
import type { Auth } from '@ce/db/auth';
import type { Db } from '../db/pool.ts';
import { ProblemError } from '../domain/errors.ts';
import { serviceAccountForApiKey } from '../repo/principals.ts';

export interface Principal {
  kind: 'user' | 'service-account';
  id: string;
  role: string;
  organisationId: string;
  /** How the credential arrived; the Origin rule applies to sessions only. */
  via?: 'session' | 'bearer';
}

const unauthenticated = () => new ProblemError('unauthenticated');

export async function resolvePrincipal(input: {
  db: Db;
  auth: Auth;
  headers: Headers;
  organisation: { organisationId: string };
}): Promise<Principal> {
  const { db, auth, headers, organisation } = input;
  const authorization = headers.get('authorization');
  if (authorization) {
    const token = /^Bearer\s+(\S+)$/i.exec(authorization)?.[1];
    if (!token) throw unauthenticated();
    const result = await auth.api.verifyApiKey({ body: { key: token }, headers });
    if (!result.valid || !result.key) throw unauthenticated();
    const account = await serviceAccountForApiKey(db, result.key.id);
    if (!account || account.status !== 'active') throw unauthenticated();
    if (account.organisationId !== organisation.organisationId) throw new ProblemError('not-found');
    return {
      kind: 'service-account',
      id: account.serviceAccountId,
      role: account.role,
      organisationId: account.organisationId,
      via: 'bearer',
    };
  }

  const session = await auth.api.getSession({ headers });
  if (!session) throw unauthenticated();
  const user = session.user as { id: string; organisationId: string; role: string; status: string };
  if (user.status !== 'active') throw unauthenticated();
  if (user.organisationId !== organisation.organisationId) throw new ProblemError('not-found');
  return {
    kind: 'user',
    id: user.id,
    role: user.role,
    organisationId: user.organisationId,
    via: 'session',
  };
}

/** BR5.1: proposing needs the Contributor role or higher. */
export const canPropose = (p: Principal) => ['Contributor', 'Approver', 'Admin'].includes(p.role);
