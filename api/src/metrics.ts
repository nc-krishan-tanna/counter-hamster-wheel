/**
 * Prometheus metrics of the api (observability design). Labels hold route templates, tool names
 * and outcomes only: never ids, content or the organisation.
 */
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

/** Seconds; lets later units read p95 against NFR2's 5 seconds (performance design). */
const BUCKETS = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

export function createApiMetrics() {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });
  return {
    registry,
    httpRequests: new Counter({
      name: 'http_requests_total',
      help: 'HTTP requests by method, route template and status',
      labelNames: ['method', 'route', 'status'] as const,
      registers: [registry],
    }),
    httpDuration: new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration by method, route template and status',
      labelNames: ['method', 'route', 'status'] as const,
      buckets: BUCKETS,
      registers: [registry],
    }),
    mcpToolDuration: new Histogram({
      name: 'mcp_tool_duration_seconds',
      help: 'MCP tool call duration by tool and outcome',
      labelNames: ['tool', 'outcome'] as const,
      buckets: BUCKETS,
      registers: [registry],
    }),
    proposalDecision: new Histogram({
      name: 'proposal_decision_seconds',
      help: 'Time from a proposal being raised to its decision, by outcome',
      labelNames: ['outcome'] as const,
      buckets: [60, 600, 3600, 4 * 3600, 24 * 3600, 3 * 24 * 3600, 7 * 24 * 3600],
      registers: [registry],
    }),
  };
}

export type ApiMetrics = ReturnType<typeof createApiMetrics>;
