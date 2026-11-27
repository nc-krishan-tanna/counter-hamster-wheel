import { useState, type FormEvent } from 'react';
import { authClient } from '../api.ts';

/** Seeded sign-in for U1 (real sign-in comes in U2). */
export function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) setError('Email or password is wrong.');
      else onSignedIn();
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-label="Sign in">
      <h1>Sign in</h1>
      <label>
        Email
        <input
          data-testid="signin-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label>
        Password
        <input
          data-testid="signin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error && (
        <p role="alert" data-testid="signin-error">
          {error}
        </p>
      )}
      <button data-testid="signin-submit" type="submit" disabled={busy}>
        Sign in
      </button>
    </form>
  );
}
