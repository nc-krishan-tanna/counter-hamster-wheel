/**
 * Items, versions and links (KnowledgeGraph). Every function runs inside `withOrganisation`, so
 * row-level security limits it to the request's organisation. Reads take the current approved
 * version through `items.current_version_id` with one join (performance design).
 */
import type { OwnerRef, Source } from '@ce/db/schema';
import type { OrgTransaction } from '../db/with-organisation.ts';
import { currentOrganisation } from './current-organisation.ts';

export interface VersionView {
  versionId: string;
  itemId: string;
  versionNumber: number;
  title: string;
  content: string;
  why: string | null;
  owners: OwnerRef[];
  sources: Source[];
  proposalId: string;
  approvedBy: string;
  approvedAt: Date;
  flags: string[];
}

export interface LinkView {
  linkId: string;
  /** The item at the other end of the link. */
  itemId: string;
  title: string;
  linkType: string;
}

export interface ItemView {
  itemId: string;
  type: string;
  status: string;
  lastReviewedAt: Date | null;
  version: VersionView;
  linksOut: LinkView[];
  linksIn: LinkView[];
}

const versionColumns = [
  'v.version_id',
  'v.item_id',
  'v.version_number',
  'v.title',
  'v.content',
  'v.why',
  'v.owners',
  'v.sources',
  'v.proposal_id',
  'v.approved_by',
  'v.approved_at',
  'v.flags',
] as const;

interface VersionRow {
  version_id: string;
  item_id: string;
  version_number: number;
  title: string;
  content: string;
  why: string | null;
  owners: OwnerRef[];
  sources: Source[];
  proposal_id: string;
  approved_by: string;
  approved_at: Date;
  flags: string[];
}

export const toVersionView = (r: VersionRow): VersionView => ({
  versionId: r.version_id,
  itemId: r.item_id,
  versionNumber: r.version_number,
  title: r.title,
  content: r.content,
  why: r.why,
  owners: r.owners,
  sources: r.sources,
  proposalId: r.proposal_id,
  approvedBy: r.approved_by,
  approvedAt: r.approved_at,
  flags: r.flags,
});

export async function getItemView(
  trx: OrgTransaction,
  itemId: string,
): Promise<ItemView | undefined> {
  const row = await trx
    .selectFrom('items as i')
    .innerJoin('item_versions as v', 'v.version_id', 'i.current_version_id')
    .select(['i.type', 'i.status', 'i.last_reviewed_at', ...versionColumns])
    .where('i.item_id', '=', itemId)
    .executeTakeFirst();
  if (!row) return undefined;
  const linksOut = await trx
    .selectFrom('links as l')
    .innerJoin('items as other', 'other.item_id', 'l.to_item_id')
    .innerJoin('item_versions as ov', 'ov.version_id', 'other.current_version_id')
    .select([
      'l.link_id as linkId',
      'l.to_item_id as itemId',
      'ov.title',
      'l.link_type as linkType',
    ])
    .where('l.from_item_id', '=', itemId)
    .where('l.removed_in_version_id', 'is', null)
    .orderBy('ov.title')
    .execute();
  const linksIn = await trx
    .selectFrom('links as l')
    .innerJoin('items as other', 'other.item_id', 'l.from_item_id')
    .innerJoin('item_versions as ov', 'ov.version_id', 'other.current_version_id')
    .select([
      'l.link_id as linkId',
      'l.from_item_id as itemId',
      'ov.title',
      'l.link_type as linkType',
    ])
    .where('l.to_item_id', '=', itemId)
    .where('l.removed_in_version_id', 'is', null)
    .orderBy('ov.title')
    .execute();
  return {
    itemId: row.item_id,
    type: row.type,
    status: row.status,
    lastReviewedAt: row.last_reviewed_at,
    version: toVersionView(row),
    linksOut,
    linksIn,
  };
}

export interface HistoryEntry {
  versionId: string;
  versionNumber: number;
  title: string;
  proposalId: string;
  reason: string;
  origin: string;
  proposerKind: string;
  proposerId: string;
  deciderId: string;
  comment: string | null;
  approvedAt: Date;
  selfApproved: boolean;
}

/** Every version of the item, newest first, with who proposed and decided it and why. */
export async function listHistory(trx: OrgTransaction, itemId: string): Promise<HistoryEntry[]> {
  const rows = await trx
    .selectFrom('item_versions as v')
    .innerJoin('proposals as p', 'p.proposal_id', 'v.proposal_id')
    .innerJoin('decisions as d', 'd.proposal_id', 'v.proposal_id')
    .select([
      'v.version_id',
      'v.version_number',
      'v.title',
      'v.proposal_id',
      'v.approved_at',
      'v.flags',
      'p.reason',
      'p.origin',
      'p.proposer_kind',
      'p.proposer_id',
      'd.decider_id',
      'd.comment',
    ])
    .where('v.item_id', '=', itemId)
    .orderBy('v.version_number', 'desc')
    .execute();
  return rows.map((r) => ({
    versionId: r.version_id,
    versionNumber: r.version_number,
    title: r.title,
    proposalId: r.proposal_id,
    reason: r.reason,
    origin: r.origin,
    proposerKind: r.proposer_kind,
    proposerId: r.proposer_id,
    deciderId: r.decider_id,
    comment: r.comment,
    approvedAt: r.approved_at,
    selfApproved: r.flags.includes('self-approved'),
  }));
}

export interface ItemSummary {
  itemId: string;
  type: string;
  title: string;
  lastReviewedAt: Date | null;
}

/** Approved items, ordered by id, cursor-paged (C1 pagination). */
export async function listItems(
  trx: OrgTransaction,
  options: { limit: number; after?: string; type?: string },
): Promise<ItemSummary[]> {
  let query = trx
    .selectFrom('items as i')
    .innerJoin('item_versions as v', 'v.version_id', 'i.current_version_id')
    .select(['i.item_id as itemId', 'i.type', 'v.title', 'i.last_reviewed_at as lastReviewedAt'])
    .orderBy('i.item_id')
    .limit(options.limit);
  if (options.after) query = query.where('i.item_id', '>', options.after);
  if (options.type) query = query.where('i.type', '=', options.type);
  return query.execute();
}

/** Locks the item row: every decision on one item queues here (reliability design). */
export async function lockItem(trx: OrgTransaction, itemId: string) {
  const row = await trx
    .selectFrom('items')
    .select(['item_id', 'type', 'current_version_id'])
    .where('item_id', '=', itemId)
    .forUpdate()
    .executeTakeFirst();
  return row && { itemId: row.item_id, type: row.type, currentVersionId: row.current_version_id };
}

export async function getVersion(
  trx: OrgTransaction,
  versionId: string,
): Promise<VersionView | undefined> {
  const row = await trx
    .selectFrom('item_versions as v')
    .select(versionColumns)
    .where('v.version_id', '=', versionId)
    .executeTakeFirst();
  return row && toVersionView(row);
}

/** The ids among `itemIds` that are approved items of this organisation. */
export async function existingItemIds(
  trx: OrgTransaction,
  itemIds: string[],
): Promise<Set<string>> {
  if (itemIds.length === 0) return new Set();
  const rows = await trx
    .selectFrom('items')
    .select('item_id')
    .where('item_id', 'in', itemIds)
    .execute();
  return new Set(rows.map((r) => r.item_id));
}

export interface NewVersion {
  versionId: string;
  itemId: string;
  versionNumber: number;
  title: string;
  content: string;
  why: string | null;
  owners: OwnerRef[];
  sources: Source[];
  proposalId: string;
  approvedBy: string;
  approvedAt: Date;
  flags: string[];
}

/** Creates the item for an approved create proposal; its first version follows in the same transaction. */
export async function insertItem(
  trx: OrgTransaction,
  item: { itemId: string; type: string; versionId: string; reviewedAt: Date },
) {
  await trx
    .insertInto('items')
    .values({
      item_id: item.itemId,
      organisation_id: currentOrganisation(),
      type: item.type,
      current_version_id: item.versionId,
      last_reviewed_at: item.reviewedAt,
    })
    .execute();
}

export async function insertVersion(trx: OrgTransaction, v: NewVersion) {
  await trx
    .insertInto('item_versions')
    .values({
      version_id: v.versionId,
      organisation_id: currentOrganisation(),
      item_id: v.itemId,
      version_number: v.versionNumber,
      title: v.title,
      content: v.content,
      why: v.why,
      owners: JSON.stringify(v.owners),
      sources: JSON.stringify(v.sources),
      proposal_id: v.proposalId,
      approved_by: v.approvedBy,
      approved_at: v.approvedAt,
      flags: v.flags,
    })
    .execute();
}

/** Moves the item to its new approved version (BR3.1). */
export async function setCurrentVersion(
  trx: OrgTransaction,
  itemId: string,
  versionId: string,
  reviewedAt: Date,
) {
  await trx
    .updateTable('items')
    .set({ current_version_id: versionId, last_reviewed_at: reviewedAt })
    .where('item_id', '=', itemId)
    .execute();
}

export async function insertLink(
  trx: OrgTransaction,
  link: { fromItemId: string; toItemId: string; linkType: string; addedInVersionId: string },
) {
  await trx
    .insertInto('links')
    .values({
      organisation_id: currentOrganisation(),
      from_item_id: link.fromItemId,
      to_item_id: link.toItemId,
      link_type: link.linkType,
      added_in_version_id: link.addedInVersionId,
    })
    .execute();
}

/** Ends a live link, recording the version that removed it; history keeps the row. */
export async function removeLink(trx: OrgTransaction, linkId: string, removedInVersionId: string) {
  await trx
    .updateTable('links')
    .set({ removed_in_version_id: removedInVersionId })
    .where('link_id', '=', linkId)
    .execute();
}

export async function findLiveLink(
  trx: OrgTransaction,
  fromItemId: string,
  toItemId: string,
  linkType: string,
) {
  return trx
    .selectFrom('links')
    .select('link_id')
    .where('from_item_id', '=', fromItemId)
    .where('to_item_id', '=', toItemId)
    .where('link_type', '=', linkType)
    .where('removed_in_version_id', 'is', null)
    .executeTakeFirst();
}
