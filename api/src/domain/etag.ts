/** The proposal ETag `"<proposalId>:<status>"`: it changes when the proposal is decided or goes out of date (C1 If-Match). */
export const etagOf = (p: { proposalId: string; status: string }) =>
  `"${p.proposalId}:${p.status}"`;

/** The item ETag: its current version. */
export const itemEtag = (versionId: string) => `"${versionId}"`;
