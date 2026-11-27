/** The worker container's entry point: runs the registered job types; graceful stop on SIGTERM. */
import { createJobQueue, startBoss } from '@ce/api/jobs/job-queue';
import { workerConfig } from './config.ts';
import { createWorkerApp } from './health.ts';
import { createWorkerMetrics } from './metrics.ts';
import { createRunner, JOB_HANDLERS, type JobHandler } from './runner.ts';

/** Starts pg-boss, the runner and the health server; `stop` drains and closes them. */
export async function startWorker(
  config: { databaseUrl: string; port: number },
  handlers: Record<string, JobHandler> = JOB_HANDLERS,
) {
  const boss = await startBoss(config.databaseUrl, 5);
  const metrics = createWorkerMetrics(boss, Object.keys(handlers));
  const runner = createRunner({ queue: createJobQueue(boss), handlers, metrics });
  const app = createWorkerApp({ boss, metrics });
  runner.start();
  await app.listen({ host: '0.0.0.0', port: config.port });
  return {
    app,
    async stop() {
      await app.close();
      await runner.stop();
      await boss.stop({ graceful: true, wait: true });
    },
  };
}

if (import.meta.main) {
  const worker = await startWorker(workerConfig());
  const shutdown = async () => {
    const cap = setTimeout(() => process.exit(1), 10_000);
    cap.unref();
    try {
      await worker.stop();
      process.exit(0);
    } catch {
      process.exit(1);
    }
  };
  process.once('SIGTERM', () => void shutdown());
  process.once('SIGINT', () => void shutdown());
  console.log(
    JSON.stringify({ level: 'info', msg: 'worker ready', types: Object.keys(JOB_HANDLERS) }),
  );
}
