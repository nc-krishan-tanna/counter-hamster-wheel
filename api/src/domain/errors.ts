/**
 * C1 problem codes (RFC 9457). `detail` is fixed per code, never built from request content
 * (NFR6.1). `precondition-failed` is an additive C1 code for the `412` of a stale If-Match.
 */
export const PROBLEMS = {
  unauthenticated: {
    status: 401,
    title: 'Unauthenticated',
    detail: 'Sign in or send a valid token.',
  },
  forbidden: { status: 403, title: 'Forbidden', detail: 'You are not allowed to do this.' },
  'not-an-approver': {
    status: 403,
    title: 'Not an approver',
    detail: 'Only a human owner of the item can decide on this proposal.',
  },
  'not-found': { status: 404, title: 'Not found', detail: 'Nothing was found at this address.' },
  'validation-failed': {
    status: 422,
    title: 'Validation failed',
    detail: 'Some fields are missing or not valid; see errors.',
  },
  'reason-required': {
    status: 422,
    title: 'Reason required',
    detail: 'A reason is needed to reject a proposal.',
  },
  'proposal-out-of-date': {
    status: 409,
    title: 'Proposal out of date',
    detail:
      'The item changed since this proposal was made; raise it again against the current version.',
  },
  'already-decided': {
    status: 409,
    title: 'Already decided',
    detail: 'This proposal has already been decided.',
  },
  conflict: {
    status: 409,
    title: 'Conflict',
    detail: 'This idempotency key was already used for a different request.',
  },
  'precondition-failed': {
    status: 412,
    title: 'Precondition failed',
    detail: 'The proposal changed since you loaded it; reload and try again.',
  },
  'dependency-unavailable': {
    status: 503,
    title: 'Dependency unavailable',
    detail: 'A service this needs is unavailable; try again.',
  },
  internal: {
    status: 500,
    title: 'Internal error',
    detail: 'Something went wrong; nothing was changed. Try again.',
  },
} as const;

export type ProblemCode = keyof typeof PROBLEMS;

export interface FieldError {
  field: string;
  message: string;
}

export class ProblemError extends Error {
  readonly code: ProblemCode;
  readonly status: number;
  readonly errors: FieldError[];
  constructor(code: ProblemCode, errors: FieldError[] = []) {
    super(PROBLEMS[code].title);
    this.code = code;
    this.status = PROBLEMS[code].status;
    this.errors = errors;
  }
}

export const notFound = () => new ProblemError('not-found');

/** The RFC 9457 body for a problem (shared by the HTTP error handler and MCP tool errors). */
export function problemBody(error: ProblemError, instance?: string) {
  const p = PROBLEMS[error.code];
  return {
    type: `about:blank#${error.code}`,
    title: p.title,
    status: p.status,
    detail: p.detail,
    code: error.code,
    ...(instance ? { instance } : {}),
    ...(error.errors.length > 0 ? { errors: error.errors } : {}),
  };
}
