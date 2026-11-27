/**
 * Shape checks for a proposal, before any data is read (BR1.2, BR1.3, BR1.5 types, BR1.6).
 * Every problem is named by field, so the person can fix all of them at once.
 */
import { ITEM_TYPES, LINK_TYPES, type OwnerRef, type ProposalChanges } from '@ce/db/schema';
import type { FieldError } from './errors.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID.test(value);

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

type Field = keyof ProposalChanges;

/** One schema per proposal kind: which changes it may carry and which it must. */
const KIND_SCHEMAS: Record<string, { allowed: Field[]; required: Field[] }> = {
  create: {
    allowed: ['title', 'type', 'content', 'why', 'owners', 'sources', 'addLinks'],
    required: ['title', 'type', 'content', 'owners'],
  },
  change: {
    allowed: ['title', 'content', 'why', 'owners', 'sources', 'addLinks', 'removeLinks'],
    required: [],
  },
  'add-link': { allowed: ['addLinks'], required: ['addLinks'] },
  'remove-link': { allowed: ['removeLinks'], required: ['removeLinks'] },
};

interface ShapeInput {
  kind: string;
  itemId?: string;
  baseVersionId?: string;
  reason: string;
  changes: ProposalChanges;
}

export function validateShape(input: ShapeInput): {
  errors: FieldError[];
  changes: ProposalChanges;
} {
  const errors: FieldError[] = [];
  const add = (field: string, message: string) => errors.push({ field, message });
  const c = input.changes ?? {};
  const out: ProposalChanges = {};

  if (!text(input.reason)) add('reason', 'Give a reason for the change.');

  const schema = KIND_SCHEMAS[input.kind];
  if (!schema) {
    add('kind', 'Must be one of create, change, add-link, remove-link.');
    return { errors, changes: out };
  }
  for (const key of Object.keys(c) as (keyof ProposalChanges)[]) {
    if (c[key] !== undefined && !schema.allowed.includes(key))
      add(key, `Cannot be set in a ${input.kind} proposal.`);
  }
  for (const field of schema.required) {
    const value = c[field];
    if (Array.isArray(value) ? value.length === 0 : !text(value)) add(field, 'Required.');
  }
  if (input.kind !== 'create') {
    if (!input.itemId) add('itemId', 'Required.');
    if (!isUuid(input.baseVersionId))
      add('baseVersionId', 'Required: the version this proposal is based on.');
    if (schema.allowed.every((f) => c[f] === undefined))
      add('changes', 'Propose at least one change.');
  }
  // A change may leave a field out, but never empty it (BR1.2).
  for (const field of ['title', 'content', 'owners'] as const) {
    if (schema.required.includes(field) || c[field] === undefined) continue;
    const value = c[field];
    if (Array.isArray(value) ? value.length === 0 : !text(value)) add(field, 'Cannot be empty.');
  }

  if (text(c.title).length > 200) add('title', 'At most 200 characters.');
  const type = text(c.type);
  if (type && !(ITEM_TYPES as readonly string[]).includes(type)) {
    add('type', `Must be one of: ${ITEM_TYPES.join(', ')}.`);
  }

  for (const [i, owner] of (c.owners ?? []).entries()) {
    if (!['user', 'group', 'agent'].includes(owner?.kind) || !text(owner?.ref_id)) {
      add(`owners[${i}]`, 'Must name a person, group or agent.');
    }
  }
  for (const [i, source] of (c.sources ?? []).entries()) {
    if (!text(source?.title)) add(`sources[${i}].title`, 'Required.');
    else if (text(source.title).length > 200) add(`sources[${i}].title`, 'At most 200 characters.');
    if (source?.url !== undefined && !isHttpUrl(source.url))
      add(`sources[${i}].url`, 'Must be an http or https address.');
  }
  for (const list of ['addLinks', 'removeLinks'] as const) {
    for (const [i, link] of (c[list] ?? []).entries()) {
      if (!isUuid(link?.toItemId)) add(`${list}[${i}].toItemId`, 'Must be an item id.');
      if (!(LINK_TYPES as readonly string[]).includes(link?.linkType)) {
        add(`${list}[${i}].linkType`, `Must be one of: ${LINK_TYPES.join(', ')}.`);
      }
    }
  }

  // Keep only what the kind allows, trimmed: this is what is stored and later applied.
  if (c.title !== undefined) out.title = text(c.title);
  if (c.type !== undefined) out.type = type;
  if (c.content !== undefined) out.content = text(c.content);
  if (c.why !== undefined) out.why = c.why === null ? null : text(c.why) || null;
  if (c.owners)
    out.owners = c.owners.map((o): OwnerRef => ({ kind: o.kind, ref_id: text(o.ref_id) }));
  if (c.sources)
    out.sources = c.sources.map((s) => ({
      title: text(s.title),
      ...(s.url ? { url: s.url } : {}),
    }));
  if (c.addLinks)
    out.addLinks = c.addLinks.map((l) => ({ toItemId: l.toItemId, linkType: l.linkType }));
  if (c.removeLinks)
    out.removeLinks = c.removeLinks.map((l) => ({ toItemId: l.toItemId, linkType: l.linkType }));
  return { errors, changes: out };
}

function isHttpUrl(value: unknown) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
