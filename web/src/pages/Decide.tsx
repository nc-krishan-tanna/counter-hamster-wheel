import { useEffect, useState } from 'react';
import { api } from '../api.ts';
import { problemMessage } from '../problem-message.ts';

interface ProposalView {
  proposal: {
    proposalId: string;
    kind: string;
    status: string;
    origin: string;
    reason: string;
    proposer: { id: string; name: string | null };
    changes: Record<string, unknown>;
  };
  currentVersion: { title: string; content: string } | null;
}

/** W4: the proposed change beside the current version; approve, or reject with a reason. */
export function Decide({
  proposalId,
  onDecided,
}: {
  proposalId: string;
  onDecided: (outcome: 'approved' | 'rejected') => void;
}) {
  const [view, setView] = useState<ProposalView>();
  const [etag, setEtag] = useState('');
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<ProposalView>(`/proposals/${encodeURIComponent(proposalId)}`).then(
      ({ data, etag }) => {
        setView(data);
        setEtag(etag);
      },
      (e) => setMessage(problemMessage(e)),
    );
  }, [proposalId]);

  async function decide(outcome: 'approve' | 'reject') {
    if (outcome === 'reject' && !comment.trim()) {
      setMessage('Give a reason to reject this proposal.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await api.post(
        `/proposals/${encodeURIComponent(proposalId)}/decisions`,
        { outcome, ...(comment.trim() ? { comment } : {}) },
        { 'if-match': etag },
      );
      onDecided(outcome === 'approve' ? 'approved' : 'rejected');
    } catch (error) {
      setMessage(problemMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const p = view?.proposal;
  return (
    <section aria-label="Decide on a proposal">
      <h1>Proposal</h1>
      {p && (
        <>
          <p data-testid="decide-reason">
            {p.kind} proposed by {p.proposer.name ?? p.proposer.id} (
            {p.origin === 'ai-agent' ? 'AI agent' : 'person'}), status {p.status}. Reason:{' '}
            {p.reason}
          </p>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div data-testid="decide-current">
              <h2>Current version</h2>
              {view?.currentVersion ? (
                <>
                  <h3>{view.currentVersion.title}</h3>
                  <p>{view.currentVersion.content}</p>
                </>
              ) : (
                <p>New item: no current version.</p>
              )}
            </div>
            <div data-testid="decide-proposed">
              <h2>Proposed</h2>
              <pre>{JSON.stringify(p.changes, null, 2)}</pre>
            </div>
          </div>
          <label>
            Comment (required to reject)
            <textarea
              data-testid="decide-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </label>
          <button
            data-testid="decide-approve"
            type="button"
            disabled={busy}
            onClick={() => decide('approve')}
          >
            Approve
          </button>
          <button
            data-testid="decide-reject"
            type="button"
            disabled={busy}
            onClick={() => decide('reject')}
          >
            Reject
          </button>
        </>
      )}
      {message && (
        <p role="alert" data-testid="decide-message">
          {message}
        </p>
      )}
    </section>
  );
}
