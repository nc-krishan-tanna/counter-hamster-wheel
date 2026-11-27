import { useEffect, useState } from 'react';
import { api, ApiProblem } from '../api.ts';
import { problemMessage } from '../problem-message.ts';

interface Person {
  id: string;
  name: string | null;
}
interface LinkView {
  linkId: string;
  itemId: string;
  title: string;
  linkType: string;
}
interface ProposalSummary {
  proposalId: string;
  kind: string;
  status: string;
  origin: string;
  reason: string;
  proposer: Person;
  decision?: { comment: string | null } | null;
}
interface Item {
  itemId: string;
  type: string;
  title: string;
  content: string;
  why: string | null;
  owners: { kind: string; refId: string; name: string | null }[];
  sources: { kind: string; title: string; url?: string; channel?: string }[];
  lastReviewedAt: string | null;
  version: { versionNumber: number };
  links: { outgoing: LinkView[]; incoming: LinkView[] };
  history: {
    versionNumber: number;
    reason: string;
    origin: string;
    proposer: Person;
    decider: Person;
    approvedAt: string;
    selfApproved: boolean;
  }[];
  openProposals: ProposalSummary[];
  closedProposals: ProposalSummary[];
}

const who = (p: Person) => p.name ?? p.id;
const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    : 'never';
const originLabel = (origin: string) => (origin === 'ai-agent' ? 'AI agent' : 'person');

/** W5: the approved version, its history, and open proposals apart (BR4.1). */
export function ItemPage({ itemId }: { itemId: string }) {
  const [item, setItem] = useState<Item>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    let live = true;
    api.get<Item>(`/items/${encodeURIComponent(itemId)}`).then(
      ({ data }) => live && setItem(data),
      (e) => live && setError(e),
    );
    return () => {
      live = false;
    };
  }, [itemId]);

  if (error instanceof ApiProblem && error.status === 404)
    return <p data-testid="item-not-found">Item not found.</p>;
  if (error) return <p role="alert">{problemMessage(error)}</p>;
  if (!item) return <p>Loading…</p>;

  return (
    <article>
      <h1 data-testid="item-title">{item.title}</h1>
      <p>
        {item.type} · version {item.version.versionNumber} · last reviewed{' '}
        <span data-testid="item-last-reviewed">{when(item.lastReviewedAt)}</span>
      </p>
      <section>
        <h2>Content</h2>
        <p data-testid="item-content">{item.content}</p>
        <h2>Why</h2>
        <p data-testid="item-why">{item.why ?? '—'}</p>
      </section>
      <section>
        <h2>Owners</h2>
        <ul data-testid="item-owners">
          {item.owners.map((o) => (
            <li key={o.refId}>
              {o.name ?? o.refId} ({o.kind})
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Links</h2>
        <ul data-testid="item-links-out">
          {item.links.outgoing.map((l) => (
            <li key={l.linkId}>
              {l.linkType} → <a href={`#/items/${l.itemId}`}>{l.title}</a>
            </li>
          ))}
        </ul>
        <ul data-testid="item-links-in">
          {item.links.incoming.map((l) => (
            <li key={l.linkId}>
              <a href={`#/items/${l.itemId}`}>{l.title}</a> → {l.linkType} this
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Sources</h2>
        <ul data-testid="item-sources">
          {item.sources.map((s, i) => (
            <li key={i}>
              {s.url ? (
                <a href={s.url} rel="noreferrer noopener">
                  {s.title}
                </a>
              ) : (
                s.title
              )}
            </li>
          ))}
        </ul>
      </section>
      <section data-testid="item-open-proposals">
        <h2>Not yet approved</h2>
        {item.openProposals.length === 0 && <p>No open proposals.</p>}
        <ul>
          {item.openProposals.map((p) => (
            <li key={p.proposalId}>
              <strong>Not yet approved:</strong> {p.kind} by {who(p.proposer)} (
              {originLabel(p.origin)}): {p.reason}{' '}
              <a data-testid="open-proposal-link" href={`#/proposals/${p.proposalId}`}>
                Review
              </a>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>History</h2>
        <ol data-testid="item-history">
          {item.history.map((h) => (
            <li key={h.versionNumber} data-testid="history-entry">
              Version {h.versionNumber}: proposed by {who(h.proposer)} ({originLabel(h.origin)}),
              approved by {who(h.decider)} on {when(h.approvedAt)}. Reason: {h.reason}
              {h.selfApproved && ' (self-approved)'}
            </li>
          ))}
        </ol>
        <ul data-testid="item-closed-proposals">
          {item.closedProposals.map((p) => (
            <li key={p.proposalId}>
              {p.status}: {p.reason}
              {p.decision?.comment ? ` (${p.decision.comment})` : ''}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
