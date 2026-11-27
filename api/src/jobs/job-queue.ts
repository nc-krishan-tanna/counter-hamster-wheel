/**
 * The C3 `JobQueue` interface over pg-boss 10 (reliability design, Jobs). Shared by `api`
 * (enqueue inside the request's transaction, dead letters) and `worker` (take, complete, fail,
 * defer). Every job carries its organisation; payloads hold ids only, never content (NFR6.1).
 */
import { CompiledQuery, sql } from 'kysely';
import PgBoss from 'pg-boss';
import { deadLetterQueue } from '@ce/db/queues';
import type { OrgTransaction } from '../db/with-organisation.ts';

export interface Job {
  /** Opaque: `<type>/<pg-boss id>`. */
  jobId: string;
  organisationId: string;
  type: string;
  payload: object;
  /** 1 on the first run; at most 3 (`retryLimit: 2`). */
  attempts: number;
}

export interface JobError {
  code: string;
  message: string;
}

export interface DeadLetter {
  deadLetterId: string;
  job: Job;
  lastError: JobError | null;
  attempts: number;
  deadLetteredAt: Date;
}

export interface JobQueue {
  /** Inserts on the caller's transaction, so a rolled-back change leaves no job; needs an organisation. */
  enqueue(
    trx: OrgTransaction,
    type: string,
    payload: object,
    options?: { runAfter?: Date },
  ): Promise<string>;
  /** Lease-based (pg-boss `SKIP LOCKED`): safe with several worker copies. */
  take(types: readonly string[], batchSize: number): Promise<Job[]>;
  complete(jobId: string): Promise<void>;
  /**
   * Records a failed attempt; the queue retries with backoff and moves the job to `<type>.dead`
   * after the last attempt. Both retryable and non-retryable failures count as an attempt (C3).
   */
  fail(jobId: string, error: JobError, retryable: boolean): Promise<void>;
  /** Re-schedules a taken job for `until` without using up an attempt (outages, C3 policy). */
  defer(jobId: string, until: Date, reason: string): Promise<void>;
  deadLetters(trx: OrgTransaction, type?: string): Promise<DeadLetter[]>;
  retryDeadLetter(trx: OrgTransaction, deadLetterId: string): Promise<void>;
  discardDeadLetter(trx: OrgTransaction, deadLetterId: string, reason: string): Promise<void>;
}

interface StoredData {
  organisationId: string;
  payload: object;
}

const SCHEMA = 'pgboss';

/** Starts pg-boss for `api` or `worker`: never migrates, never creates queues (security design). */
export async function startBoss(connectionString: string, max = 5): Promise<PgBoss> {
  const boss = new PgBoss({
    connectionString,
    schema: SCHEMA,
    max,
    migrate: false,
    supervise: false,
    schedule: false,
  });
  boss.on('error', (error: Error) =>
    console.error(JSON.stringify({ level: 'error', msg: 'job queue error', err: error.message })),
  );
  await boss.start();
  return boss;
}

function parseId(id: string): { name: string; id: string } {
  const at = id.lastIndexOf('/');
  if (at <= 0) throw new Error('job not found');
  return { name: id.slice(0, at), id: id.slice(at + 1) };
}

/** pg-boss runs its own SQL text on the caller's Kysely transaction (bound values, no string-built SQL). */
const onTransaction = (trx: OrgTransaction): PgBoss.Db => ({
  async executeSql(text, values) {
    const result = await trx.executeQuery(CompiledQuery.raw(text, values));
    return { rows: result.rows as unknown[] };
  },
});

async function currentOrganisationOf(trx: OrgTransaction): Promise<string> {
  const { rows } = await sql<{ org: string | null }>`
    SELECT NULLIF(current_setting('app.organisation_id', true), '') AS org
  `.execute(trx);
  const org = rows[0]?.org;
  if (!org) throw new Error('enqueue refused: no organisation set on the transaction');
  return org;
}

export function createJobQueue(boss: PgBoss): JobQueue {
  const db = boss.getDb();

  async function findDeadLetter(trx: OrgTransaction, deadLetterId: string) {
    const { name, id } = parseId(deadLetterId);
    const organisationId = await currentOrganisationOf(trx);
    const { rows } = await sql<{ data: StoredData }>`
      SELECT data FROM pgboss.job
       WHERE name = ${name} AND id = ${id}::uuid AND state = 'created' AND data->>'organisationId' = ${organisationId}
    `.execute(trx);
    if (!rows[0] || !name.endsWith('.dead')) throw new Error('dead letter not found');
    return { name, id, data: rows[0].data };
  }

  return {
    async enqueue(trx, type, payload, options = {}) {
      const organisationId = await currentOrganisationOf(trx);
      const data: StoredData = { organisationId, payload };
      const id = await boss.send(type, data, {
        db: onTransaction(trx),
        ...(options.runAfter ? { startAfter: options.runAfter } : {}),
      });
      if (!id) throw new Error(`enqueue refused for job type ${type}`);
      return `${type}/${id}`;
    },

    async take(types, batchSize) {
      const jobs: Job[] = [];
      for (const type of types) {
        const fetched = await boss.fetch<StoredData>(type, { batchSize, includeMetadata: true });
        for (const job of fetched) {
          jobs.push({
            jobId: `${type}/${job.id}`,
            type,
            organisationId: job.data.organisationId,
            payload: job.data.payload,
            attempts: job.retryCount + 1,
          });
        }
      }
      return jobs;
    },

    async complete(jobId) {
      const { name, id } = parseId(jobId);
      await boss.complete(name, id);
    },

    async fail(jobId, error) {
      const { name, id } = parseId(jobId);
      const job = await boss.getJobById(name, id, { includeArchive: false });
      const attempts = (job?.retryCount ?? 0) + 1;
      // Code and message only (C3 dead letters never hold content).
      await boss.fail(name, id, { code: error.code, message: error.message, attempts });
    },

    async defer(jobId, until) {
      const { name, id } = parseId(jobId);
      // Back to `created` with no start time: the next fetch does not count a retry.
      await db.executeSql(
        `UPDATE ${SCHEMA}.job SET state = 'created', start_after = $3, started_on = NULL
          WHERE name = $1 AND id = $2 AND state = 'active'`,
        [name, id, until],
      );
    },

    async deadLetters(trx, type) {
      const organisationId = await currentOrganisationOf(trx);
      const names = type ? [deadLetterQueue(type)] : null;
      const { rows } = await sql<{
        name: string;
        id: string;
        data: StoredData;
        output: (JobError & { attempts?: number }) | null;
        created_on: Date;
      }>`
        SELECT name, id, data, output, created_on FROM pgboss.job
         WHERE state = 'created' AND name LIKE '%.dead'
           AND (${names}::text[] IS NULL OR name = ANY(${names}::text[]))
           AND data->>'organisationId' = ${organisationId}
         ORDER BY created_on
      `.execute(trx);
      return rows.map((r) => {
        const type = r.name.slice(0, -'.dead'.length);
        return {
          deadLetterId: `${r.name}/${r.id}`,
          job: {
            jobId: `${r.name}/${r.id}`,
            type,
            organisationId,
            payload: r.data.payload,
            attempts: r.output?.attempts ?? 0,
          },
          lastError: r.output ? { code: r.output.code, message: r.output.message } : null,
          attempts: r.output?.attempts ?? 0,
          deadLetteredAt: r.created_on,
        };
      });
    },

    async retryDeadLetter(trx, deadLetterId) {
      const dead = await findDeadLetter(trx, deadLetterId);
      await boss.send(dead.name.slice(0, -'.dead'.length), dead.data, { db: onTransaction(trx) });
      await boss.cancel(dead.name, dead.id, { db: onTransaction(trx) });
    },

    // shortcut: the reason is not stored; C3's recorded admin action arrives with the Admin
    // dead-letter routes (U2/U8), which will write it to their audit record.
    async discardDeadLetter(trx, deadLetterId) {
      const dead = await findDeadLetter(trx, deadLetterId);
      await boss.cancel(dead.name, dead.id, { db: onTransaction(trx) });
    },
  };
}
