/**
 * Reading knowledge (W5 item page, W6 MCP). Readers see the approved version; open proposals are
 * listed apart, "not yet approved" (BR4.1); search covers approved items only (BR4.2). An open
 * create proposal is not an item yet: only its proposer and named human owners see it (W5 step 5).
 */
import type { Principal } from '../access/principal.ts';
import type { Db } from '../db/pool.ts';
import { withOrganisation, type OrgTransaction } from '../db/with-organisation.ts';
import { getItemView, getVersion, listHistory, listItems } from '../repo/items.ts';
import { displayNames, isMemberOfAny } from '../repo/principals.ts';
import {
  getProposal,
  listProposals,
  listProposalsForItem,
  type ProposalWithDecision,
} from '../repo/proposals.ts';
import { searchItems } from '../repo/search.ts';
import type { ProposalStatus } from '@ce/db/schema';
import { etagOf, itemEtag } from './etag.ts';
import { notFound } from './errors.ts';
import { isUuid } from './proposal-schema.ts';

const inOrg = <T>(db: Db, p: Principal, fn: (trx: OrgTransaction) => Promise<T>) =>
  withOrganisation(db, p.organisationId, fn);

export async function readItem(db: Db, principal: Principal, itemId: string) {
  if (!isUuid(itemId)) throw notFound();
  return inOrg(db, principal, async (trx) => {
    const item = await getItemView(trx, itemId);
    if (!item) throw notFound();
    const history = await listHistory(trx, itemId);
    const proposals = await listProposalsForItem(trx, itemId);
    const openProposals = proposals.filter((p) => p.status === 'open');
    const closedProposals = proposals.filter(
      (p) => p.status === 'rejected' || p.status === 'out-of-date',
    );
    const names = await displayNames(trx, [
      ...item.version.owners.map((o) => o.ref_id),
      ...history.flatMap((h) => [h.proposerId, h.deciderId]),
      ...proposals.flatMap((p) => [p.proposerId, p.decision?.deciderId ?? '']).filter(Boolean),
    ]);
    return {
      item,
      history,
      openProposals,
      closedProposals,
      names: Object.fromEntries(names),
      etag: itemEtag(item.version.versionId),
    };
  });
}

export async function itemVersions(db: Db, principal: Principal, itemId: string) {
  if (!isUuid(itemId)) throw notFound();
  return inOrg(db, principal, async (trx) => {
    if (!(await getItemView(trx, itemId))) throw notFound();
    return listHistory(trx, itemId);
  });
}

export async function listItemsPage(
  db: Db,
  principal: Principal,
  options: { limit: number; cursor?: string; type?: string },
) {
  const after = options.cursor && isUuid(options.cursor) ? options.cursor : undefined;
  const rows = await inOrg(db, principal, (trx) =>
    listItems(trx, { limit: options.limit + 1, after, type: options.type }),
  );
  const items = rows.slice(0, options.limit);
  return { items, nextCursor: rows.length > options.limit ? (items.at(-1)?.itemId ?? null) : null };
}

/** BR4.2 search, each result's owners with their display names. */
export function searchKnowledge(
  db: Db,
  principal: Principal,
  text: string,
  options: { type?: string; limit?: number },
) {
  return inOrg(db, principal, async (trx) => {
    const results = await searchItems(trx, text, options);
    const names = await displayNames(
      trx,
      results.flatMap((r) => r.owners.map((o) => o.ref_id)),
    );
    return results.map((r) => ({
      ...r,
      owners: r.owners.map((o) => ({ ...o, name: names.get(o.ref_id) ?? null })),
    }));
  });
}

/** A create proposal (no item yet) is visible to its proposer and the human owners it names. */
async function canSee(trx: OrgTransaction, principal: Principal, p: ProposalWithDecision) {
  if (p.kind !== 'create' || p.status === 'approved' || p.proposerId === principal.id) return true;
  if (principal.kind !== 'user') return false;
  const owners = p.changes.owners ?? [];
  if (owners.some((o) => o.kind === 'user' && o.ref_id === principal.id)) return true;
  const groups = owners.filter((o) => o.kind === 'group' && isUuid(o.ref_id)).map((o) => o.ref_id);
  return isMemberOfAny(trx, principal.id, groups);
}

export async function listVisibleProposals(
  db: Db,
  principal: Principal,
  options: { status?: ProposalStatus; limit?: number },
) {
  return inOrg(db, principal, async (trx) => {
    const all = await listProposals(trx, { status: options.status, limit: options.limit ?? 50 });
    const visible: ProposalWithDecision[] = [];
    for (const p of all) if (await canSee(trx, principal, p)) visible.push(p);
    return visible;
  });
}

/** The proposal with the item's current version beside it (W4 step 1). */
export async function getVisibleProposal(db: Db, principal: Principal, proposalId: string) {
  if (!isUuid(proposalId)) throw notFound();
  return inOrg(db, principal, async (trx) => {
    const proposal = await getProposal(trx, proposalId);
    if (!proposal || !(await canSee(trx, principal, proposal))) throw notFound();
    const item = proposal.kind === 'create' ? undefined : await getItemView(trx, proposal.itemId);
    const currentVersion = item?.version ?? null;
    const baseVersion = proposal.baseVersionId
      ? ((await getVersion(trx, proposal.baseVersionId)) ?? null)
      : null;
    return { proposal, currentVersion, baseVersion, etag: etagOf(proposal) };
  });
}
