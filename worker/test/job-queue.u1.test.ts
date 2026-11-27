import { randomUUID } from 'node:crypto';
import type PgBoss from 'pg-boss';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { freshDatabase, type TestDb } from '../../test/postgres.ts';
import { createTestQueue, seedOrganisations, type Seeded } from '../../test/fixtures.ts';
import { createDb, type Db } from '@ce/api/db/pool';
import { withOrganisation } from '@ce/api/db/with-organisation';
import { createJobQueue, startBoss, type Job, type JobQueue } from '@ce/api/jobs/job-queue';

const TYPE = 'u1.test-job';

/** Polls `take` until a job is available (retries and deferrals become due after a delay). */
async function takeWithin(queue: JobQueue, ms: number, type = TYPE): Promise<Job[]> {
  const deadline = Date.now() + ms;
  for (;;) {
    const jobs = await queue.take([type], 5);
    if (jobs.length > 0 || Date.now() > deadline) return jobs;
    await new Promise((r) => setTimeout(r, 200));
  }
}

/** Contract C3 over pg-boss (NFR10.4, NFR10.5). */
describe('JobQueue', () => {
  let t: TestDb;
  let s: Seeded;
  let db: Db;
  let apiBoss: PgBoss;
  let workerBoss: PgBoss;
  let api: JobQueue;
  let worker: JobQueue;

  const inAcme = <T>(fn: Parameters<typeof withOrganisation<T>>[2]) =>
    withOrganisation(db, s.acme.organisationId, fn);
  const inGlobex = <T>(fn: Parameters<typeof withOrganisation<T>>[2]) =>
    withOrganisation(db, s.globex.organisationId, fn);

  beforeAll(async () => {
    t = await freshDatabase();
    s = await seedOrganisations(t);
    await createTestQueue(t, TYPE, { retryDelay: 1 });
    await createTestQueue(t, 'u1.page-job');
    db = createDb(t.url('ce_api'));
    apiBoss = await startBoss(t.url('ce_api'), 2);
    workerBoss = await startBoss(t.url('ce_worker'), 2);
    api = createJobQueue(apiBoss);
    worker = createJobQueue(workerBoss);
  });
  afterAll(async () => {
    await apiBoss?.stop({ graceful: false, wait: true });
    await workerBoss?.stop({ graceful: false, wait: true });
    await db?.destroy();
    await t?.close();
  });

  it('leaves no job when the enqueuing transaction rolls back', async () => {
    await expect(
      inAcme(async (trx) => {
        await api.enqueue(trx, TYPE, { n: 0 });
        throw new Error('rolled back');
      }),
    ).rejects.toThrow('rolled back');
    expect(await worker.take([TYPE], 10)).toEqual([]);
  });

  it('refuses to enqueue with no organisation set', async () => {
    await expect(
      db.transaction().execute((trx) => api.enqueue(trx, TYPE, { n: 1 })),
    ).rejects.toThrow(/organisation/);
  });

  it('hands back the whole C3 job on take: organisation, version, attempts, times', async () => {
    const before = Date.now();
    const jobId = await inAcme((trx) => api.enqueue(trx, TYPE, { n: 2 }));
    const [job] = await takeWithin(worker, 5_000);
    expect(job).toEqual({
      jobId,
      organisationId: s.acme.organisationId,
      type: TYPE,
      version: 1,
      payload: { n: 2 },
      attempts: 1,
      maxAttempts: 3,
      createdAt: expect.any(Date),
      runAfter: expect.any(Date),
    });
    expect(job!.createdAt.getTime()).toBeGreaterThanOrEqual(before - 1_000);
    expect(job!.runAfter.getTime()).toBeGreaterThanOrEqual(job!.createdAt.getTime() - 1_000);
    await worker.complete(job!.jobId);
    expect(await worker.take([TYPE], 10)).toEqual([]);
  });

  it('enqueues once per idempotency key within an organisation', async () => {
    const key = randomUUID();
    const first = await inAcme((trx) => api.enqueue(trx, TYPE, { n: 6 }, { idempotencyKey: key }));
    const again = await inAcme((trx) => api.enqueue(trx, TYPE, { n: 6 }, { idempotencyKey: key }));
    const other = await inGlobex((trx) =>
      api.enqueue(trx, TYPE, { n: 6 }, { idempotencyKey: key }),
    );
    expect(again).toBe(first);
    expect(other).not.toBe(first);
    const jobs = await takeWithin(worker, 5_000);
    expect(jobs.map((j) => j.jobId).sort()).toEqual([first, other].sort());
    expect(jobs[0]!.idempotencyKey).toBe(key);
    for (const j of jobs) await worker.complete(j.jobId);
  });

  it('holds a job until its runAfter time', async () => {
    const runAfter = new Date(Date.now() + 1_500);
    await inAcme((trx) => api.enqueue(trx, TYPE, { n: 7 }, { runAfter }));
    expect(await worker.take([TYPE], 10)).toEqual([]);
    const [job] = await takeWithin(worker, 5_000);
    expect(job!.runAfter.getTime()).toBe(runAfter.getTime());
    await worker.complete(job!.jobId);
  });

  it('moves a job that fails every time to the dead-letter queue after 3 attempts, for its organisation only', async () => {
    await inAcme((trx) => api.enqueue(trx, TYPE, { n: 3 }));
    const attempts: number[] = [];
    for (let i = 0; i < 3; i++) {
      const [job] = await takeWithin(worker, 15_000);
      expect(job, `attempt ${i + 1}`).toBeDefined();
      attempts.push(job!.attempts);
      await worker.fail(job!.jobId, { code: 'boom', message: 'always fails' }, true);
    }
    expect(attempts).toEqual([1, 2, 3]);
    expect(await takeWithin(worker, 2_500)).toEqual([]);

    const { deadLetters: dead } = await inAcme((trx) => api.deadLetters(trx, { type: TYPE }));
    expect(dead).toEqual([
      expect.objectContaining({
        attempts: 3,
        lastError: { code: 'boom', message: 'always fails' },
        deadLetteredAt: expect.any(Date),
        job: expect.objectContaining({
          type: TYPE,
          organisationId: s.acme.organisationId,
          payload: { n: 3 },
          attempts: 3,
          maxAttempts: 3,
        }),
      }),
    ]);
    expect((await inGlobex((trx) => api.deadLetters(trx, { type: TYPE }))).deadLetters).toEqual(
      [],
    );

    // Another organisation can neither retry nor discard it.
    await expect(
      inGlobex((trx) => api.retryDeadLetter(trx, dead[0]!.deadLetterId)),
    ).rejects.toThrow(/not found/);

    await inAcme((trx) => api.retryDeadLetter(trx, dead[0]!.deadLetterId));
    const [retried] = await takeWithin(worker, 5_000);
    expect(retried).toMatchObject({ payload: { n: 3 }, organisationId: s.acme.organisationId });
    await worker.complete(retried!.jobId);
    expect((await inAcme((trx) => api.deadLetters(trx, { type: TYPE }))).deadLetters).toEqual([]);
  });

  it('sends a non-retryable failure straight to the dead letters as its final attempt', async () => {
    await inAcme((trx) => api.enqueue(trx, TYPE, { n: 4 }));
    const [job] = await takeWithin(worker, 5_000);
    await worker.fail(job!.jobId, { code: 'bad-input', message: 'cannot work' }, false);
    expect(await takeWithin(worker, 2_500)).toEqual([]);
    const { deadLetters: dead } = await inAcme((trx) => api.deadLetters(trx, { type: TYPE }));
    expect(dead).toEqual([
      expect.objectContaining({
        attempts: 1,
        lastError: { code: 'bad-input', message: 'cannot work' },
        job: expect.objectContaining({ payload: { n: 4 } }),
      }),
    ]);

    // Discarded with a reason, it is gone.
    await inAcme((trx) => api.discardDeadLetter(trx, dead[0]!.deadLetterId, 'not needed'));
    expect((await inAcme((trx) => api.deadLetters(trx, { type: TYPE }))).deadLetters).toEqual([]);
  });

  it('pages dead letters with a cursor and bounds the page size', async () => {
    const PAGE = 'u1.page-job';
    for (let n = 0; n < 3; n++) {
      await inAcme((trx) => api.enqueue(trx, PAGE, { n }));
      const [job] = await takeWithin(worker, 5_000, PAGE);
      await worker.fail(job!.jobId, { code: 'bad-input', message: 'x' }, false);
    }
    const first = await inAcme((trx) => api.deadLetters(trx, { type: PAGE, limit: 2 }));
    expect(first.deadLetters.map((d) => d.job.payload)).toEqual([{ n: 0 }, { n: 1 }]);
    expect(first.nextCursor).toEqual(expect.any(String));
    const second = await inAcme((trx) =>
      api.deadLetters(trx, { type: PAGE, limit: 2, cursor: first.nextCursor! }),
    );
    expect(second.deadLetters.map((d) => d.job.payload)).toEqual([{ n: 2 }]);
    expect(second.nextCursor).toBeNull();

    // Every type, and a limit above the bound is cut to it.
    const all = await inAcme((trx) => api.deadLetters(trx, { limit: 10_000 }));
    expect(all.deadLetters).toHaveLength(3);
    await expect(
      inAcme((trx) => api.deadLetters(trx, { type: PAGE, cursor: 'not-a-cursor' })),
    ).rejects.toThrow(/cursor/);
  });

  it('defers a job without counting an attempt and logs the reason with the job id only', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      await inAcme((trx) => api.enqueue(trx, TYPE, { n: 5, secret: 'CONTENT-MARKER' }));
      const [job] = await takeWithin(worker, 5_000);
      expect(job!.attempts).toBe(1);
      await worker.defer(job!.jobId, new Date(Date.now() + 1_500), 'dependency-unavailable');
      const lines = log.mock.calls.map((c) => String(c[0]));
      expect(lines).toEqual([expect.stringContaining('"reason":"dependency-unavailable"')]);
      expect(lines[0]).toContain(job!.jobId);
      expect(lines[0]).not.toContain('CONTENT-MARKER');
      expect(await worker.take([TYPE], 10)).toEqual([]);
      const [again] = await takeWithin(worker, 5_000);
      expect(again).toMatchObject({ payload: { n: 5 }, attempts: 1 });
      await worker.complete(again!.jobId);
    } finally {
      log.mockRestore();
    }
  });
});
