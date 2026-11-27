import { useEffect, useState } from 'react';
import { api } from '../api.ts';
import { problemMessage } from '../problem-message.ts';

interface Summary {
  itemId: string;
  type: string;
  title: string;
}
interface ProposalSummary {
  proposalId: string;
  kind: string;
  reason: string;
  origin: string;
}

/** Approved items, and the open proposals the person can see (each marked not yet approved). */
export function ItemList() {
  const [items, setItems] = useState<Summary[]>([]);
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<{ items: Summary[] }>('/items?limit=200'),
      api.get<{ proposals: ProposalSummary[] }>('/proposals?status=open'),
    ]).then(
      ([i, p]) => {
        setItems(i.data.items);
        setProposals(p.data.proposals);
      },
      (e) => setMessage(problemMessage(e)),
    );
  }, []);

  return (
    <section>
      <h1>Knowledge</h1>
      <a data-testid="new-item-link" href="#/items/new">
        New item
      </a>
      {message && <p role="alert">{message}</p>}
      <ul data-testid="item-list">
        {items.map((i) => (
          <li key={i.itemId}>
            <a href={`#/items/${i.itemId}`}>{i.title}</a> ({i.type})
          </li>
        ))}
      </ul>
      <h2>Not yet approved</h2>
      <ul data-testid="proposal-list">
        {proposals.map((p) => (
          <li key={p.proposalId}>
            <a href={`#/proposals/${p.proposalId}`}>
              {p.kind}: {p.reason}
            </a>{' '}
            ({p.origin === 'ai-agent' ? 'AI agent' : 'person'})
          </li>
        ))}
      </ul>
    </section>
  );
}
