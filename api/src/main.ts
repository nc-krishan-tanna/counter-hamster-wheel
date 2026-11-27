/** The api container's entry point: configuration check, then serve; graceful stop on SIGTERM. */
import pg from 'pg';
import { buildApp } from './app.ts';
import { createApiAuth } from './auth.ts';
import { apiConfig, type ApiConfig } from './config.ts';
import { createDb } from './db/pool.ts';

/** Builds and starts the api; `stop` finishes requests in flight and closes the pools. */
export async function startApi(config: ApiConfig, logStream?: { write(line: string): void }) {
  const db = createDb(config.databaseUrl);
  const authPool = new pg.Pool({ connectionString: config.databaseUrl, max: 5 });
  authPool.on('error', () => undefined); // an idle client's error; the next query reconnects
  const access = { baseDomain: config.baseDomain, publicPort: config.publicPort };
  const auth = createApiAuth({ pool: authPool, db, secret: config.authSecret, ...access });
  const app = await buildApp({ db, auth, config: access, logStream });
  await app.listen({ host: '0.0.0.0', port: config.port });
  return {
    app,
    async stop() {
      await app.close();
      await authPool.end();
      await db.destroy();
    },
  };
}

if (import.meta.main) {
  const api = await startApi(apiConfig());
  const shutdown = async (signal: string) => {
    api.app.log.info({ signal }, 'stopping');
    // Finish requests in flight, but never wait more than 10 seconds (reliability design).
    const cap = setTimeout(() => process.exit(1), 10_000);
    cap.unref();
    try {
      await api.stop();
      process.exit(0);
    } catch (error) {
      api.app.log.error(
        { errName: (error as Error).name, errCode: (error as { code?: string }).code },
        'stop failed',
      );
      process.exit(1);
    }
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}
