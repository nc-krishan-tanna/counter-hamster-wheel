import { ApiProblem } from './api.ts';

/** C1 problem codes in plain words for the person on the page. */
const MESSAGES: Record<string, string> = {
  unauthenticated: 'Please sign in again.',
  forbidden: 'You are not allowed to do this.',
  'not-an-approver': 'Only an owner of this item can decide on this proposal.',
  'not-found': 'This was not found.',
  'validation-failed': 'Some fields need fixing; see the notes next to them.',
  'reason-required': 'Give a reason to reject this proposal.',
  'already-decided': 'This proposal has already been decided.',
  'proposal-out-of-date':
    'The item has changed since this proposal was made, so it cannot be approved.',
  'precondition-failed':
    'This proposal changed since you opened it. Reload the page and try again.',
  conflict: 'This form was already sent with different content. Reload the page and try again.',
  network: 'Could not reach the server. Try again.',
};

export function problemMessage(error: unknown): string {
  const code = error instanceof ApiProblem ? error.code : 'internal';
  return MESSAGES[code] ?? 'Something went wrong; nothing was changed. Try again.';
}
