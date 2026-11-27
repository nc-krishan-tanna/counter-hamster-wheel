import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { freshDatabase, type TestDb } from '../../../test/postgres.ts';
import { seedEnv } from '../../../test/fixtures.ts';
import { apiConfig } from '../../src/config.ts';
import { startApi } from '../../src/main.ts';

describe('api entry point', () => {
  let t: TestDb;
  beforeAll(async () => {
    t = await freshDatabase();
  });
  afterAll(() => t?.close());

  it('reads its configuration, defaulting the ports', () => {
    const config = apiConfig({
      DATABASE_URL_API: 'postgres://x',
      BETTER_AUTH_SECRET: 's',
      PUBLIC_BASE_DOMAIN: 'localhost',
    });
    expect(config).toEqual({
      databaseUrl: 'postgres://x',
      authSecret: 's',
      baseDomain: 'localhost',
      publicPort: 443,
      port: 3000,
    });
    expect(
      apiConfig({
        DATABASE_URL_API: 'd',
        BETTER_AUTH_SECRET: 's',
        PUBLIC_BASE_DOMAIN: 'b',
        PUBLIC_PORT: '8443',
        PORT: '4000',
      }),
    ).toMatchObject({ publicPort: 8443, port: 4000 });
  });

  it('exits naming the missing variables (NFR5.2)', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => apiConfig({ DATABASE_URL_API: 'postgres://user:secret@x/y' })).toThrow('exit');
    expect(exit).toHaveBeenCalledWith(1);
    expect(error.mock.calls[0]![0]).toBe(
      'Missing required environment variables: BETTER_AUTH_SECRET, PUBLIC_BASE_DOMAIN',
    );
  });

  it('starts, answers health checks, and stops', async () => {
    const api = await startApi(
      {
        databaseUrl: t.url('ce_api'),
        authSecret: seedEnv().BETTER_AUTH_SECRET!,
        baseDomain: 'localhost',
        publicPort: 443,
        port: 0,
      },
      { write: () => undefined },
    );
    try {
      const address = api.app.server.address() as { port: number };
      expect((await fetch(`http://127.0.0.1:${address.port}/healthz`)).status).toBe(200);
      expect((await fetch(`http://127.0.0.1:${address.port}/readyz`)).status).toBe(200);
    } finally {
      await api.stop();
    }
  });

  it('stops gracefully on SIGTERM', async () => {
    const main = fileURLToPath(new URL('../../src/main.ts', import.meta.url));
    const child = spawn(process.execPath, [main], {
      env: {
        PATH: process.env.PATH,
        DATABASE_URL_API: t.url('ce_api'),
        BETTER_AUTH_SECRET: seedEnv().BETTER_AUTH_SECRET,
        PUBLIC_BASE_DOMAIN: 'localhost',
        PORT: '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    const exited = new Promise<number | null>((resolve) => child.on('exit', resolve));
    // Port 0: read the port the server reports, so no two runs ever collide.
    await expect
      .poll(() => /listening at http:\/\/127\.0\.0\.1:(\d+)/.exec(output)?.[1], { timeout: 15_000 })
      .toBeTruthy();
    const port = /listening at http:\/\/127\.0\.0\.1:(\d+)/.exec(output)![1];
    expect((await fetch(`http://127.0.0.1:${port}/healthz`)).status).toBe(200);
    child.kill('SIGTERM');
    expect(await exited, output).toBe(0);
  });
});
