/**
 * Worker metrics (observability design): queue depth, oldest waiting job and dead letters per
 * job type, read from pg-boss on each scrape, plus attempts counted by the runner.
 */
import type PgBoss from 'pg-boss';
import { Counter, Gauge, Registry, collectDefaultMetrics } from 'prom-client';
import { deadLetterQueue } from '@ce/db/queues';

export function createWorkerMetrics(boss: PgBoss, types: readonly string[]) {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  new Gauge({
    name: 'job_queue_depth',
    help: 'Jobs waiting to run, by type',
    labelNames: ['type'] as const,
    registers: [registry],
    async collect() {
      for (const type of types) this.set({ type }, await boss.getQueueSize(type));
    },
  });
  new Gauge({
    name: 'job_oldest_waiting_seconds',
    help: 'Age of the oldest job waiting to run, by type',
    labelNames: ['type'] as const,
    registers: [registry],
    async collect() {
      for (const type of types) {
        const { rows } = await boss.getDb().executeSql(
          `SELECT COALESCE(EXTRACT(EPOCH FROM now() - min(created_on)), 0)::float AS age
             FROM pgboss.job WHERE name = $1 AND state IN ('created', 'retry')`,
          [type],
        );
        this.set({ type }, Number(rows[0]?.age ?? 0));
      }
    },
  });
  new Gauge({
    name: 'dead_letter_count',
    help: 'Jobs in the dead-letter queue, by type',
    labelNames: ['type'] as const,
    registers: [registry],
    async collect() {
      for (const type of types) this.set({ type }, await boss.getQueueSize(deadLetterQueue(type)));
    },
  });
  const attempts = new Counter({
    name: 'job_attempts_total',
    help: 'Job attempts by type and result',
    labelNames: ['type', 'result'] as const,
    registers: [registry],
  });

  return { registry, attempts };
}

export type WorkerMetrics = ReturnType<typeof createWorkerMetrics>;
