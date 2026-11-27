import { sql } from 'kysely';

/** The organisation `withOrganisation` set on this transaction, as a value for inserts and filters. */
export const currentOrganisation = () =>
  sql<string>`NULLIF(current_setting('app.organisation_id', true), '')::uuid`;
