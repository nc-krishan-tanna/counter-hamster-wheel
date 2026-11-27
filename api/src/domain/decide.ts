/**
 * Deciding on a proposal (W4; BR2.1 to BR2.7, BR3.1, BR3.3, BR1.8), in one transaction that locks
 * the item first, then the proposal, so decisions on one item queue and never deadlock
 * (reliability design, "Approval in one transaction"). Any failure rolls everything back.
 */
import { randomUUID } from 'node:crypto';
import type { OwnerRef, Source } from '@ce/db/schema';
import type { Principal } from '../access/principal.ts';
import type { Db } from '../db/pool.ts';
import { withOrganisation, type OrgTransaction } from '../db/with-organisation.ts';
import { insertDecision } from '../repo/decisions.ts';
import {
  findLiveLink,
  getVersion,
  insertItem,
  insertLink,
  insertVersion,
  lockItem,
  removeLink,
  setCurrentVersion,
  type VersionView,
} from '../repo/items.ts';
import { isMemberOfAny } from '../repo/principals.ts';
import {
  getProposal,
  lockProposal,
  markOpenSiblingsOutOfDate,
  setProposalStatus,
  type ProposalRow,
} from '../repo/proposals.ts';
import { etagOf } from './etag.ts';
import { ProblemError, notFound } from './errors.ts';
import { isUuid } from './proposal-schema.ts';

export interface DecisionInput {
  proposalId: string;
  outcome: 'approve' | 'reject';
  comment?: string;
  /** The proposal ETag the decider saw (C1 If-Match). */
  ifMatch: string;
}

export interface DecisionResult {
  proposal: ProposalRow;
  decision: {
    decisionId: string;
    outcome: 'approved' | 'rejected';
    comment: string | null;
    isSelfApproval: boolean;
    decidedAt: Date;
  };
  /** The new version, for an approval. */
  versionId?: string;
}

/** BR2.1: a person listed as owner, or a member of a listed group. */
async function isHumanOwner(trx: OrgTransaction, userId: string, owners: OwnerRef[]) {
  if (owners.some((o) => o.kind === 'user' && o.ref_id === userId)) return true;
  const groups = owners.filter((o) => o.kind === 'group' && isUuid(o.ref_id)).map((o) => o.ref_id);
  return isMemberOfAny(trx, userId, groups);
}

export async function decide(
  db: Db,
  principal: Principal,
  input: DecisionInput,
): Promise<DecisionResult> {
  if (principal.kind !== 'user') throw new ProblemError('not-an-approver'); // BR2.2
  if (!isUuid(input.proposalId)) throw notFound();

  const result = await withOrganisation(db, principal.organisationId, async (trx) => {
    const seen = await getProposal(trx, input.proposalId);
    if (!seen) throw notFound();
    const item = seen.kind === 'create' ? undefined : await lockItem(trx, seen.itemId);
    const proposal = await lockProposal(trx, input.proposalId);
    if (!proposal) throw notFound();

    const base = proposal.baseVersionId ? await getVersion(trx, proposal.baseVersionId) : undefined;
    const owners =
      proposal.kind === 'create' ? (proposal.changes.owners ?? []) : (base?.owners ?? []);
    if (!(await isHumanOwner(trx, principal.id, owners))) throw new ProblemError('not-an-approver');

    if (proposal.status === 'out-of-date') throw new ProblemError('proposal-out-of-date');
    if (proposal.status !== 'open') throw new ProblemError('already-decided'); // BR2.6
    if (input.ifMatch !== etagOf(proposal)) throw new ProblemError('precondition-failed');

    if (input.outcome === 'reject') {
      const comment = input.comment?.trim();
      if (!comment) throw new ProblemError('reason-required'); // BR2.5
      const decision = await insertDecision(trx, {
        proposalId: proposal.proposalId,
        deciderId: principal.id,
        outcome: 'rejected',
        comment,
        isSelfApproval: proposal.proposerId === principal.id,
      });
      await setProposalStatus(trx, proposal.proposalId, 'rejected');
      return {
        kind: 'decided' as const,
        proposal: { ...proposal, status: 'rejected' as const },
        decision: {
          ...decision,
          outcome: 'rejected' as const,
          comment,
          isSelfApproval: proposal.proposerId === principal.id,
        },
      };
    }

    // BR2.7: an approval must be based on the item's current version.
    if (item && item.currentVersionId !== proposal.baseVersionId) {
      await setProposalStatus(trx, proposal.proposalId, 'out-of-date');
      return { kind: 'out-of-date' as const };
    }
    return {
      kind: 'decided' as const,
      ...(await approve(trx, principal, proposal, base, input.comment)),
    };
  });

  // The out-of-date status is committed above; only then is the approval refused.
  if (result.kind === 'out-of-date') throw new ProblemError('proposal-out-of-date');
  return result;
}

async function approve(
  trx: OrgTransaction,
  principal: Principal,
  proposal: ProposalRow,
  base: VersionView | undefined,
  rawComment: string | undefined,
) {
  const now = new Date();
  const changes = proposal.changes;
  const selfApproved = proposal.proposerId === principal.id; // BR2.4
  const comment = rawComment?.trim() || null;
  const decision = await insertDecision(trx, {
    proposalId: proposal.proposalId,
    deciderId: principal.id,
    outcome: 'approved',
    comment,
    isSelfApproval: selfApproved,
  });

  // BR1.6, BR3.3: manual sources carry over unless changed; one new system source per version.
  const manualSources: Source[] = changes.sources
    ? changes.sources.map((s) => ({
        kind: 'manual',
        title: s.title,
        ...(s.url ? { url: s.url } : {}),
      }))
    : (base?.sources ?? []).filter((s) => s.kind === 'manual');
  const channel = proposal.origin === 'ai-agent' ? 'mcp' : 'web';
  const systemSource: Source = {
    kind: 'system',
    title: proposal.origin === 'ai-agent' ? 'Proposed by an AI agent' : 'Proposed on the web page',
    author: proposal.proposerId,
    channel,
    recordedAt: proposal.createdAt.toISOString(),
  };

  // BR3.3: everything the proposal leaves out comes from the base version.
  const title = changes.title ?? base?.title;
  const content = changes.content ?? base?.content;
  const owners = changes.owners ?? base?.owners;
  if (!title || !content || !owners || (proposal.kind === 'create' && !changes.type)) {
    throw new Error('approved proposal lacks fields it was validated with');
  }

  const versionId = randomUUID();
  if (proposal.kind === 'create') {
    await insertItem(trx, {
      itemId: proposal.itemId,
      type: changes.type ?? '',
      versionId,
      reviewedAt: now,
    });
  }
  await insertVersion(trx, {
    versionId,
    itemId: proposal.itemId,
    versionNumber: (base?.versionNumber ?? 0) + 1,
    title,
    content,
    why: changes.why !== undefined ? changes.why : (base?.why ?? null),
    owners,
    sources: [...manualSources, systemSource],
    proposalId: proposal.proposalId,
    approvedBy: principal.id,
    approvedAt: now,
    flags: selfApproved ? ['self-approved'] : [],
  });
  for (const link of changes.addLinks ?? []) {
    await insertLink(trx, {
      fromItemId: proposal.itemId,
      toItemId: link.toItemId,
      linkType: link.linkType,
      addedInVersionId: versionId,
    });
  }
  for (const link of changes.removeLinks ?? []) {
    const live = await findLiveLink(trx, proposal.itemId, link.toItemId, link.linkType);
    if (live) await removeLink(trx, live.link_id, versionId);
  }
  if (proposal.kind !== 'create') await setCurrentVersion(trx, proposal.itemId, versionId, now);
  await setProposalStatus(trx, proposal.proposalId, 'approved');
  await markOpenSiblingsOutOfDate(trx, proposal.itemId, proposal.proposalId);

  return {
    proposal: { ...proposal, status: 'approved' as const },
    decision: { ...decision, outcome: 'approved' as const, comment, isSelfApproval: selfApproved },
    versionId,
  };
}
