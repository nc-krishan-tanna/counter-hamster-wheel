import type { OrgTransaction } from '../db/with-organisation.ts';
import { currentOrganisation } from './current-organisation.ts';

export interface NewDecision {
  proposalId: string;
  deciderId: string;
  outcome: 'approved' | 'rejected';
  comment: string | null;
  isSelfApproval: boolean;
}

/** The single decision on a proposal (`decisions.proposal_id` is unique: BR2.6). */
export async function insertDecision(trx: OrgTransaction, d: NewDecision) {
  return trx
    .insertInto('decisions')
    .values({
      organisation_id: currentOrganisation(),
      proposal_id: d.proposalId,
      decider_id: d.deciderId,
      outcome: d.outcome,
      comment: d.comment,
      is_self_approval: d.isSelfApproval,
    })
    .returning(['decision_id as decisionId', 'decided_at as decidedAt'])
    .executeTakeFirstOrThrow();
}
