/**
 * U1's /v1 routes (C1), each validated against `api/openapi/v1.yaml`. Handlers are thin: the
 * domain modules check, decide and run every query inside `withOrganisation`.
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ProposalStatus } from '@ce/db/schema';
import type { RouteContext } from '../app.ts';
import type { Principal } from '../access/principal.ts';
import { decide } from '../domain/decide.ts';
import { ProblemError } from '../domain/errors.ts';
import { propose, type ProposalInput } from '../domain/propose.ts';
import {
  getVisibleProposal,
  itemVersions,
  listItemsPage,
  listVisibleProposals,
  readItem,
  searchKnowledge,
} from '../domain/read.ts';
import { fastifyPath, routeSchema } from '../openapi.ts';
import { historyView, itemView, proposalView } from '../views.ts';

function principalOf(request: FastifyRequest): Principal {
  if (!request.principal) throw new ProblemError('unauthenticated');
  return request.principal;
}

export function registerV1Routes(app: FastifyInstance, ctx: RouteContext) {
  const { db } = ctx;
  const route = (method: 'get' | 'post', path: string) => ({
    url: fastifyPath(path),
    method: method.toUpperCase() as 'GET' | 'POST',
    schema: routeSchema(path, method),
  });

  app.route({
    ...route('get', '/items'),
    handler: async (request) => {
      const q = request.query as { limit: number; cursor?: string; type?: string };
      return listItemsPage(db, principalOf(request), q);
    },
  });

  app.route({
    ...route('get', '/items/{itemId}'),
    handler: async (request, reply) => {
      const { itemId } = request.params as { itemId: string };
      const read = await readItem(db, principalOf(request), itemId);
      return reply.header('etag', read.etag).send(itemView(read));
    },
  });

  app.route({
    ...route('get', '/items/{itemId}/versions'),
    handler: async (request) => {
      const { itemId } = request.params as { itemId: string };
      const versions = await itemVersions(db, principalOf(request), itemId);
      return { versions: versions.map((v) => historyView(v, {})) };
    },
  });

  app.route({
    ...route('get', '/proposals'),
    handler: async (request) => {
      const q = request.query as { status?: ProposalStatus; limit: number };
      const proposals = await listVisibleProposals(db, principalOf(request), q);
      return { proposals: proposals.map((p) => proposalView(p)) };
    },
  });

  app.route({
    ...route('post', '/proposals'),
    handler: async (request, reply) => {
      const proposal = await propose(db, principalOf(request), request.body as ProposalInput, {
        idempotencyKey: request.headers['idempotency-key'] as string,
        channel: 'web',
      });
      return reply.code(201).send(proposalView(proposal));
    },
  });

  app.route({
    ...route('get', '/proposals/{proposalId}'),
    handler: async (request, reply) => {
      const { proposalId } = request.params as { proposalId: string };
      const view = await getVisibleProposal(db, principalOf(request), proposalId);
      return reply.header('etag', view.etag).send({
        proposal: proposalView(view.proposal),
        currentVersion: view.currentVersion,
        baseVersion: view.baseVersion,
      });
    },
  });

  app.route({
    ...route('post', '/proposals/{proposalId}/decisions'),
    handler: async (request, reply) => {
      const { proposalId } = request.params as { proposalId: string };
      const body = request.body as { outcome: 'approve' | 'reject'; comment?: string };
      const result = await decide(db, principalOf(request), {
        proposalId,
        outcome: body.outcome,
        comment: body.comment,
        ifMatch: request.headers['if-match'] as string,
      });
      ctx.metrics.proposalDecision
        .labels(result.decision.outcome)
        .observe(
          (result.decision.decidedAt.getTime() - result.proposal.createdAt.getTime()) / 1000,
        );
      return reply.code(201).send({
        decision: result.decision,
        proposal: proposalView(result.proposal),
        versionId: result.versionId ?? null,
      });
    },
  });

  app.route({
    ...route('get', '/query/search'),
    handler: async (request) => {
      const q = request.query as { q: string; type?: string; limit: number };
      return {
        results: await searchKnowledge(db, principalOf(request), q.q, {
          type: q.type,
          limit: q.limit,
        }),
      };
    },
  });
}
