/**
 * The job runner behind the C3 `JobQueue`: takes jobs of the registered types and hands each
 * handler its job, including the job's organisation (reliability design, Jobs). Handlers must be
 * idempotent: a job can run more than once.
 */
import type { Job, JobQueue } from '@ce/api/jobs/job-queue';
import type { WorkerMetrics } from './metrics.ts';

export type JobHandler = (job: Job) => Promise<void>;

/** Production handlers by job type. U1 ships none; later units register theirs here. */
export const JOB_HANDLERS: Record<string, JobHandler> = {};

export function createRunner(options: {
  queue: JobQueue;
  handlers: Record<string, JobHandler>;
  metrics: WorkerMetrics;
  pollIntervalMs?: number;
  batchSize?: number;
}) {
  const types = Object.keys(options.handlers);
  const pollMs = options.pollIntervalMs ?? 1000;
  let running = false;
  let loop: Promise<void> | undefined;

  async function runOne(job: Job) {
    const handler = options.handlers[job.type];
    try {
      if (!handler) throw Object.assign(new Error('no handler'), { code: 'no-handler' });
      await handler(job);
      await options.queue.complete(job.jobId);
      options.metrics.attempts.inc({ type: job.type, result: 'completed' });
    } catch (error) {
      const e = error as { code?: string; message?: string };
      // Code and message only, never job content (C3 dead letters, NFR6.1).
      await options.queue.fail(
        job.jobId,
        { code: e.code ?? 'handler-failed', message: e.message ?? 'failed' },
        true,
      );
      options.metrics.attempts.inc({ type: job.type, result: 'failed' });
    }
  }

  async function poll() {
    while (running) {
      let jobs: Job[] = [];
      try {
        jobs = types.length > 0 ? await options.queue.take(types, options.batchSize ?? 5) : [];
      } catch (error) {
        // A lost database is retried on the next poll; readiness reports it meanwhile.
        console.error(
          JSON.stringify({ level: 'error', msg: 'job take failed', err: (error as Error).message }),
        );
      }
      for (const job of jobs) await runOne(job);
      if (jobs.length === 0) await new Promise((r) => setTimeout(r, pollMs));
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      loop = poll();
    },
    /** Stops taking jobs and waits for the jobs in hand to finish. */
    async stop() {
      running = false;
      await loop;
    },
  };
}
