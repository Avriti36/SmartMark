import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

function getIndex() {
  return pc.index(process.env.PINECONE_INDEX ?? 'bookmarks');
}

// ─── Upsert ───────────────────────────────────────────────────────────────────

export async function upsertBookmarkVector(
  bookmarkId: string,
  userId: string,
  platform: string,
  category: string,
  collectionId: string | null,
  embedding: number[]
): Promise<void> {
  const index = getIndex();
  await index.upsert([
    {
      id: bookmarkId,
      values: embedding,
      metadata: {
        userId,
        platform,
        category,
        collectionId: collectionId ?? '',
      },
    },
  ]);
}

// ─── Update metadata (e.g. after collection change) ──────────────────────────

export async function updateBookmarkVectorMetadata(
  bookmarkId: string,
  metadata: Record<string, string>
): Promise<void> {
  const index = getIndex();
  // Pinecone doesn't support partial metadata update; fetch existing vector first
  const fetchResult = await index.fetch([bookmarkId]);
  const existing = fetchResult.records[bookmarkId];
  if (!existing) return;

  await index.upsert([
    {
      id: bookmarkId,
      values: existing.values,
      metadata: { ...existing.metadata, ...metadata },
    },
  ]);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteBookmarkVector(bookmarkId: string): Promise<void> {
  const index = getIndex();
  await index.deleteOne(bookmarkId);
}

export async function deleteUserVectors(userId: string): Promise<void> {
  const index = getIndex();
  // Delete all vectors for a user — used when a user account is deleted
  await index.deleteMany({ userId });
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchFilters {
  userId: string;
  platform?: string;
  category?: string;
  collectionId?: string;
}

export interface SearchResult {
  bookmarkId: string;
  score: number;
}

export async function searchBookmarkVectors(
  queryEmbedding: number[],
  filters: SearchFilters,
  topK = 20
): Promise<SearchResult[]> {
  const index = getIndex();

  // Build metadata filter — Pinecone filter syntax
  const metadataFilter: Record<string, unknown> = { userId: { $eq: filters.userId } };
  if (filters.platform) metadataFilter.platform = { $eq: filters.platform };
  if (filters.category) metadataFilter.category = { $eq: filters.category };
  if (filters.collectionId) metadataFilter.collectionId = { $eq: filters.collectionId };

  const result = await index.query({
    vector: queryEmbedding,
    topK,
    filter: metadataFilter,
    includeMetadata: false,
    includeValues: false,
  });

  return (result.matches ?? []).map((m) => ({
    bookmarkId: m.id,
    score: m.score ?? 0,
  }));
}
