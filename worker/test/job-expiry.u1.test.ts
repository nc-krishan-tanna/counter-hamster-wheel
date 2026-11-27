import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type PgBoss from 'pg-boss';
import { freshDatabase, type TestDb } from '../../test/postgres.ts';
import { createTestQueue, seedOrganisations, type Seeded } from '../../test/fixtures.ts';
import { createDb, type Db } from '@ce/api/db/pool';
import { withOrganisation } from '@ce/api/db/with-organisation';
import { createJobQueue, startBoss, type Job, type JobQueue } from '@ce/api/jobs/job-queue';
import { startWorker } from '../src/main.ts';

const TYPE = 'u1.expiry-job';

async function takeWithin(queue: JobQueue, ms: number): Promise<Job[]> {
  const deadline = Date.now() + ms;
  for (;;) {
    const jobs = await queue.take([TYPE], 5);
    if (jobs.length > 0 || Date.now() > deadline) return jobs;
    await new Promise((r) => setTimeout(r, 250));
  }
}

/**
 * Review R-03: the worker is the one process running pg-boss maintenance (as ce_worker, DML only),
 * so a job left active by a crashed worker expires and comes back for retry, and dead letters are
 * kept 30 days (C3).
 */
describe('job maintenance by the worker', () => {
  let t: TestDb;
  let s: Seeded;
  let db: Db;
  let apiBoss: PgBoss;
  let takerBoss: PgBoss;
  let worker: Awaited<ReturnType<typeof startWorker>>;
  const errors: string[] = [];

  beforeAll(async () => {
    t = await freshDatabase();
    s = await seedOrganisations(t);
    await createTestQueue(t, TYPE, { retryDelay: 1, expireInSeconds: 1 });
    db = createDb(t.url('ce_api'));
    apiBoss = await startBoss(t.url('ce_api'), 2);
    takerBoss = await startBoss(t.url('ce_worker'), 2);
    // No handlers: this worker only supervises; the test takes and abandons jobs itself.
    worker = await startWorker(
      { databaseUrl: t.url('ce_worker'), port: 0, maintenanceIntervalSeconds: 1 },
      {},
    );
    worker.boss.on('error', (e: Error) => errors.push(e.message));
  });
  afterAll(async () => {
    await worker?.stop();
    await apiBoss?.stop({ graceful: false, wait: true });
    await takerBoss?.stop({ graceful: false, wait: true });
    await db?.destroy();
    await t?.close();
  });

  it('gives a job abandoned by a crashed worker back for retry after its expiry', async () => {
    const api = createJobQueue(apiBoss);
    const taker = createJobQueue(takerBoss);
    await withOrganisation(db, s.acme.organisationId, (trx) => api.enqueue(trx, TYPE, { n: 1 }));
    const [first] = await takeWithin(taker, 5_000);
    expect(first!.attempts).toBe(1);
    // Never completed: the worker that took it "crashed".
    const [again] = await takeWithin(taker, 15_000);
    expect(again).toMatchObject({ jobId: first!.jobId, attempts: 2, payload: { n: 1 } });
    await taker.complete(again!.jobId);
    expect(errors).toEqual([]);
  });

  it('keeps a dead letter for 30 days from when it was dead-lettered', async () => {
    const api = createJobQueue(apiBoss);
    const taker = createJobQueue(takerBoss);
    await withOrganisation(db, s.acme.organisationId, (trx) => api.enqueue(trx, TYPE, { n: 2 }));
    const [job] = await takeWithin(taker, 5_000);
    await taker.fail(job!.jobId, { code: 'bad-input', message: 'never works' }, false);

    const keptDays = async () => {
      const { rows } = await t
        .pool('ce_migrate')
        .query<{ days: number }>(
          `SELECT EXTRACT(EPOCH FROM keep_until - created_on) / 86400 AS days
             FROM pgboss.job WHERE name = $1 AND state = 'created'`,
          [`${TYPE}.dead`],
        );
      return rows.map((r) => Math.round(Number(r.days) * 1000) / 1000);
    };
    const deadline = Date.now() + 10_000;
    while ((await keptDays())[0] !== 30 && Date.now() < deadline)
      await new Promise((r) => setTimeout(r, 250));
    expect(await keptDays()).toEqual([30]);
    expect(errors).toEqual([]);
  });
});
