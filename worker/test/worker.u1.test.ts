import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type PgBoss from 'pg-boss';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { freshDatabase, type TestDb } from '../../test/postgres.ts';
import { createTestQueue, seedOrganisations, type Seeded } from '../../test/fixtures.ts';
import { createDb, type Db } from '@ce/api/db/pool';
import { withOrganisation } from '@ce/api/db/with-organisation';
import { createJobQueue, startBoss, type Job } from '@ce/api/jobs/job-queue';
import { createWorkerApp } from '../src/health.ts';
import { createWorkerMetrics } from '../src/metrics.ts';
import { createRunner } from '../src/runner.ts';
import { startWorker } from '../src/main.ts';
import { workerConfig } from '../src/config.ts';

const TYPE = 'u1.worker-job';

describe('worker', () => {
  let t: TestDb;
  let s: Seeded;
  let db: Db;
  let boss: PgBoss;
  let app: FastifyInstance;
  let metrics: ReturnType<typeof createWorkerMetrics>;

  beforeAll(async () => {
    t = await freshDatabase();
    s = await seedOrganisations(t);
    await createTestQueue(t, TYPE, { retryDelay: 1 });
    db = createDb(t.url('ce_api'));
    boss = await startBoss(t.url('ce_worker'), 2);
    metrics = createWorkerMetrics(boss, [TYPE]);
    app = createWorkerApp({ boss, metrics });
    await app.ready();
  });
  afterAll(async () => {
    await app?.close();
    await boss?.stop({ graceful: false, wait: true });
    await db?.destroy();
    await t?.close();
  });

  const enqueue = (payload: object) =>
    withOrganisation(db, s.acme.organisationId, async (trx) => {
      const apiBoss = await startBoss(t.url('ce_api'), 1);
      try {
        return await createJobQueue(apiBoss).enqueue(trx, TYPE, payload);
      } finally {
        await apiBoss.stop({ graceful: false, wait: true });
      }
    });

  it('answers /healthz and /readyz (database and pg-boss)', async () => {
    expect((await app.inject({ url: '/healthz' })).statusCode).toBe(200);
    expect((await app.inject({ url: '/readyz' })).statusCode).toBe(200);
  });

  it('is not ready when pg-boss has stopped', async () => {
    const stopped = await startBoss(t.url('ce_worker'), 1);
    await stopped.stop({ graceful: false, wait: true });
    const other = createWorkerApp({ boss: stopped, metrics: createWorkerMetrics(stopped, []) });
    const res = await other.inject({ url: '/readyz' });
    expect(res.statusCode).toBe(503);
    expect(res.headers['content-type']).toMatch(/problem\+json/);
    await other.close();
  });

  it("hands each handler its job's organisation, and counts attempts", async () => {
    const seen: Job[] = [];
    const runner = createRunner({
      queue: createJobQueue(boss),
      handlers: {
        [TYPE]: async (job) => {
          seen.push(job);
          if ((job.payload as { fail?: boolean }).fail)
            throw Object.assign(new Error('nope'), { code: 'test-failure' });
        },
      },
      metrics,
      pollIntervalMs: 100,
    });
    await enqueue({ n: 1 });
    await enqueue({ fail: true });
    runner.start();
    await expect.poll(() => seen.length, { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
    await runner.stop();
    expect(seen.find((j) => (j.payload as { n?: number }).n === 1)).toMatchObject({
      organisationId: s.acme.organisationId,
      type: TYPE,
    });
    const text = (await app.inject({ url: '/metrics' })).body;
    expect(text).toMatch(new RegExp(`job_attempts_total\\{type="${TYPE}",result="completed"\\} 1`));
    expect(text).toMatch(new RegExp(`job_attempts_total\\{type="${TYPE}",result="failed"\\} 1`));
  });

  it('exposes queue depth, oldest waiting job and dead-letter count per type', async () => {
    await enqueue({ n: 2 });
    const text = (await app.inject({ url: '/metrics' })).body;
    expect(text).toMatch(new RegExp(`job_queue_depth\\{type="${TYPE}"\\} [1-9]`));
    expect(text).toMatch(new RegExp(`job_oldest_waiting_seconds\\{type="${TYPE}"\\} \\d`));
    expect(text).toMatch(new RegExp(`dead_letter_count\\{type="${TYPE}"\\} 0`));
  });

  it('stops gracefully on SIGTERM', async () => {
    const main = fileURLToPath(new URL('../src/main.ts', import.meta.url));
    const port = String(39_000 + Math.floor(Math.random() * 1000));
    const child = spawn(process.execPath, [main], {
      env: { PATH: process.env.PATH, DATABASE_URL_WORKER: t.url('ce_worker'), PORT: port },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    const exited = new Promise<number | null>((resolve) =>
      child.on('exit', (code) => resolve(code)),
    );
    await expect
      .poll(
        async () =>
          (await fetch(`http://127.0.0.1:${port}/healthz`).catch(() => undefined))?.status,
        { timeout: 15_000 },
      )
      .toBe(200);
    child.kill('SIGTERM');
    expect(await exited, output).toBe(0);
  });

  it('starts in process with its handlers and stops cleanly', async () => {
    const seen: string[] = [];
    const worker = await startWorker(
      { databaseUrl: t.url('ce_worker'), port: 0 },
      {
        [TYPE]: async (job) => void seen.push(job.organisationId),
      },
    );
    try {
      const { port } = worker.app.server.address() as { port: number };
      expect((await fetch(`http://127.0.0.1:${port}/readyz`)).status).toBe(200);
      await enqueue({ n: 3 });
      await expect.poll(() => seen, { timeout: 10_000 }).toContain(s.acme.organisationId);
    } finally {
      await worker.stop();
    }
  });

  it('reads its configuration', () => {
    expect(workerConfig({ DATABASE_URL_WORKER: 'postgres://w' })).toEqual({
      databaseUrl: 'postgres://w',
      port: 3001,
    });
  });

  it('exits with the missing variable names when started without its configuration', async () => {
    const main = fileURLToPath(new URL('../src/main.ts', import.meta.url));
    const child = spawn(process.execPath, [main], {
      env: { PATH: process.env.PATH },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d));
    const code = await new Promise<number | null>((resolve) => child.on('exit', resolve));
    expect(code).toBe(1);
    expect(stderr).toContain('DATABASE_URL_WORKER');
  });
});
