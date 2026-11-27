/**
 * Proposals (ProposalWorkflow). Idempotent insert per C1 and the reliability design: the key is
 * unique per (organisation, proposer); the same key with the same request hash returns the first
 * proposal, a different hash is a key conflict.
 */
import type { ProposalChanges, ProposalStatus } from '@ce/db/schema';
import type { OrgTransaction } from '../db/with-organisation.ts';
import { currentOrganisation } from './current-organisation.ts';

export class IdempotencyKeyConflict extends Error {
  constructor() {
    super('idempotency key already used for a different request');
  }
}

export interface NewProposalRow {
  kind: string;
  itemId: string;
  baseVersionId: string | null;
  changes: ProposalChanges;
  reason: string;
  origin: 'person' | 'ai-agent';
  proposerKind: 'user' | 'service-account';
  proposerId: string;
  idempotencyKey: string;
  requestHash: string;
}

export interface ProposalRow extends Omit<
  NewProposalRow,
  'idempotencyKey' | 'requestHash' | 'origin' | 'proposerKind'
> {
  proposalId: string;
  origin: string;
  proposerKind: string;
  status: ProposalStatus;
  createdAt: Date;
  requestHash: string;
}

/** A proposal with its decision, if it has one (history and proposal pages). */
export interface ProposalWithDecision extends ProposalRow {
  decision: {
    deciderId: string;
    outcome: string;
    comment: string | null;
    decidedAt: Date;
    isSelfApproval: boolean;
  } | null;
}

const bareColumns = [
  'proposal_id',
  'kind',
  'item_id',
  'base_version_id',
  'changes',
  'reason',
  'origin',
  'proposer_kind',
  'proposer_id',
  'status',
  'created_at',
  'request_hash',
] as const;
const columns = bareColumns.map(
  (c) => `p.${c}` as const,
) as readonly `p.${(typeof bareColumns)[number]}`[];

interface Row {
  proposal_id: string;
  kind: string;
  item_id: string;
  base_version_id: string | null;
  changes: ProposalChanges;
  reason: string;
  origin: string;
  proposer_kind: string;
  proposer_id: string;
  status: ProposalStatus;
  created_at: Date;
  request_hash: string;
}

const toProposal = (r: Row): ProposalRow => ({
  proposalId: r.proposal_id,
  kind: r.kind,
  itemId: r.item_id,
  baseVersionId: r.base_version_id,
  changes: r.changes,
  reason: r.reason,
  origin: r.origin,
  proposerKind: r.proposer_kind,
  proposerId: r.proposer_id,
  status: r.status,
  createdAt: r.created_at,
  requestHash: r.request_hash,
});

async function findByKey(trx: OrgTransaction, proposerId: string, key: string) {
  const row = await trx
    .selectFrom('proposals as p')
    .select(columns)
    .where('p.proposer_id', '=', proposerId)
    .where('p.idempotency_key', '=', key)
    .executeTakeFirst();
  return row && toProposal(row);
}

function replayOrConflict(existing: ProposalRow, requestHash: string) {
  if (existing.requestHash !== requestHash) throw new IdempotencyKeyConflict();
  return { proposal: existing, replayed: true };
}

export async function findProposalByKey(
  trx: OrgTransaction,
  proposerId: string,
  key: string,
  requestHash: string,
) {
  const existing = await findByKey(trx, proposerId, key);
  return existing && replayOrConflict(existing, requestHash);
}

export async function insertProposal(
  trx: OrgTransaction,
  p: NewProposalRow,
): Promise<{ proposal: ProposalRow; replayed: boolean }> {
  const replay = await findProposalByKey(trx, p.proposerId, p.idempotencyKey, p.requestHash);
  if (replay) return replay;
  const inserted = await trx
    .insertInto('proposals')
    .values({
      organisation_id: currentOrganisation(),
      kind: p.kind,
      item_id: p.itemId,
      base_version_id: p.baseVersionId,
      changes: JSON.stringify(p.changes),
      reason: p.reason,
      origin: p.origin,
      proposer_kind: p.proposerKind,
      proposer_id: p.proposerId,
      idempotency_key: p.idempotencyKey,
      request_hash: p.requestHash,
    })
    .onConflict((oc) =>
      oc.columns(['organisation_id', 'proposer_id', 'idempotency_key']).doNothing(),
    )
    .returning(bareColumns)
    .executeTakeFirst();
  if (inserted) return { proposal: toProposal(inserted), replayed: false };
  // A concurrent request with the same key won the insert: answer as a repeat of it.
  const winner = await findByKey(trx, p.proposerId, p.idempotencyKey);
  if (!winner) throw new Error('proposal insert conflicted but no proposal holds the key');
  return replayOrConflict(winner, p.requestHash);
}

function withDecisionQuery(trx: OrgTransaction) {
  return trx
    .selectFrom('proposals as p')
    .leftJoin('decisions as d', 'd.proposal_id', 'p.proposal_id')
    .select([
      ...columns,
      'd.decider_id',
      'd.outcome',
      'd.comment',
      'd.decided_at',
      'd.is_self_approval',
    ]);
}

type DecisionRow = Row & {
  decider_id: string | null;
  outcome: string | null;
  comment: string | null;
  decided_at: Date | null;
  is_self_approval: boolean | null;
};

const toProposalWithDecision = (r: DecisionRow): ProposalWithDecision => ({
  ...toProposal(r),
  decision:
    r.decider_id && r.outcome && r.decided_at
      ? {
          deciderId: r.decider_id,
          outcome: r.outcome,
          comment: r.comment,
          decidedAt: r.decided_at,
          isSelfApproval: Boolean(r.is_self_approval),
        }
      : null,
});

export async function getProposal(trx: OrgTransaction, proposalId: string) {
  const row = await withDecisionQuery(trx)
    .where('p.proposal_id', '=', proposalId)
    .executeTakeFirst();
  return row && toProposalWithDecision(row);
}

export async function lockProposal(trx: OrgTransaction, proposalId: string) {
  const row = await trx
    .selectFrom('proposals as p')
    .select(columns)
    .where('p.proposal_id', '=', proposalId)
    .forUpdate()
    .executeTakeFirst();
  return row && toProposal(row);
}

/** Every proposal on the item (open, decided or out of date), newest first. */
export async function listProposalsForItem(trx: OrgTransaction, itemId: string) {
  const rows = await withDecisionQuery(trx)
    .where('p.item_id', '=', itemId)
    .orderBy('p.created_at', 'desc')
    .execute();
  return rows.map(toProposalWithDecision);
}

export async function listProposals(
  trx: OrgTransaction,
  options: { status?: ProposalStatus; limit: number },
) {
  let query = withDecisionQuery(trx).orderBy('p.created_at', 'desc').limit(options.limit);
  if (options.status) query = query.where('p.status', '=', options.status);
  return (await query.execute()).map(toProposalWithDecision);
}

export async function setProposalStatus(
  trx: OrgTransaction,
  proposalId: string,
  status: ProposalStatus,
) {
  await trx
    .updateTable('proposals')
    .set({ status })
    .where('proposal_id', '=', proposalId)
    .execute();
}

/** BR2.7: after an approval every other open proposal on the item is based on an old version. */
export async function markOpenSiblingsOutOfDate(
  trx: OrgTransaction,
  itemId: string,
  approvedProposalId: string,
) {
  await trx
    .updateTable('proposals')
    .set({ status: 'out-of-date' })
    .where('item_id', '=', itemId)
    .where('status', '=', 'open')
    .where('proposal_id', '<>', approvedProposalId)
    .execute();
}
