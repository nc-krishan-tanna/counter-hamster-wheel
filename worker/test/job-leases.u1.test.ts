import type PgBoss from 'pg-boss';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { freshDatabase, type TestDb } from '../../test/postgres.ts';
import { createTestQueue, seedOrganisations, type Seeded } from '../../test/fixtures.ts';
import { createDb, type Db } from '@ce/api/db/pool';
import { withOrganisation } from '@ce/api/db/with-organisation';
import { createJobQueue, startBoss } from '@ce/api/jobs/job-queue';

const TYPE = 'u1.lease-job';

/** NFR4.2: several workers never take the same job (pg-boss fetches with SKIP LOCKED). */
describe('job leases', () => {
  let t: TestDb;
  let s: Seeded;
  let db: Db;
  const bosses: PgBoss[] = [];

  beforeAll(async () => {
    t = await freshDatabase();
    s = await seedOrganisations(t);
    await createTestQueue(t, TYPE);
    db = createDb(t.url('ce_api'));
    for (let i = 0; i < 3; i++)
      bosses.push(await startBoss(t.url(i === 0 ? 'ce_api' : 'ce_worker'), 2));
  });
  afterAll(async () => {
    for (const boss of bosses) await boss.stop({ graceful: false, wait: true });
    await db?.destroy();
    await t?.close();
  });

  it('hands one job to exactly one of two workers taking at the same time', async () => {
    const [apiBoss, w1, w2] = bosses as [PgBoss, PgBoss, PgBoss];
    await withOrganisation(db, s.acme.organisationId, (trx) =>
      createJobQueue(apiBoss).enqueue(trx, TYPE, { n: 1 }),
    );
    const runs: string[] = [];
    const takeAll = async (name: string, boss: PgBoss) => {
      const queue = createJobQueue(boss);
      for (let i = 0; i < 10; i++) {
        for (const job of await queue.take([TYPE], 5)) {
          runs.push(name);
          await queue.complete(job.jobId);
        }
      }
    };
    await Promise.all([takeAll('w1', w1), takeAll('w2', w2)]);
    expect(runs).toHaveLength(1);
  });
});
