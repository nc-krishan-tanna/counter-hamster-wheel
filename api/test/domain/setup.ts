import { randomUUID } from 'node:crypto';
import { freshDatabase, type TestDb } from '../../../test/postgres.ts';
import { seedOrganisations, type Seeded, type SeededOrg } from '../../../test/fixtures.ts';
import type { Principal } from '../../src/access/principal.ts';
import { createDb, type Db } from '../../src/db/pool.ts';
import { decide } from '../../src/domain/decide.ts';
import { propose, type ProposalInput } from '../../src/domain/propose.ts';
import { etagOf } from '../../src/domain/etag.ts';

export const userPrincipal = (org: SeededOrg, id: string, role = 'Contributor'): Principal => ({
  kind: 'user',
  id,
  role,
  organisationId: org.organisationId,
});

export const agentPrincipal = (org: SeededOrg, role = 'Contributor'): Principal => ({
  kind: 'service-account',
  id: org.agent.serviceAccountId,
  role,
  organisationId: org.organisationId,
});

export interface DomainFixture {
  t: TestDb;
  s: Seeded;
  db: Db;
  owner: Principal;
  contributor: Principal;
  agent: Principal;
  globexOwner: Principal;
  /** A valid create proposal input owned by the Owners group. */
  createInput(overrides?: Partial<ProposalInput['changes']>): ProposalInput;
  /** Proposes and approves (owner, self-approved) a new item; returns its ids. */
  createItem(
    title?: string,
    org?: 'acme' | 'globex',
  ): Promise<{ itemId: string; versionId: string }>;
  close(): Promise<void>;
}

export async function domainFixture(): Promise<DomainFixture> {
  const t = await freshDatabase();
  const s = await seedOrganisations(t);
  const db = createDb(t.url('ce_api'));
  const owner = userPrincipal(s.acme, s.acme.ownerId);
  const globexOwner = userPrincipal(s.globex, s.globex.ownerId);
  const createInput = (overrides: Partial<ProposalInput['changes']> = {}): ProposalInput => ({
    kind: 'create',
    reason: 'We keep answering this question',
    changes: {
      title: 'Purchase approval',
      type: 'business-rule-or-policy',
      content: 'Purchases over 1000 need two approvals.',
      why: 'Fraud control',
      owners: [{ kind: 'group', ref_id: s.acme.groupId }],
      sources: [{ title: 'Finance handbook', url: 'https://handbook.example/finance' }],
      ...overrides,
    },
  });
  return {
    t,
    s,
    db,
    owner,
    contributor: userPrincipal(s.acme, s.acme.contributorId),
    agent: agentPrincipal(s.acme),
    globexOwner,
    createInput,
    async createItem(title = 'Item', org = 'acme') {
      const who = org === 'acme' ? owner : globexOwner;
      const groupId = org === 'acme' ? s.acme.groupId : s.globex.groupId;
      const input = createInput({ title, owners: [{ kind: 'group', ref_id: groupId }] });
      const proposal = await propose(db, who, input, {
        idempotencyKey: randomUUID(),
        channel: 'web',
      });
      const result = await decide(db, who, {
        proposalId: proposal.proposalId,
        outcome: 'approve',
        ifMatch: etagOf(proposal),
      });
      return { itemId: proposal.itemId, versionId: result.versionId! };
    },
    async close() {
      await db.destroy();
      await t.close();
    },
  };
}
