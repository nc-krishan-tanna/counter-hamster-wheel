/**
 * The api's Fastify application: health and metrics outside the chain, Better Auth's routes behind
 * the organisation hook, and /v1 and /mcp behind organisation, authentication and Origin hooks.
 */
import { randomUUID } from 'node:crypto';
import Fastify, {
  LogController,
  type FastifyError,
  type FastifyInstance,
  type FastifyReply,
} from 'fastify';
import type { Auth } from '@ce/db/auth';
import type { Principal } from './access/principal.ts';
import { expectedOrigin } from './access/origin.ts';
import type { Db } from './db/pool.ts';
import { ProblemError, problemBody, type FieldError } from './domain/errors.ts';
import { registerHealth } from './health.ts';
import {
  authenticationHook,
  organisationHook,
  originHook,
  type AccessConfig,
} from './hooks/access.ts';
import { handleMcpRequest } from './mcp/server.ts';
import { createApiMetrics, type ApiMetrics } from './metrics.ts';
import { documentedPath } from './openapi.ts';
import type { Organisation } from './repo/organisations.ts';
import { registerV1Routes } from './routes/v1.ts';
import { sendWebResponse, toWebRequest } from './web-request.ts';

declare module 'fastify' {
  interface FastifyRequest {
    organisation?: Organisation;
    principal?: Principal;
  }
  interface FastifyInstance {
    /** `METHOD /path` of every route, with documented `{param}` paths (OpenAPI check). */
    registeredRoutes: string[];
  }
}

export interface AppDeps {
  db: Db;
  auth: Auth;
  config: AccessConfig;
  metrics?: ApiMetrics;
  /** Where JSON log lines go (stdout by default). */
  logStream?: { write(line: string): void };
}

/** What route and tool modules receive: never the raw pool for queries of their own. */
export interface RouteContext {
  db: Db;
  metrics: ApiMetrics;
  logError(error: unknown): void;
}

const REQUEST_ID = /^[A-Za-z0-9-]{1,64}$/;

function sendProblem(reply: FastifyReply, error: ProblemError) {
  return reply
    .code(error.status)
    .type('application/problem+json')
    .send(problemBody(error, reply.request.id));
}

/** Field names from Fastify's schema errors: `/changes/title` gives `changes.title`. */
function validationErrors(error: FastifyError): FieldError[] {
  return (error.validation ?? []).map((v) => {
    const path = v.instancePath.replace(/^\//, '').replace(/\//g, '.');
    const missing = (v.params as { missingProperty?: string }).missingProperty;
    return {
      field: [path, missing].filter(Boolean).join('.') || (error.validationContext ?? 'request'),
      message: v.message ?? 'Not valid.',
    };
  });
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const metrics = deps.metrics ?? createApiMetrics();
  const app = Fastify({
    logger: {
      level: 'info',
      ...(deps.logStream ? { stream: deps.logStream } : {}),
      // Never log credentials (NFR6.1); bodies and query strings are never logged at all.
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    // Fastify's own per-request lines are off; the onResponse hook writes the one line we want.
    logController: new LogController({ disableRequestLogging: true }),
    genReqId: (req) => {
      const given = req.headers['x-request-id'];
      return typeof given === 'string' && REQUEST_ID.test(given) ? given : randomUUID();
    },
    ajv: { customOptions: { allErrors: true } },
  });

  const logError = (error: unknown) => {
    // Code and stack frames only: an error message can quote the input (NFR6.1).
    const e = error as { code?: string; name?: string; stack?: string };
    app.log.error(
      { errCode: e.code, errName: e.name, stack: e.stack?.split('\n').slice(1).join('\n') },
      'request failed',
    );
  };
  const ctx: RouteContext = { db: deps.db, metrics, logError };

  app.decorate('registeredRoutes', [] as string[]);
  app.addHook('onRoute', (route) => {
    for (const method of ([] as string[]).concat(route.method))
      app.registeredRoutes.push(`${method} ${documentedPath(route.url ?? route.path)}`);
  });

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });
  // One line and one sample per completed request (NFR13.2, NFR2.1).
  app.addHook('onResponse', async (request, reply) => {
    const route = request.routeOptions.url ?? 'unmatched';
    const labels = { method: request.method, route, status: String(reply.statusCode) };
    metrics.httpRequests.inc(labels);
    metrics.httpDuration.observe(labels, reply.elapsedTime / 1000);
    request.log.info(
      {
        org: request.organisation?.organisationId,
        method: request.method,
        route,
        status: reply.statusCode,
        ms: Math.round(reply.elapsedTime),
      },
      'request',
    );
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof ProblemError) return sendProblem(reply, error);
    if (error.validation)
      return sendProblem(reply, new ProblemError('validation-failed', validationErrors(error)));
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      // Malformed JSON, wrong content type, body too large: the request itself is not valid.
      return sendProblem(
        reply,
        new ProblemError('validation-failed', [
          { field: 'body', message: 'Not a valid request body.' },
        ]),
      );
    }
    logError(error);
    return sendProblem(reply, new ProblemError('internal'));
  });
  app.setNotFoundHandler((_request, reply) => sendProblem(reply, new ProblemError('not-found')));

  registerHealth(app, { db: deps.db, registry: metrics.registry });

  await app.register(async (scoped) => {
    scoped.addHook('onRequest', organisationHook(deps.db, deps.config));

    // Better Auth's own routes (sign-in, sign-out, session); it checks its trusted origins itself.
    scoped.route({
      method: ['GET', 'POST'],
      url: '/api/auth/*',
      handler: async (request, reply) =>
        sendWebResponse(reply, await deps.auth.handler(toWebRequest(request))),
    });

    await scoped.register(async (secured) => {
      secured.addHook('onRequest', authenticationHook(deps.db, deps.auth));
      secured.addHook('onRequest', originHook(deps.config));
      registerV1Routes(secured, ctx);

      // MCP is for agents' bearer tokens (C2).
      secured.post('/mcp', async (request, reply) => {
        const principal = request.principal;
        if (!principal || principal.kind !== 'service-account')
          throw new ProblemError('unauthenticated');
        const origin = expectedOrigin({
          address: request.organisation?.address ?? '',
          ...deps.config,
        });
        const response = await handleMcpRequest(
          ctx,
          principal,
          (id) => `${origin}/#/items/${id}`,
          toWebRequest(request),
          request.body,
        );
        return sendWebResponse(reply, response);
      });
    });
  });

  return app;
}
