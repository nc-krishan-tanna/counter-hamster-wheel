import { useState, type FormEvent } from 'react';
import { api, ApiProblem, type FieldError } from '../api.ts';
import { problemMessage } from '../problem-message.ts';

/** The starting seven types (db/src/schema.ts ITEM_TYPES; organisation-defined types come in U3). */
const ITEM_TYPES = [
  'business-rule-or-policy',
  'process',
  'glossary-term',
  'person',
  'team',
  'system',
  'decision',
];

/** `group:<id>, user:<id>` into owner entries; null when an entry cannot be read. */
function parseOwners(text: string) {
  const entries = text.split(/[\s,]+/).filter(Boolean);
  const owners = entries.map((entry) => {
    const [, kind, refId] = /^(user|group|agent):(.+)$/.exec(entry) ?? [];
    return kind && refId ? { kind, ref_id: refId } : null;
  });
  return owners.every((o) => o !== null) ? owners : null;
}

/** W1: propose a new item. Nothing is live until an owner approves it (AC2.1.1). */
export function NewItem({
  onCreated,
}: {
  onCreated: (proposal: { proposalId: string; itemId: string }) => void;
}) {
  const [form, setForm] = useState({
    title: '',
    type: '',
    content: '',
    why: '',
    owners: '',
    sourceTitle: '',
    sourceUrl: '',
    reason: '',
  });
  // One key per form, so a retry after a timeout never creates a duplicate (C1, BR1.7).
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [field]: e.target.value });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    const owners = parseOwners(form.owners);
    if (!owners) {
      setErrors({ owners: 'Write each owner as user:<id>, group:<id> or agent:<id>.' });
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post<{ proposalId: string; itemId: string }>(
        '/proposals',
        {
          kind: 'create',
          reason: form.reason,
          changes: {
            title: form.title,
            type: form.type,
            content: form.content,
            ...(form.why ? { why: form.why } : {}),
            owners,
            ...(form.sourceTitle || form.sourceUrl
              ? {
                  sources: [
                    { title: form.sourceTitle, ...(form.sourceUrl ? { url: form.sourceUrl } : {}) },
                  ],
                }
              : {}),
          },
        },
        { 'idempotency-key': idempotencyKey },
      );
      setErrors({});
      onCreated(data);
    } catch (error) {
      // Keep everything typed; name each refused field next to it (AC2.1.2).
      const byField: Record<string, string> = {};
      for (const e of error instanceof ApiProblem ? error.errors : ([] as FieldError[])) {
        const field = e.field.replace(/^changes\./, '').replace(/\[.*$/, '');
        byField[field] = byField[field] ? `${byField[field]} ${e.message}` : e.message;
      }
      setErrors(byField);
      setMessage(problemMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const fieldError = (field: string) =>
    errors[field] ? (
      <span role="alert" data-testid={`error-${field}`}>
        {errors[field]}
      </span>
    ) : null;

  return (
    <form onSubmit={submit} aria-label="New item">
      <h1>New item</h1>
      <label>
        Title{' '}
        <input
          data-testid="new-item-title"
          value={form.title}
          onChange={set('title')}
          maxLength={200}
        />
      </label>
      {fieldError('title')}
      <label>
        Type
        <select data-testid="new-item-type" value={form.type} onChange={set('type')}>
          <option value="">Choose a type</option>
          {ITEM_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      {fieldError('type')}
      <label>
        Content{' '}
        <textarea data-testid="new-item-content" value={form.content} onChange={set('content')} />
      </label>
      {fieldError('content')}
      <label>
        Why it exists <textarea data-testid="new-item-why" value={form.why} onChange={set('why')} />
      </label>
      {fieldError('why')}
      <label>
        Owners (user:&lt;id&gt;, group:&lt;id&gt; or agent:&lt;id&gt;)
        <input data-testid="new-item-owners" value={form.owners} onChange={set('owners')} />
      </label>
      {fieldError('owners')}
      <fieldset>
        <legend>Source (optional)</legend>
        <input
          data-testid="new-item-source-title"
          aria-label="Source title"
          value={form.sourceTitle}
          onChange={set('sourceTitle')}
        />
        <input
          data-testid="new-item-source-url"
          aria-label="Source address"
          value={form.sourceUrl}
          onChange={set('sourceUrl')}
        />
      </fieldset>
      {fieldError('sources')}
      <label>
        Reason for the change{' '}
        <textarea data-testid="new-item-reason" value={form.reason} onChange={set('reason')} />
      </label>
      {fieldError('reason')}
      {message && <p data-testid="new-item-message">{message}</p>}
      <button data-testid="new-item-submit" type="submit" disabled={busy}>
        Propose
      </button>
    </form>
  );
}
