import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { createAuth, type Auth } from '@ce/db/auth';
import { addressFromHost, resolveOrganisation } from '../../src/access/organisation.ts';
import { checkOrigin, expectedOrigin } from '../../src/access/origin.ts';
import { resolvePrincipal } from '../../src/access/principal.ts';
import { domainFixture, type DomainFixture } from './setup.ts';

/** BR6.1: the organisation comes from the address, and the credential must belong to it. */
describe('access', () => {
  let f: DomainFixture;
  let pool: pg.Pool;
  let auth: Auth;
  let acme: { organisationId: string; address: string; status: string };
  let globex: { organisationId: string; address: string; status: string };

  beforeAll(async () => {
    f = await domainFixture();
    pool = new pg.Pool({ connectionString: f.t.url('ce_api') });
    auth = createAuth({ pool, secret: f.s.env.BETTER_AUTH_SECRET! });
    acme = await resolveOrganisation(f.db, 'acme.localhost', 'localhost');
    globex = await resolveOrganisation(f.db, 'globex.localhost:8443', 'localhost');
  });
  afterAll(async () => {
    await pool?.end();
    await f?.close();
  });

  const cookieFor = async (email: string, password: string) => {
    const { headers } = await auth.api.signInEmail({
      body: { email, password },
      returnHeaders: true,
    });
    const setCookie = headers.get('set-cookie') ?? '';
    return setCookie.split(';')[0]!;
  };

  describe('organisation from the host', () => {
    it.each([
      ['acme.localhost', 'acme'],
      ['acme.localhost:8443', 'acme'],
      ['ACME.localhost', 'acme'],
      ['e2e-a.service.example', null],
      ['localhost', null],
      ['a.b.localhost', null],
      ['-bad.localhost', null],
      ['', null],
    ])('%s gives %s', (host, address) => {
      expect(addressFromHost(host, 'localhost')).toBe(address);
    });

    it('resolves a known address and refuses an unknown one as not found', async () => {
      expect(acme).toMatchObject({ organisationId: f.s.acme.organisationId, status: 'active' });
      expect(globex.organisationId).toBe(f.s.globex.organisationId);
      await expect(
        resolveOrganisation(f.db, 'nobody.localhost', 'localhost'),
      ).rejects.toMatchObject({ code: 'not-found', status: 404 });
      await expect(resolveOrganisation(f.db, 'evil.com', 'localhost')).rejects.toMatchObject({
        code: 'not-found',
      });
    });
  });

  describe('principal', () => {
    it('accepts a session of this organisation, with its role', async () => {
      const cookie = await cookieFor(f.s.acme.ownerEmail, f.s.acme.ownerPassword);
      const principal = await resolvePrincipal({
        db: f.db,
        auth,
        headers: new Headers({ cookie }),
        organisation: acme,
      });
      expect(principal).toEqual({
        kind: 'user',
        id: f.s.acme.ownerId,
        role: 'Contributor',
        organisationId: acme.organisationId,
        via: 'session',
      });
    });

    it('answers not found for a session of another organisation', async () => {
      const cookie = await cookieFor(f.s.globex.ownerEmail, f.s.globex.ownerPassword);
      await expect(
        resolvePrincipal({ db: f.db, auth, headers: new Headers({ cookie }), organisation: acme }),
      ).rejects.toMatchObject({ code: 'not-found', status: 404 });
    });

    it('refuses a deactivated person as unauthenticated', async () => {
      const cookie = await cookieFor(f.s.acme.contributorEmail, f.s.acme.contributorPassword);
      await f.t
        .pool('superuser')
        .query(`UPDATE "user" SET status = 'deactivated' WHERE id = $1`, [f.s.acme.contributorId]);
      try {
        await expect(
          resolvePrincipal({
            db: f.db,
            auth,
            headers: new Headers({ cookie }),
            organisation: acme,
          }),
        ).rejects.toMatchObject({ code: 'unauthenticated', status: 401 });
      } finally {
        await f.t
          .pool('superuser')
          .query(`UPDATE "user" SET status = 'active' WHERE id = $1`, [f.s.acme.contributorId]);
      }
    });

    it('accepts an agent token at its own address only', async () => {
      const headers = new Headers({ authorization: `Bearer ${f.s.acme.agent.token}` });
      await expect(
        resolvePrincipal({ db: f.db, auth, headers, organisation: acme }),
      ).resolves.toEqual({
        kind: 'service-account',
        id: f.s.acme.agent.serviceAccountId,
        role: 'Contributor',
        organisationId: acme.organisationId,
        via: 'bearer',
      });
      await expect(
        resolvePrincipal({ db: f.db, auth, headers, organisation: globex }),
      ).rejects.toMatchObject({ code: 'not-found', status: 404 });
    });

    it('refuses an invalid token, no credential, and a deactivated agent as unauthenticated', async () => {
      const cases = [
        new Headers({ authorization: 'Bearer ce_wrong' }),
        new Headers(),
        new Headers({ authorization: 'Basic abc' }),
      ];
      for (const headers of cases) {
        await expect(
          resolvePrincipal({ db: f.db, auth, headers, organisation: acme }),
        ).rejects.toMatchObject({ code: 'unauthenticated', status: 401 });
      }
      await f.t
        .pool('superuser')
        .query(`UPDATE service_accounts SET status = 'deactivated' WHERE service_account_id = $1`, [
          f.s.globex.agent.serviceAccountId,
        ]);
      const headers = new Headers({ authorization: `Bearer ${f.s.globex.agent.token}` });
      await expect(
        resolvePrincipal({ db: f.db, auth, headers, organisation: globex }),
      ).rejects.toMatchObject({ code: 'unauthenticated' });
    });
  });

  describe('Origin rule (NFR5.5)', () => {
    const base = { address: 'acme', baseDomain: 'localhost', publicPort: 443 };

    it('builds the expected origin, adding the port only when it is not 443', () => {
      expect(expectedOrigin(base)).toBe('https://acme.localhost');
      expect(expectedOrigin({ ...base, publicPort: 8443 })).toBe('https://acme.localhost:8443');
    });

    it.each([
      ['POST', 'session', 'https://acme.localhost', true],
      ['POST', 'session', undefined, false],
      ['POST', 'session', 'https://globex.localhost', false],
      ['DELETE', 'session', 'http://acme.localhost', false],
      ['GET', 'session', undefined, true],
      ['POST', 'bearer', undefined, true],
    ] as const)('%s with %s and Origin %s: allowed %s', (method, via, origin, allowed) => {
      const run = () => checkOrigin({ ...base, method, via, origin });
      if (allowed) expect(run).not.toThrow();
      else expect(run).toThrow(expect.objectContaining({ code: 'forbidden', status: 403 }));
    });

    it('expects the port when Caddy is published on another port', () => {
      expect(() =>
        checkOrigin({
          ...base,
          publicPort: 8443,
          method: 'POST',
          via: 'session',
          origin: 'https://acme.localhost',
        }),
      ).toThrow();
      expect(() =>
        checkOrigin({
          ...base,
          publicPort: 8443,
          method: 'POST',
          via: 'session',
          origin: 'https://acme.localhost:8443',
        }),
      ).not.toThrow();
    });
  });
});
