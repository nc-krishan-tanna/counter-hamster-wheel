import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NewItem } from '../src/pages/NewItem.tsx';
import { bodyOf, problem, stubFetch } from './fetch-stub.ts';

const GROUP = '7f1c2c1e-1111-4a4a-9a9a-000000000001';

async function fillForm() {
  await userEvent.type(screen.getByTestId('new-item-title'), 'Purchase approval');
  await userEvent.selectOptions(screen.getByTestId('new-item-type'), 'business-rule-or-policy');
  await userEvent.type(screen.getByTestId('new-item-content'), 'Two approvals over 1000.');
  await userEvent.type(screen.getByTestId('new-item-why'), 'Fraud control');
  await userEvent.type(screen.getByTestId('new-item-owners'), `group:${GROUP}`);
  await userEvent.type(screen.getByTestId('new-item-source-title'), 'Finance handbook');
  await userEvent.type(
    screen.getByTestId('new-item-source-url'),
    'https://handbook.example/finance',
  );
  await userEvent.type(screen.getByTestId('new-item-reason'), 'Asked every week');
}

/** W1; AC2.1.1, AC2.1.2. */
describe('new item page', () => {
  it('posts a create proposal with an idempotency key and reports it is waiting for approval', async () => {
    const fetch = stubFetch({
      'POST /v1/proposals': {
        status: 201,
        body: { proposalId: 'p1', itemId: 'i1', status: 'open' },
      },
    });
    const onCreated = vi.fn();
    render(<NewItem onCreated={onCreated} />);
    await fillForm();
    await userEvent.click(screen.getByTestId('new-item-submit'));
    await vi.waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ proposalId: 'p1' })),
    );
    const { body, headers } = bodyOf(fetch, 'POST /v1/proposals');
    expect(headers.get('idempotency-key')).toMatch(/^[0-9a-f-]{36}$/);
    expect(body).toEqual({
      kind: 'create',
      reason: 'Asked every week',
      changes: {
        title: 'Purchase approval',
        type: 'business-rule-or-policy',
        content: 'Two approvals over 1000.',
        why: 'Fraud control',
        owners: [{ kind: 'group', ref_id: GROUP }],
        sources: [{ title: 'Finance handbook', url: 'https://handbook.example/finance' }],
      },
    });
  });

  it('names each field the server refused and keeps the typed text', async () => {
    const fetch = stubFetch({
      'POST /v1/proposals': problem(422, 'validation-failed', [
        { field: 'title', message: 'Required.' },
        { field: 'owners[0]', message: 'Unknown or deactivated group.' },
      ]),
    });
    render(<NewItem onCreated={vi.fn()} />);
    await userEvent.type(screen.getByTestId('new-item-content'), 'Text I do not want to lose');
    await userEvent.type(screen.getByTestId('new-item-owners'), 'group:nope');
    await userEvent.click(screen.getByTestId('new-item-submit'));
    expect((await screen.findByTestId('error-title')).textContent).toContain('Required');
    expect(screen.getByTestId('error-owners').textContent).toContain(
      'Unknown or deactivated group',
    );
    expect((screen.getByTestId('new-item-content') as HTMLTextAreaElement).value).toBe(
      'Text I do not want to lose',
    );

    // A retry reuses the same idempotency key (C1).
    await userEvent.click(screen.getByTestId('new-item-submit'));
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(bodyOf(fetch, 'POST /v1/proposals', 1).headers.get('idempotency-key')).toBe(
      bodyOf(fetch, 'POST /v1/proposals', 0).headers.get('idempotency-key'),
    );
  });

  it('refuses an owner entry it cannot read before sending anything', async () => {
    const fetch = stubFetch({});
    render(<NewItem onCreated={vi.fn()} />);
    await userEvent.type(screen.getByTestId('new-item-owners'), 'someone');
    await userEvent.click(screen.getByTestId('new-item-submit'));
    expect((await screen.findByTestId('error-owners')).textContent).toMatch(/user:|group:|agent:/);
    expect(fetch).not.toHaveBeenCalled();
  });
});
