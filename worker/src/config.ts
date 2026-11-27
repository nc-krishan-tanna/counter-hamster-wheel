import { requireEnvOrExit } from '@ce/db/config';

export const WORKER_ENV = ['DATABASE_URL_WORKER'] as const;

export function workerConfig(env: NodeJS.ProcessEnv = process.env) {
  const vars = requireEnvOrExit(WORKER_ENV, env);
  return { databaseUrl: vars.DATABASE_URL_WORKER, port: Number(env.PORT || 3001) };
}
