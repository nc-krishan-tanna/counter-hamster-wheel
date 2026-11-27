import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SignIn } from '../src/pages/SignIn.tsx';
import { stubFetch } from './fetch-stub.ts';

describe('sign-in page', () => {
  it('signs in with the seeded email and password through Better Auth', async () => {
    const fetch = stubFetch({
      'POST /api/auth/sign-in/email': {
        body: { token: 't', user: { id: 'u1', email: 'owner@acme.example' } },
      },
    });
    const onSignedIn = vi.fn();
    render(<SignIn onSignedIn={onSignedIn} />);
    await userEvent.type(screen.getByTestId('signin-email'), 'owner@acme.example');
    await userEvent.type(screen.getByTestId('signin-password'), 'correct horse');
    await userEvent.click(screen.getByTestId('signin-submit'));
    await vi.waitFor(() => expect(onSignedIn).toHaveBeenCalled());
    const sent = fetch.mock.calls[0]!;
    const body =
      sent[0] instanceof Request ? await sent[0].clone().json() : JSON.parse(String(sent[1]?.body));
    expect(body).toMatchObject({ email: 'owner@acme.example', password: 'correct horse' });
  });

  it('shows an error and stays on the page for a wrong password', async () => {
    stubFetch({
      'POST /api/auth/sign-in/email': {
        status: 401,
        body: { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' },
      },
    });
    const onSignedIn = vi.fn();
    render(<SignIn onSignedIn={onSignedIn} />);
    await userEvent.type(screen.getByTestId('signin-email'), 'owner@acme.example');
    await userEvent.type(screen.getByTestId('signin-password'), 'wrong');
    await userEvent.click(screen.getByTestId('signin-submit'));
    expect((await screen.findByTestId('signin-error')).textContent).toMatch(/email or password/i);
    expect(onSignedIn).not.toHaveBeenCalled();
    expect((screen.getByTestId('signin-email') as HTMLInputElement).value).toBe(
      'owner@acme.example',
    );
  });
});
