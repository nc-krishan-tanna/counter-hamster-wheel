/**
 * The request chain, in order (security design, Layers): organisation from the address, then the
 * credential (which must belong to that organisation), then the Origin rule. A failing step stops
 * the request; nothing after it runs.
 */
import type { onRequestAsyncHookHandler } from 'fastify';
import type { Auth } from '@ce/db/auth';
import { resolveOrganisation } from '../access/organisation.ts';
import { checkOrigin } from '../access/origin.ts';
import { resolvePrincipal } from '../access/principal.ts';
import type { Db } from '../db/pool.ts';
import { toWebRequest } from '../web-request.ts';

export interface AccessConfig {
  baseDomain: string;
  publicPort: number;
}

export const organisationHook =
  (db: Db, config: AccessConfig): onRequestAsyncHookHandler =>
  async (request) => {
    request.organisation = await resolveOrganisation(
      db,
      request.headers.host ?? '',
      config.baseDomain,
    );
  };

export const authenticationHook =
  (db: Db, auth: Auth): onRequestAsyncHookHandler =>
  async (request) => {
    if (!request.organisation) throw new Error('organisation hook must run first');
    request.principal = await resolvePrincipal({
      db,
      auth,
      headers: toWebRequest(request).headers,
      organisation: request.organisation,
    });
  };

export const originHook =
  (config: AccessConfig): onRequestAsyncHookHandler =>
  async (request) => {
    if (!request.organisation || !request.principal) throw new Error('access hooks must run first');
    checkOrigin({
      address: request.organisation.address,
      baseDomain: config.baseDomain,
      publicPort: config.publicPort,
      method: request.method,
      via: request.principal.via ?? 'bearer',
      origin: request.headers.origin,
    });
  };
