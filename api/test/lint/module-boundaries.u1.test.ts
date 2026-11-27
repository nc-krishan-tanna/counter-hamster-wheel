import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { RouteContext } from '../../src/app.ts';
import type { Db } from '../../src/db/pool.ts';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const eslint = new ESLint({ cwd: ROOT });

/** The `no-restricted-imports` messages ESLint reports for `code` saved at `path`. */
async function restricted(path: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath: `${ROOT}${path}` });
  return (result?.messages ?? []).filter((m) => m.ruleId === 'no-restricted-imports');
}

/**
 * Review R-02, security design: route handlers and MCP tools get their database handle only from
 * withOrganisation; the raw Db stays inside domain/, repo/, access/ and db/.
 */
describe('database module boundary', () => {
  it('gives routes and tools no raw database handle in their context', () => {
    expectTypeOf<RouteContext>().not.toHaveProperty('db');
    expectTypeOf<Extract<RouteContext[keyof RouteContext], Db>>().toBeNever();
  });

  for (const dir of ['api/src/routes', 'api/src/mcp']) {
    it(`refuses the pool, Kysely and pg in ${dir}, even as types`, async () => {
      for (const code of [
        "import type { Db } from '../db/pool.ts';\nexport type X = Db;\n",
        "import type { Db } from '@ce/api/db/pool';\nexport type X = Db;\n",
        "import type { Kysely } from 'kysely';\nexport type X = Kysely<object>;\n",
        "import pg from 'pg';\nexport const x = pg;\n",
      ]) {
        expect(await restricted(`${dir}/fixture.ts`, code), code).toHaveLength(1);
      }
    });

    it(`allows withOrganisation's types in ${dir}`, async () => {
      const code =
        "import type { OrgTransaction } from '../db/with-organisation.ts';\nexport type X = OrgTransaction;\n";
      expect(await restricted(`${dir}/fixture.ts`, code)).toEqual([]);
    });
  }

  it('lets the domain layer use the raw handle', async () => {
    const code = "import type { Db } from '../db/pool.ts';\nexport type X = Db;\n";
    expect(await restricted('api/src/domain/fixture.ts', code)).toEqual([]);
  });
});
