/**
 * Calls to the api on the page's own origin (Caddy routes /v1 and /api/auth), so no CORS is ever
 * needed. Errors arrive as C1 problem details.
 */
import { createAuthClient } from 'better-auth/react';

// Look `fetch` up on each call rather than once at load, like every other call on this page.
export const authClient = createAuthClient({
  fetchOptions: { customFetchImpl: (input, init) => fetch(input, init) },
});

export interface FieldError {
  field: string;
  message: string;
}

export class ApiProblem extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors: FieldError[];
  constructor(status: number, code: string, errors: FieldError[] = []) {
    super(code);
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

async function call<T>(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  let response: Response;
  try {
    response = await fetch(`/v1${path}`, {
      method,
      credentials: 'same-origin',
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiProblem(0, 'network');
  }
  const data = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (!response.ok) {
    const p = (data ?? {}) as { code?: string; errors?: FieldError[] };
    throw new ApiProblem(response.status, p.code ?? 'internal', p.errors ?? []);
  }
  return { data: data as T, etag: response.headers.get('etag') ?? '' };
}

export const api = {
  get: <T>(path: string) => call<T>('GET', path),
  post: <T>(path: string, body: unknown, headers?: Record<string, string>) =>
    call<T>('POST', path, body, headers),
};
