import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../src/App.tsx';
import { authClient } from '../src/api.ts';
import { stubFetch } from './fetch-stub.ts';

const SESSION = {
  session: { id: 's', userId: 'u1', expiresAt: '2099-01-01T00:00:00.000Z' },
  user: { id: 'u1', email: 'owner@acme.example', name: 'Acme owner' },
};
const ITEM = {
  itemId: 'i1',
  type: 'process',
  title: 'Routed item',
  content: 'c',
  why: null,
  owners: [],
  sources: [],
  lastReviewedAt: null,
  version: { versionNumber: 1 },
  links: { outgoing: [], incoming: [] },
  history: [],
  openProposals: [],
  closedProposals: [],
};

const signedIn = {
  'GET /api/auth/get-session': { body: SESSION },
  'GET /v1/items': {
    body: { items: [{ itemId: 'i1', type: 'process', title: 'Listed item' }], nextCursor: null },
  },
  'GET /v1/proposals': {
    body: {
      proposals: [
        { proposalId: 'p1', kind: 'change', reason: 'Listed proposal', origin: 'ai-agent' },
      ],
    },
  },
  'GET /v1/items/i1': { body: ITEM },
  'GET /v1/proposals/p1': {
    body: {
      proposal: {
        proposalId: 'p1',
        kind: 'change',
        status: 'open',
        origin: 'person',
        reason: 'r',
        proposer: { id: 'u2', name: null },
        changes: {},
      },
      currentVersion: null,
    },
    headers: { etag: '"p1:open"' },
  },
};

describe('page routing', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it.each([
    ['#/items', 'item-list', 'Listed item'],
    ['#/items/new', 'new-item-title', ''],
    ['#/items/i1', 'item-title', 'Routed item'],
    ['#/proposals/p1', 'decide-approve', 'Approve'],
  ])('%s shows its page', async (hash, testId, text) => {
    window.location.hash = hash;
    stubFetch(signedIn);
    render(<App />);
    const element = await screen.findByTestId(testId);
    await expect.poll(() => element.textContent).toContain(text);
    expect(screen.getByTestId('signout')).toBeTruthy();
  });

  it('shows the sign-in page without a session', async () => {
    stubFetch({
      'GET /api/auth/get-session': { body: null },
      'POST /api/auth/sign-out': { body: { success: true } },
    });
    // The client keeps one session store per page; ask it to read the session again.
    authClient.$store.notify('$sessionSignal');
    render(<App />);
    expect(await screen.findByTestId('signin-email')).toBeTruthy();
  });
});
