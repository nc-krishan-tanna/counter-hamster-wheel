/**
 * Kysely table types for the U1 data model (functional design `entities.md`). Column names are
 * the database's own; jsonb columns are written as JSON text and read back parsed.
 */
import type { ColumnType, Generated } from 'kysely';

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
type CreatedAt = ColumnType<Date, Date | string | undefined, never>;
type Json<T> = ColumnType<T, string, string>;
type Immutable<T> = ColumnType<T, T, never>;

export const ITEM_TYPES = [
  'business-rule-or-policy',
  'process',
  'glossary-term',
  'person',
  'team',
  'system',
  'decision',
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const LINK_TYPES = ['relates-to', 'depends-on', 'part-of', 'applies-to'] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export const PROPOSAL_KINDS = ['create', 'change', 'add-link', 'remove-link'] as const;
export type ProposalKind = (typeof PROPOSAL_KINDS)[number];

export type ProposalStatus = 'open' | 'approved' | 'rejected' | 'out-of-date';

export interface OwnerRef {
  kind: 'user' | 'group' | 'agent';
  ref_id: string;
}

export interface Source {
  kind: 'system' | 'manual';
  title: string;
  url?: string;
  author?: string;
  channel?: 'web' | 'mcp';
  recordedAt?: string;
}

export interface OrganisationsTable {
  organisation_id: Generated<string>;
  name: string;
  address: string;
  status: Generated<'active'>;
  created_at: CreatedAt;
}

export interface UserTable {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: CreatedAt;
  updatedAt: Timestamp;
  organisation_id: string;
  role: Generated<string>;
  status: Generated<string>;
}

export interface ApiKeyTable {
  id: string;
  configId: string;
  name: string | null;
  start: string | null;
  referenceId: string;
  prefix: string | null;
  key: string;
  enabled: boolean | null;
  rateLimitEnabled: boolean | null;
  requestCount: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ServiceAccountsTable {
  service_account_id: Generated<string>;
  organisation_id: string;
  name: string;
  role: Generated<'Reader' | 'Contributor'>;
  status: Generated<'active' | 'deactivated'>;
  api_key_id: string;
  created_at: CreatedAt;
}

export interface GroupsTable {
  group_id: Generated<string>;
  organisation_id: string;
  name: string;
  created_at: CreatedAt;
}

export interface GroupMembersTable {
  organisation_id: string;
  group_id: string;
  user_id: string;
}

export interface ItemsTable {
  item_id: Immutable<string>;
  organisation_id: Immutable<string>;
  type: string;
  current_version_id: string;
  status: Generated<'active'>;
  last_reviewed_at: Timestamp | null;
  created_at: CreatedAt;
}

export interface ItemVersionsTable {
  version_id: Immutable<string>;
  organisation_id: Immutable<string>;
  item_id: Immutable<string>;
  version_number: Immutable<number>;
  title: Immutable<string>;
  content: Immutable<string>;
  why: Immutable<string | null>;
  owners: ColumnType<OwnerRef[], string, never>;
  sources: ColumnType<Source[], string, never>;
  proposal_id: Immutable<string>;
  approved_by: Immutable<string>;
  approved_at: ColumnType<Date, Date | string, never>;
  flags: ColumnType<string[], string[] | undefined, never>;
}

export interface LinksTable {
  link_id: Generated<string>;
  organisation_id: string;
  from_item_id: string;
  to_item_id: string;
  link_type: string;
  added_in_version_id: string;
  removed_in_version_id: string | null;
}

export interface ProposalsTable {
  proposal_id: Generated<string>;
  organisation_id: string;
  kind: string;
  item_id: string;
  base_version_id: string | null;
  changes: Json<ProposalChanges>;
  reason: string;
  origin: string;
  proposer_kind: string;
  proposer_id: string;
  status: Generated<ProposalStatus>;
  created_at: CreatedAt;
  idempotency_key: string;
  request_hash: string;
}

/** What a proposal asks for (entities `Proposal.changes`). */
export interface ProposalChanges {
  title?: string;
  type?: string;
  content?: string;
  why?: string | null;
  owners?: OwnerRef[];
  sources?: { title: string; url?: string }[];
  addLinks?: { toItemId: string; linkType: string }[];
  removeLinks?: { toItemId: string; linkType: string }[];
}

export interface DecisionsTable {
  decision_id: Generated<string>;
  organisation_id: string;
  proposal_id: string;
  decider_id: string;
  outcome: 'approved' | 'rejected';
  comment: string | null;
  is_self_approval: boolean;
  decided_at: CreatedAt;
}

export interface Database {
  organisations: OrganisationsTable;
  user: UserTable;
  apikey: ApiKeyTable;
  service_accounts: ServiceAccountsTable;
  groups: GroupsTable;
  group_members: GroupMembersTable;
  items: ItemsTable;
  item_versions: ItemVersionsTable;
  links: LinksTable;
  proposals: ProposalsTable;
  decisions: DecisionsTable;
}
