/**
 * Better Auth, configured once for both the api and the seed, so passwords and agent keys are
 * always hashed by the library itself (security design, Authentication and Seeding).
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { apiKey } from '@better-auth/api-key';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import type pg from 'pg';

/**
 * Sign-up is only allowed while this context is set, which only the seed does: U1 has no public
 * sign-up (U2 adds it), and organisation, role and status are never taken from a request.
 */
export const seedSignUp = new AsyncLocalStorage<{ organisationId: string; role: string }>();

export interface AuthSettings {
  pool: pg.Pool;
  secret: string;
  baseURL?: BetterAuthOptions['baseURL'];
  trustedOrigins?: BetterAuthOptions['trustedOrigins'];
  advanced?: BetterAuthOptions['advanced'];
}

export function createAuth(settings: AuthSettings) {
  return betterAuth({
    database: settings.pool,
    secret: settings.secret,
    // The seed never serves HTTP; the api passes the organisations' hosts.
    baseURL: settings.baseURL ?? 'http://localhost',
    trustedOrigins: settings.trustedOrigins,
    advanced: settings.advanced,
    telemetry: { enabled: false },
    emailAndPassword: { enabled: true },
    user: {
      additionalFields: {
        organisationId: {
          type: 'string',
          fieldName: 'organisation_id',
          input: false,
          required: false,
        },
        role: { type: 'string', input: false, required: false, defaultValue: 'Contributor' },
        status: { type: 'string', input: false, required: false, defaultValue: 'active' },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const seed = seedSignUp.getStore();
            if (!seed) return false;
            return { data: { ...user, ...seed } };
          },
        },
      },
    },
    // Rate limits on the public API come with U20.
    plugins: [apiKey({ rateLimit: { enabled: false } })],
  });
}

export type Auth = ReturnType<typeof createAuth>;
