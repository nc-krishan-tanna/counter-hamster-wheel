import type { OwnerRef, Source } from '@ce/db/schema';
import type { OrgTransaction } from '../db/with-organisation.ts';

export const SEARCH_MAX_RESULTS = 50;

export interface SearchResult {
  itemId: string;
  type: string;
  title: string;
  owners: OwnerRef[];
  sources: Source[];
  lastReviewedAt: Date | null;
}

/** Makes `%`, `_` and `\` literal inside an ILIKE pattern. */
const escapeLike = (text: string) => text.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * BR4.2: approved items only (current versions), matched on title or content.
 * shortcut: an ILIKE scan, fine for U1's few items; U14 replaces it with indexed full-text search.
 */
export async function searchItems(
  trx: OrgTransaction,
  text: string,
  options: { type?: string; limit?: number } = {},
): Promise<SearchResult[]> {
  const pattern = `%${escapeLike(text)}%`;
  let query = trx
    .selectFrom('items as i')
    .innerJoin('item_versions as v', 'v.version_id', 'i.current_version_id')
    .select([
      'i.item_id as itemId',
      'i.type',
      'v.title',
      'v.owners',
      'v.sources',
      'i.last_reviewed_at as lastReviewedAt',
    ])
    .where((eb) => eb.or([eb('v.title', 'ilike', pattern), eb('v.content', 'ilike', pattern)]))
    .orderBy('v.title')
    .limit(Math.min(options.limit ?? SEARCH_MAX_RESULTS, SEARCH_MAX_RESULTS));
  if (options.type) query = query.where('i.type', '=', options.type);
  return query.execute();
}
