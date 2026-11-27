import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ItemPage } from '../src/pages/ItemPage.tsx';
import { problem, stubFetch } from './fetch-stub.ts';

const ITEM = {
  itemId: 'i1',
  type: 'process',
  status: 'active',
  title: 'Onboarding',
  content: 'Every new starter gets a buddy.',
  why: 'People settle in faster',
  owners: [
    { kind: 'group', refId: 'g1', name: 'Owners' },
    { kind: 'agent', refId: 'a1', name: 'Acme agent' },
  ],
  sources: [
    { kind: 'manual', title: 'HR wiki', url: 'https://hr.example/onboarding' },
    { kind: 'system', title: 'Proposed by an AI agent', channel: 'mcp' },
  ],
  lastReviewedAt: '2026-11-20T10:00:00.000Z',
  version: {
    versionId: 'v2',
    versionNumber: 2,
    approvedBy: { id: 'u1', name: 'Acme owner' },
    approvedAt: '2026-11-20T10:00:00.000Z',
    selfApproved: false,
  },
  links: {
    outgoing: [{ linkId: 'l1', itemId: 'i2', title: 'Buddy scheme', linkType: 'depends-on' }],
    incoming: [{ linkId: 'l2', itemId: 'i3', title: 'HR handbook', linkType: 'part-of' }],
  },
  history: [
    {
      versionNumber: 2,
      reason: 'Add buddy',
      origin: 'ai-agent',
      proposer: { id: 'a1', name: 'Acme agent' },
      decider: { id: 'u1', name: 'Acme owner' },
      approvedAt: '2026-11-20T10:00:00.000Z',
      selfApproved: false,
    },
    {
      versionNumber: 1,
      reason: 'First write-up',
      origin: 'person',
      proposer: { id: 'u1', name: 'Acme owner' },
      decider: { id: 'u1', name: 'Acme owner' },
      approvedAt: '2026-11-19T10:00:00.000Z',
      selfApproved: true,
    },
  ],
  openProposals: [
    {
      proposalId: 'p3',
      kind: 'change',
      status: 'open',
      origin: 'person',
      reason: 'Shorter wording',
      proposer: { id: 'u2', name: 'Acme contributor' },
    },
  ],
  closedProposals: [
    {
      proposalId: 'p4',
      kind: 'change',
      status: 'rejected',
      origin: 'person',
      reason: 'Drop buddies',
      proposer: { id: 'u2', name: 'Acme contributor' },
      decision: { comment: 'Buddies help' },
    },
  ],
};

/** W5; AC3.5.1, BR4.1. */
describe('item page', () => {
  it('shows the approved version with owners, links both ways, sources and the last review', async () => {
    stubFetch({ 'GET /v1/items/i1': { body: ITEM, headers: { etag: '"v2"' } } });
    render(<ItemPage itemId="i1" />);
    expect((await screen.findByTestId('item-title')).textContent).toBe('Onboarding');
    expect(screen.getByTestId('item-content').textContent).toContain('buddy');
    expect(screen.getByTestId('item-why').textContent).toContain('settle in');
    expect(screen.getByTestId('item-owners').textContent).toMatch(/Owners.*Acme agent/);
    expect(screen.getByTestId('item-links-out').textContent).toMatch(/depends-on.*Buddy scheme/);
    expect(screen.getByTestId('item-links-in').textContent).toMatch(/HR handbook.*part-of/);
    expect(screen.getByTestId('item-sources').textContent).toContain('HR wiki');
    expect(screen.getByTestId('item-last-reviewed').textContent).toContain('2026');
  });

  it('shows the full history with proposer, decider, reason and the self-approved mark', async () => {
    stubFetch({ 'GET /v1/items/i1': { body: ITEM } });
    render(<ItemPage itemId="i1" />);
    const history = await screen.findByTestId('item-history');
    const rows = within(history).getAllByTestId('history-entry');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.textContent).toMatch(/Acme agent.*AI agent.*Acme owner.*Add buddy/);
    expect(rows[1]!.textContent).toContain('self-approved');
    expect(rows[0]!.textContent).not.toContain('self-approved');
    expect(screen.getByTestId('item-closed-proposals').textContent).toMatch(
      /rejected.*Drop buddies.*Buddies help/,
    );
  });

  it('lists open proposals apart, marked not yet approved', async () => {
    stubFetch({ 'GET /v1/items/i1': { body: ITEM } });
    render(<ItemPage itemId="i1" />);
    const open = await screen.findByTestId('item-open-proposals');
    expect(open.textContent).toMatch(/not yet approved/i);
    expect(open.textContent).toContain('Shorter wording');
    expect(within(open).getByTestId('open-proposal-link').getAttribute('href')).toBe(
      '#/proposals/p3',
    );
  });

  it('shows a not-found view', async () => {
    stubFetch({ 'GET /v1/items/nope': problem(404, 'not-found') });
    render(<ItemPage itemId="nope" />);
    expect((await screen.findByTestId('item-not-found')).textContent).toMatch(/not found/i);
  });
});
