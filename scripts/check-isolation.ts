/**
 * NFR14.3 CI check: every route in api/openapi/v1.yaml and every MCP tool must have an isolation
 * test named `isolation: <METHOD> <path>` or `isolation: tool <name>` under api/test/isolation/.
 * Exits 1 listing the missing ones.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

export function findMissing(input: {
  routes: string[];
  tools: string[];
  testNames: string[];
}): string[] {
  const names = new Set(input.testNames);
  return [
    ...input.routes.map((r) => `isolation: ${r}`),
    ...input.tools.map((t) => `isolation: tool ${t}`),
  ].filter((expected) => !names.has(expected));
}

export async function collectFromRepo(root = ROOT) {
  const doc = JSON.parse(readFileSync(join(root, 'api/openapi/v1.yaml'), 'utf8')) as {
    paths: Record<string, Record<string, unknown>>;
  };
  const routes = Object.entries(doc.paths).flatMap(([path, ops]) =>
    Object.keys(ops).map((method) => `${method.toUpperCase()} /v1${path}`),
  );
  const { TOOL_NAMES } = await import(join(root, 'api/src/mcp/server.ts'));
  const dir = join(root, 'api/test/isolation');
  const testNames = readdirSync(dir)
    .filter((f) => f.endsWith('.test.ts'))
    .flatMap((f) =>
      [...readFileSync(join(dir, f), 'utf8').matchAll(/['"`](isolation: [^'"`]+)['"`]/g)].map(
        (m) => m[1] ?? '',
      ),
    );
  return { routes, tools: [...(TOOL_NAMES as readonly string[])], testNames };
}

if (import.meta.main) {
  const missing = findMissing(await collectFromRepo());
  if (missing.length > 0) {
    console.error(
      `Missing isolation tests (NFR14.3):\n${missing.map((m) => `  - ${m}`).join('\n')}`,
    );
    process.exit(1);
  }
  console.log('Every route and MCP tool has an isolation test.');
}
