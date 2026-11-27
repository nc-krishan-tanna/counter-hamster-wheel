/** The JSON shapes the web page, REST clients and MCP agents receive. */
import type { OwnerRef } from '@ce/db/schema';
import type { readItem } from './domain/read.ts';
import type { HistoryEntry } from './repo/items.ts';
import type { ProposalRow, ProposalWithDecision } from './repo/proposals.ts';

type Names = Record<string, string>;
type ItemRead = Awaited<ReturnType<typeof readItem>>;

const person = (id: string, names: Names) => ({ id, name: names[id] ?? null });

export const ownersView = (owners: OwnerRef[], names: Names) =>
  owners.map((o) => ({ kind: o.kind, refId: o.ref_id, name: names[o.ref_id] ?? null }));

export function proposalView(p: ProposalRow | ProposalWithDecision, names: Names = {}) {
  const decision =
    'decision' in p && p.decision
      ? { ...p.decision, decider: person(p.decision.deciderId, names) }
      : null;
  return {
    proposalId: p.proposalId,
    kind: p.kind,
    itemId: p.itemId,
    baseVersionId: p.baseVersionId,
    status: p.status,
    origin: p.origin,
    proposer: {
      kind: p.proposerKind === 'user' ? 'user' : 'service-account',
      id: p.proposerId,
      name: names[p.proposerId] ?? null,
    },
    reason: p.reason,
    changes: p.changes,
    createdAt: p.createdAt,
    decision,
  };
}

export const historyView = (h: HistoryEntry, names: Names) => ({
  ...h,
  proposer: person(h.proposerId, names),
  decider: person(h.deciderId, names),
});

export function itemView(read: ItemRead) {
  const { item, names } = read;
  const v = item.version;
  return {
    itemId: item.itemId,
    type: item.type,
    status: item.status,
    title: v.title,
    content: v.content,
    why: v.why,
    owners: ownersView(v.owners, names),
    sources: v.sources,
    lastReviewedAt: item.lastReviewedAt,
    version: {
      versionId: v.versionId,
      versionNumber: v.versionNumber,
      approvedBy: person(v.approvedBy, names),
      approvedAt: v.approvedAt,
      selfApproved: v.flags.includes('self-approved'),
    },
    links: { outgoing: item.linksOut, incoming: item.linksIn },
    history: read.history.map((h) => historyView(h, names)),
    /** Not yet approved (BR4.1). */
    openProposals: read.openProposals.map((p) => proposalView(p, names)),
    closedProposals: read.closedProposals.map((p) => proposalView(p, names)),
  };
}
