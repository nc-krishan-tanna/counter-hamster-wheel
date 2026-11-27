/** The worker's C8 endpoints on the private network: /healthz, /readyz (database and pg-boss), /metrics. */
import Fastify from 'fastify';
import type PgBoss from 'pg-boss';
import { within } from '@ce/api/health';
import { ProblemError, problemBody } from '@ce/api/domain/errors';
import type { WorkerMetrics } from './metrics.ts';

export function createWorkerApp(deps: { boss: PgBoss; metrics: WorkerMetrics }) {
  const app = Fastify({ logger: false });
  app.get('/healthz', async () => ({ status: 'ok' }));
  app.get('/readyz', async (request, reply) => {
    const ready = await within(2000, async () => {
      if (!(await deps.boss.isInstalled())) throw new Error('job queue not installed');
      await deps.boss.getDb().executeSql('SELECT 1', []);
    });
    if (ready) return { status: 'ready' };
    return reply
      .code(503)
      .type('application/problem+json')
      .send(problemBody(new ProblemError('dependency-unavailable'), request.id));
  });
  app.get('/metrics', async (_request, reply) =>
    reply.type(deps.metrics.registry.contentType).send(await deps.metrics.registry.metrics()),
  );
  return app;
}
