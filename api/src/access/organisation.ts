/**
 * The first, seeded version of C7 `Access.organisation`: the organisation comes from the address
 * the request arrived at (security design, "Organisation from the address"). U2 adds suspension.
 */
import type { Db } from '../db/pool.ts';
import { notFound } from '../domain/errors.ts';
import { findOrganisationByAddress, type Organisation } from '../repo/organisations.ts';

const ADDRESS = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

/** `acme.localhost:8443` with base domain `localhost` gives `acme`; any other shape gives null. */
export function addressFromHost(host: string, baseDomain: string): string | null {
  const name = host.trim().toLowerCase().replace(/:\d+$/, '');
  const suffix = `.${baseDomain.toLowerCase()}`;
  if (!name.endsWith(suffix)) return null;
  const address = name.slice(0, -suffix.length);
  return ADDRESS.test(address) ? address : null;
}

/** The organisation of this host, or `404 not-found` (no knowledge query runs for an unknown address). */
export async function resolveOrganisation(
  db: Db,
  host: string,
  baseDomain: string,
): Promise<Organisation> {
  const address = addressFromHost(host, baseDomain);
  if (!address) throw notFound();
  const organisation = await findOrganisationByAddress(db, address);
  if (!organisation) throw notFound();
  return organisation;
}
