import PgBoss from 'pg-boss';

/** Production job types. U1 ships none (reliability design, Jobs); later units add theirs here. */
export const JOB_TYPES: readonly string[] = [];

/** Queue defaults from the reliability design: 3 attempts in all, backoff, `<type>.dead`. */
export const QUEUE_DEFAULTS = { retryLimit: 2, retryBackoff: true } as const;

export const deadLetterQueue = (type: string) => `${type}.dead`;

/** Creates a job type's queue and its dead-letter queue unless they exist (idempotent). */
export async function ensureQueue(
  boss: PgBoss,
  type: string,
  options: Omit<PgBoss.Queue, 'name' | 'deadLetter'> = {},
) {
  const dead = deadLetterQueue(type);
  if (!(await boss.getQueue(dead))) await boss.createQueue(dead, { name: dead });
  if (!(await boss.getQueue(type))) {
    await boss.createQueue(type, { ...QUEUE_DEFAULTS, ...options, name: type, deadLetter: dead });
  }
}

/**
 * The only place pg-boss creates its schema and queues (`migrate: true`, as ce_migrate). The api
 * and worker start pg-boss with `migrate: false` and never create a queue (security design).
 */
export async function setupJobQueue(
  connectionString: string,
  types: readonly string[] = JOB_TYPES,
) {
  const boss = new PgBoss({
    connectionString,
    schema: 'pgboss',
    max: 1,
    migrate: true,
    supervise: false,
    schedule: false,
  });
  const errors: Error[] = [];
  boss.on('error', (error: Error) => errors.push(error));
  await boss.start();
  try {
    for (const type of types) await ensureQueue(boss, type);
  } finally {
    await boss.stop({ graceful: false, wait: true });
  }
  if (errors.length > 0) throw errors[0];
}
