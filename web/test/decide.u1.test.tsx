import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Decide } from '../src/pages/Decide.tsx';
import { bodyOf, problem, stubFetch } from './fetch-stub.ts';

const PROPOSAL = {
  proposal: {
    proposalId: 'p1',
    kind: 'change',
    itemId: 'i1',
    status: 'open',
    origin: 'ai-agent',
    reason: 'Newer rule',
    proposer: { id: 'a1', name: 'Acme agent' },
    changes: { content: 'Book leave three weeks ahead' },
  },
  currentVersion: {
    versionId: 'v1',
    title: 'Holiday rules',
    content: 'Book leave two weeks ahead',
  },
};

const load = { 'GET /v1/proposals/p1': { body: PROPOSAL, headers: { etag: '"p1:open"' } } };

/** W4; AC2.4.1 to AC2.4.4. */
describe('decide page', () => {
  it('shows the proposed change beside the current version', async () => {
    stubFetch(load);
    render(<Decide proposalId="p1" onDecided={vi.fn()} />);
    expect((await screen.findByTestId('decide-current')).textContent).toContain('two weeks');
    expect(screen.getByTestId('decide-proposed').textContent).toContain('three weeks');
    expect(screen.getByTestId('decide-reason').textContent).toContain('Newer rule');
  });

  it('approves with an optional comment, sending the ETag as If-Match', async () => {
    const fetch = stubFetch({
      ...load,
      'POST /v1/proposals/p1/decisions': {
        status: 201,
        body: { decision: { outcome: 'approved' } },
      },
    });
    const onDecided = vi.fn();
    render(<Decide proposalId="p1" onDecided={onDecided} />);
    await userEvent.type(await screen.findByTestId('decide-comment'), 'Thanks');
    await userEvent.click(screen.getByTestId('decide-approve'));
    await vi.waitFor(() => expect(onDecided).toHaveBeenCalledWith('approved'));
    const { body, headers } = bodyOf(fetch, 'POST /v1/proposals/p1/decisions');
    expect(body).toEqual({ outcome: 'approve', comment: 'Thanks' });
    expect(headers.get('if-match')).toBe('"p1:open"');
  });

  it('requires a reason to reject', async () => {
    const fetch = stubFetch({
      ...load,
      'POST /v1/proposals/p1/decisions': { status: 201, body: {} },
    });
    render(<Decide proposalId="p1" onDecided={vi.fn()} />);
    await userEvent.click(await screen.findByTestId('decide-reject'));
    expect((await screen.findByTestId('decide-message')).textContent).toMatch(/reason/i);
    expect(fetch).toHaveBeenCalledTimes(1);
    await userEvent.type(screen.getByTestId('decide-comment'), 'Not accurate');
    await userEvent.click(screen.getByTestId('decide-reject'));
    await vi.waitFor(() =>
      expect(bodyOf(fetch, 'POST /v1/proposals/p1/decisions').body).toEqual({
        outcome: 'reject',
        comment: 'Not accurate',
      }),
    );
  });

  it.each([
    [problem(403, 'not-an-approver'), /only an owner/i],
    [problem(409, 'already-decided'), /already been decided/i],
    [problem(409, 'proposal-out-of-date'), /item has changed/i],
    [problem(412, 'precondition-failed'), /changed since you opened/i],
  ])('explains a refusal in plain words (%#)', async (reply, words) => {
    stubFetch({ ...load, 'POST /v1/proposals/p1/decisions': reply });
    render(<Decide proposalId="p1" onDecided={vi.fn()} />);
    await userEvent.click(await screen.findByTestId('decide-approve'));
    expect((await screen.findByTestId('decide-message')).textContent).toMatch(words);
  });
});
