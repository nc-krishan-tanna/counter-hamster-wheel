/**
 * NFR5.5: a cookie-authenticated write must come from the organisation's own origin. Bearer-token
 * calls are not affected; U2 adds the rest of the CSRF work.
 */
import { ProblemError } from '../domain/errors.ts';

const WRITES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface OriginSettings {
  address: string;
  baseDomain: string;
  /** Caddy's published HTTPS port; the origin carries it unless it is 443. */
  publicPort: number;
}

export const expectedOrigin = ({ address, baseDomain, publicPort }: OriginSettings) =>
  `https://${address}.${baseDomain}${publicPort === 443 ? '' : `:${publicPort}`}`;

export function checkOrigin(
  input: OriginSettings & { method: string; via: 'session' | 'bearer'; origin: string | undefined },
) {
  if (input.via !== 'session' || !WRITES.has(input.method.toUpperCase())) return;
  if (input.origin !== expectedOrigin(input)) throw new ProblemError('forbidden');
}
