import { requireEnvOrExit } from '@ce/db/config';

export const API_ENV = ['DATABASE_URL_API', 'BETTER_AUTH_SECRET', 'PUBLIC_BASE_DOMAIN'] as const;

export interface ApiConfig {
  databaseUrl: string;
  authSecret: string;
  baseDomain: string;
  /** Port Caddy publishes HTTPS on; 443 means no port in the address. */
  publicPort: number;
  port: number;
}

export function apiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const vars = requireEnvOrExit(API_ENV, env);
  return {
    databaseUrl: vars.DATABASE_URL_API,
    authSecret: vars.BETTER_AUTH_SECRET,
    baseDomain: vars.PUBLIC_BASE_DOMAIN,
    publicPort: Number(env.PUBLIC_PORT || 443),
    port: Number(env.PORT || 3000),
  };
}
