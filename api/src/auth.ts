/**
 * Better Auth as the api serves it: every organisation's address is an allowed host, cookies are
 * Secure, HttpOnly, SameSite=Lax with no Domain (one organisation's address only), and the trusted
 * origins are the organisations' own addresses (security design, Cross-site writes).
 */
import { createAuth, type Auth } from '@ce/db/auth';
import type pg from 'pg';
import { expectedOrigin } from './access/origin.ts';
import type { Db } from './db/pool.ts';
import { listOrganisationAddresses } from './repo/organisations.ts';

export interface ApiAuthSettings {
  pool: pg.Pool;
  db: Db;
  secret: string;
  baseDomain: string;
  publicPort: number;
}

export function createApiAuth(s: ApiAuthSettings): Auth {
  const allowedHosts = [`*.${s.baseDomain}`];
  if (s.publicPort !== 443) allowedHosts.push(`*.${s.baseDomain}:${s.publicPort}`);
  return createAuth({
    pool: s.pool,
    secret: s.secret,
    baseURL: { allowedHosts, protocol: 'https' },
    trustedOrigins: async () => {
      try {
        return (await listOrganisationAddresses(s.db)).map((address) =>
          expectedOrigin({ address, baseDomain: s.baseDomain, publicPort: s.publicPort }),
        );
      } catch (error) {
        // Fail closed: with the database unreachable (or the pool closed at shutdown), no
        // origin is trusted, so Better Auth refuses cross-site writes rather than crashing.
        console.error(
          JSON.stringify({
            level: 'error',
            msg: 'trusted origins lookup failed',
            errCode: (error as { code?: string }).code,
          }),
        );
        return [];
      }
    },
    advanced: {
      useSecureCookies: true,
      defaultCookieAttributes: { secure: true, httpOnly: true, sameSite: 'lax', path: '/' },
    },
  });
}
