import { vi } from 'vitest';

type Reply = { status?: number; body?: unknown; headers?: Record<string, string> };
type Handler = (init: RequestInit & { url: string }) => Reply;

/**
 * Stubs `fetch` at the API boundary only (unit-test instructions): each key is `METHOD /path`
 * (query strings ignored); anything else fails the test. Problems use the C1 shape.
 */
export function stubFetch(routes: Record<string, Reply | Handler>) {
  const mock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const request = input instanceof Request ? input : undefined;
    const url = new URL(request?.url ?? String(input), 'http://acme.localhost');
    const method = (request?.method ?? init.method ?? 'GET').toUpperCase();
    const route = routes[`${method} ${url.pathname}`];
    if (!route) throw new Error(`unexpected fetch ${method} ${url.pathname}`);
    const body = request ? await request.clone().text() : init.body;
    const reply =
      typeof route === 'function'
        ? route({ ...init, method, body: body as BodyInit, url: url.toString() })
        : route;
    const status = reply.status ?? 200;
    const json = status >= 400 ? 'application/problem+json' : 'application/json';
    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
      status,
      headers: { 'content-type': json, ...reply.headers },
    });
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

export const problem = (
  status: number,
  code: string,
  errors?: { field: string; message: string }[],
): Reply => ({
  status,
  body: {
    type: `about:blank#${code}`,
    title: code,
    status,
    code,
    detail: 'fixed text',
    ...(errors ? { errors } : {}),
  },
});

/** The JSON body of the n-th call to `METHOD /path`. */
export function bodyOf(mock: ReturnType<typeof stubFetch>, key: string, n = 0) {
  const [method, path] = key.split(' ');
  const calls = mock.mock.calls.filter(([input, init]) => {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      'http://acme.localhost',
    );
    return url.pathname === path && (init?.method ?? 'GET').toUpperCase() === method;
  });
  const init = calls[n]?.[1];
  return {
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
    headers: new Headers(init?.headers),
  };
}
