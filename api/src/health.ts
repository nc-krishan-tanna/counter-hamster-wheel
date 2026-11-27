/**
 * C8 health and metrics endpoints. Registered outside the organisation and authentication hooks:
 * Compose health checks and scrapes reach them on the private network (`Host: api:3000`), and
 * Caddy never routes them (security design).
 */
import { sql } from 'kysely';
import type { FastifyInstance } from 'fastify';
import type { Registry } from 'prom-client';
import type { Db } from './db/pool.ts';
import { ProblemError, problemBody } from './domain/errors.ts';

/** Resolves true when `check` finishes within `ms`, false when it fails or times out. */
export async function within(ms: number, check: () => Promise<unknown>): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<false>((resolve) => (timer = setTimeout(() => resolve(false), ms)));
  try {
    return await Promise.race([
      check().then(
        () => true,
        () => false,
      ),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function registerHealth(app: FastifyInstance, deps: { db: Db; registry: Registry }) {
  app.get('/healthz', async () => ({ status: 'ok' }));
  app.get('/readyz', async (request, reply) => {
    if (await within(2000, () => sql`SELECT 1`.execute(deps.db))) return { status: 'ready' };
    return reply
      .code(503)
      .type('application/problem+json')
      .send(problemBody(new ProblemError('dependency-unavailable'), request.id));
  });
  app.get('/metrics', async (_request, reply) =>
    reply.type(deps.registry.contentType).send(await deps.registry.metrics()),
  );
}
