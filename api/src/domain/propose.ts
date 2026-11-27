/**
 * Raising a proposal (W1 create, W2 change or link, W3 through MCP). Nothing goes live here
 * (BR1.1): the proposal is recorded open, after the checks of BR1.2 to BR1.6 and BR5.1.
 */
import { createHash, randomUUID } from 'node:crypto';
import type { ProposalChanges } from '@ce/db/schema';
import { canPropose, type Principal } from '../access/principal.ts';
import type { Db } from '../db/pool.ts';
import { withOrganisation, type OrgTransaction } from '../db/with-organisation.ts';
import { existingItemIds, findLiveLink, getVersion } from '../repo/items.ts';
import { activeServiceAccounts, activeUsers, groupsWithMemberCounts } from '../repo/principals.ts';
import {
  findProposalByKey,
  IdempotencyKeyConflict,
  insertProposal,
  type ProposalRow,
} from '../repo/proposals.ts';
import { ProblemError, notFound, type FieldError } from './errors.ts';
import { isUuid, validateShape } from './proposal-schema.ts';

export interface ProposalInput {
  kind: string;
  itemId?: string;
  baseVersionId?: string;
  reason: string;
  changes: ProposalChanges;
}

export interface ProposeOptions {
  idempotencyKey: string;
  /**
   * The channel the request came through. shortcut: no column records it; the version's system
   * source derives it from the origin (people use the web page, agents MCP). Store it when people
   * get API tokens (U2).
   */
  channel: 'web' | 'mcp';
}

/** Same key, same request: stable over key order and surrounding whitespace (BR1.7). */
export function requestHash(input: ProposalInput): string {
  const canonical = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(canonical)
      : value && typeof value === 'object'
        ? Object.fromEntries(
            Object.entries(value)
              .filter(([, v]) => v !== undefined)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => [k, canonical(v)]),
          )
        : typeof value === 'string'
          ? value.trim()
          : value;
  const { kind, itemId, baseVersionId, reason, changes } = input;
  return createHash('sha256')
    .update(JSON.stringify(canonical({ kind, itemId, baseVersionId, reason, changes })))
    .digest('hex');
}

export async function propose(
  db: Db,
  principal: Principal,
  input: ProposalInput,
  options: ProposeOptions,
): Promise<ProposalRow> {
  if (!canPropose(principal)) throw new ProblemError('forbidden');
  const hash = requestHash(input);
  try {
    return await withOrganisation(db, principal.organisationId, async (trx) => {
      const replay = await findProposalByKey(trx, principal.id, options.idempotencyKey, hash);
      if (replay) return replay.proposal;

      const shape = validateShape(input);
      if (shape.errors.length > 0) throw new ProblemError('validation-failed', shape.errors);
      const errors = await validateAgainstData(trx, input, shape.changes);
      if (errors.length > 0) throw new ProblemError('validation-failed', errors);

      const isCreate = input.kind === 'create';
      const { proposal } = await insertProposal(trx, {
        kind: input.kind,
        itemId: isCreate ? randomUUID() : (input.itemId ?? ''),
        baseVersionId: isCreate ? null : (input.baseVersionId ?? null),
        changes: shape.changes,
        reason: input.reason.trim(),
        origin: principal.kind === 'user' ? 'person' : 'ai-agent',
        proposerKind: principal.kind,
        proposerId: principal.id,
        idempotencyKey: options.idempotencyKey,
        requestHash: hash,
      });
      return proposal;
    });
  } catch (error) {
    if (error instanceof IdempotencyKeyConflict) throw new ProblemError('conflict');
    throw error;
  }
}

/** Checks that need the organisation's data: the item, owners (BR1.4, BR6.3) and links (BR1.5). */
async function validateAgainstData(
  trx: OrgTransaction,
  input: ProposalInput,
  changes: ProposalChanges,
): Promise<FieldError[]> {
  const errors: FieldError[] = [];
  const isCreate = input.kind === 'create';
  // Shape validation guarantees both for every kind but create.
  const itemId = input.itemId ?? '';

  if (!isCreate) {
    if (!isUuid(itemId) || !(await existingItemIds(trx, [itemId])).has(itemId)) throw notFound();
    const base = await getVersion(trx, input.baseVersionId ?? '');
    if (!base || base.itemId !== itemId) {
      errors.push({ field: 'baseVersionId', message: 'Must be a version of this item.' });
    }
  }

  if (changes.owners) errors.push(...(await validateOwners(trx, changes.owners)));

  const targets = [...(changes.addLinks ?? []), ...(changes.removeLinks ?? [])].map(
    (l) => l.toItemId,
  );
  const approved = await existingItemIds(trx, targets);
  const seen = new Set<string>();
  for (const [i, link] of (changes.addLinks ?? []).entries()) {
    const field = `addLinks[${i}]`;
    const key = `${link.toItemId}|${link.linkType}`;
    if (!approved.has(link.toItemId) || link.toItemId === itemId) {
      errors.push({ field: `${field}.toItemId`, message: 'Must be another approved item.' });
    } else if (
      seen.has(key) ||
      (!isCreate && (await findLiveLink(trx, itemId, link.toItemId, link.linkType)))
    ) {
      errors.push({ field, message: 'This link already exists.' });
    }
    seen.add(key);
  }
  for (const [i, link] of (changes.removeLinks ?? []).entries()) {
    const live =
      approved.has(link.toItemId) &&
      (await findLiveLink(trx, itemId, link.toItemId, link.linkType));
    if (!live)
      errors.push({ field: `removeLinks[${i}]`, message: 'There is no such live link to remove.' });
  }
  return errors;
}

/** BR1.4: known, active entries of this organisation; at least one person or group with members. */
async function validateOwners(trx: OrgTransaction, owners: NonNullable<ProposalChanges['owners']>) {
  const errors: FieldError[] = [];
  const idsOf = (kind: string) => owners.filter((o) => o.kind === kind).map((o) => o.ref_id);
  const users = new Set((await activeUsers(trx, idsOf('user'))).map((u) => u.id));
  const groups = new Map(
    (await groupsWithMemberCounts(trx, idsOf('group').filter(isUuid))).map((g) => [
      g.groupId,
      Number(g.members),
    ]),
  );
  const agents = new Set(
    (await activeServiceAccounts(trx, idsOf('agent').filter(isUuid))).map((a) => a.id),
  );
  let humanOwner = false;
  for (const [i, owner] of owners.entries()) {
    const known =
      (owner.kind === 'user' && users.has(owner.ref_id)) ||
      (owner.kind === 'group' && groups.has(owner.ref_id)) ||
      (owner.kind === 'agent' && agents.has(owner.ref_id));
    if (!known)
      errors.push({ field: `owners[${i}]`, message: `Unknown or deactivated ${owner.kind}.` });
    if (owner.kind === 'user' && known) humanOwner = true;
    if (owner.kind === 'group' && (groups.get(owner.ref_id) ?? 0) > 0) humanOwner = true;
  }
  if (errors.length === 0 && !humanOwner) {
    errors.push({
      field: 'owners',
      message: 'At least one owner must be a person or a group with members.',
    });
  }
  return errors;
}
