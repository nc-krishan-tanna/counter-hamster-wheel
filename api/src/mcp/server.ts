/**
 * The MCP server (C2): three tools at /mcp over Streamable HTTP, thin wrappers over the same
 * domain operations as /v1, so their rules (organisation, roles, validation) apply unchanged.
 * Stateless: one server per request, no session kept in the process (NFR4.1).
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { ITEM_TYPES } from '@ce/db/schema';
import type { RouteContext } from '../app.ts';
import type { Principal } from '../access/principal.ts';
import { ProblemError, problemBody } from '../domain/errors.ts';
import { propose, type ProposalInput } from '../domain/propose.ts';
import { readItem, searchKnowledge } from '../domain/read.ts';
import { itemView } from '../views.ts';

/** The tool registry the CI isolation check reads (NFR14.3). */
export const TOOL_NAMES = ['search_knowledge', 'get_item', 'propose_change'] as const;

const ownerRef = z.object({ kind: z.enum(['user', 'group', 'agent']), ref_id: z.string().max(64) });
const linkRef = z.object({ toItemId: z.string().max(64), linkType: z.string().max(40) });

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

export function createMcpServer(
  ctx: RouteContext,
  principal: Principal,
  itemUrl: (itemId: string) => string,
) {
  const server = new McpServer({ name: 'context-engine', version: '1.0.0' });
  const { db, metrics } = ctx;

  /** Times each call; returns problems as `isError` with the C1 code (C2 errors). */
  const tool =
    <A>(name: (typeof TOOL_NAMES)[number], run: (args: A) => Promise<unknown>) =>
    async (args: A): Promise<ToolResult> => {
      const end = metrics.mcpToolDuration.startTimer({ tool: name });
      try {
        const result = await run(args);
        end({ outcome: 'ok' });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error) {
        const problem = error instanceof ProblemError ? error : new ProblemError('internal');
        end({ outcome: problem.code });
        if (!(error instanceof ProblemError)) ctx.logError(error);
        const { code, title, errors } = problemBody(problem) as {
          code: string;
          title: string;
          errors?: unknown;
        };
        return {
          isError: true,
          content: [
            { type: 'text', text: JSON.stringify({ code, title, ...(errors ? { errors } : {}) }) },
          ],
        };
      }
    };

  server.registerTool(
    'search_knowledge',
    {
      description:
        'Search approved organisational knowledge by title and content. Returns at most 50 items.',
      inputSchema: {
        query: z.string().max(200),
        type: z.enum(ITEM_TYPES).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    tool('search_knowledge', async (args: { query: string; type?: string; limit?: number }) => {
      const results = await searchKnowledge(db, principal, args.query, {
        type: args.type,
        limit: args.limit,
      });
      return {
        results: results.map((r) => ({
          itemId: r.itemId,
          title: r.title,
          type: r.type,
          status: 'approved',
          owners: r.owners.map((o) => ({ kind: o.kind, refId: o.ref_id, name: o.name })),
          sources: r.sources,
          lastReviewedAt: r.lastReviewedAt,
          url: itemUrl(r.itemId),
        })),
      };
    }),
  );

  server.registerTool(
    'get_item',
    {
      description:
        'Read one item: its approved version, owners, sources and links. Open proposals are listed apart as not yet approved.',
      inputSchema: { itemId: z.string().max(64) },
    },
    tool('get_item', async (args: { itemId: string }) => {
      const v = itemView(await readItem(db, principal, args.itemId));
      return {
        itemId: v.itemId,
        type: v.type,
        title: v.title,
        content: v.content,
        why: v.why,
        owners: v.owners,
        sources: v.sources,
        lastReviewedAt: v.lastReviewedAt,
        version: v.version,
        links: v.links,
        url: itemUrl(v.itemId),
        pendingProposals: v.openProposals.map((p) => ({
          proposalId: p.proposalId,
          kind: p.kind,
          origin: p.origin,
          reason: p.reason,
          changes: p.changes,
          status: 'not yet approved',
        })),
      };
    }),
  );

  server.registerTool(
    'propose_change',
    {
      description:
        'Propose a new item, a change, or a link change. Nothing changes until a human owner approves it. Repeat with the same idempotencyKey to get the same proposal.',
      inputSchema: {
        kind: z.enum(['create', 'change', 'add-link', 'remove-link']),
        itemId: z.string().max(64).optional(),
        baseVersionId: z.string().max(64).optional(),
        reason: z.string().max(10000),
        changes: z.object({
          title: z.string().max(200).optional(),
          type: z.string().max(40).optional(),
          content: z.string().max(100000).optional(),
          why: z.string().max(20000).nullable().optional(),
          owners: z.array(ownerRef).max(50).optional(),
          sources: z
            .array(z.object({ title: z.string().max(200), url: z.string().max(2000).optional() }))
            .max(50)
            .optional(),
          addLinks: z.array(linkRef).max(50).optional(),
          removeLinks: z.array(linkRef).max(50).optional(),
        }),
        idempotencyKey: z.string().min(1).max(200),
      },
    },
    tool('propose_change', async (args: ProposalInput & { idempotencyKey: string }) => {
      const { idempotencyKey, ...input } = args;
      const p = await propose(db, principal, input, { idempotencyKey, channel: 'mcp' });
      return {
        proposalId: p.proposalId,
        itemId: p.itemId,
        kind: p.kind,
        status: p.status,
        origin: p.origin,
        createdAt: p.createdAt,
      };
    }),
  );

  return server;
}

/** Handles one MCP HTTP request statelessly and returns the Fetch API response. */
export async function handleMcpRequest(
  ctx: RouteContext,
  principal: Principal,
  itemUrl: (itemId: string) => string,
  request: Request,
  parsedBody: unknown,
): Promise<Response> {
  const server = createMcpServer(ctx, principal, itemUrl);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request, { parsedBody });
  } finally {
    await server.close();
  }
}
