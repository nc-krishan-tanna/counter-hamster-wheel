import { describe, expect, it } from 'vitest';
import { collectFromRepo, findMissing } from '../check-isolation.ts';

/** NFR14.3: CI fails when a route or MCP tool has no isolation test. */
describe('isolation check', () => {
  const routes = ['GET /v1/items', 'POST /v1/proposals'];
  const tools = ['get_item'];

  it('passes when every route and tool has an isolation test', () => {
    const names = [
      'isolation: GET /v1/items',
      'isolation: POST /v1/proposals',
      'isolation: tool get_item',
    ];
    expect(findMissing({ routes, tools, testNames: names })).toEqual([]);
  });

  it('names each route and tool without one', () => {
    expect(findMissing({ routes, tools, testNames: ['isolation: GET /v1/items'] })).toEqual([
      'isolation: POST /v1/proposals',
      'isolation: tool get_item',
    ]);
  });

  it('finds every route of api/openapi/v1.yaml, every MCP tool, and passes on this repository', async () => {
    const found = await collectFromRepo();
    expect(found.routes).toContain('POST /v1/proposals/{proposalId}/decisions');
    expect(found.tools.sort()).toEqual(['get_item', 'propose_change', 'search_knowledge']);
    expect(findMissing(found)).toEqual([]);
  });
});
