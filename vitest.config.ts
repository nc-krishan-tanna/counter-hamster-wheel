import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/** A node-environment project whose integration tests share one PostgreSQL container per run. */
const nodeProject = (name: string, include: string[]) => ({
  test: {
    name,
    include,
    environment: 'node' as const,
    globalSetup: ['test/postgres.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});

export default defineConfig({
  test: {
    projects: [
      nodeProject('db', ['db/test/**/*.test.ts']),
      nodeProject('api', ['api/test/**/*.test.ts']),
      nodeProject('worker', ['worker/test/**/*.test.ts']),
      nodeProject('scripts', ['scripts/test/**/*.test.ts']),
      {
        plugins: [react()],
        test: {
          name: 'web',
          include: ['web/test/**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['web/test/setup.ts'],
        },
      },
      // The W7 end-to-end check runs only against a running stack (unit-test-instructions.md).
      ...(process.env.E2E_BASE_HOSTS
        ? [{ test: { name: 'e2e', include: ['e2e/**/*.test.ts'], testTimeout: 120_000 } }]
        : []),
    ],
    coverage: {
      enabled: true,
      provider: 'v8',
      include: ['db/src/**', 'api/src/**', 'worker/src/**', 'web/src/**'],
      // NFR11.2 / team Testing Contract: at least 80% lines overall and in each of api, worker and
      // web. The floor is set here and never lowered.
      thresholds: {
        lines: 80,
        'api/src/**': { lines: 80 },
        'worker/src/**': { lines: 80 },
        'web/src/**': { lines: 80 },
      },
    },
  },
});
