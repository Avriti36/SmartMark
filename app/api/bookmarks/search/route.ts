import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth';
import { generateEmbedding } from '@/lib/embeddings';
import { searchBookmarkVectors } from '@/lib/pinecone';

/**
 * GET /api/bookmarks/search?q=...&category=...&platform=...&collectionId=...
 *
 * 1. Embed the natural language query
 * 2. Search Pinecone with metadata filters scoped to this user
 * 3. Fetch full bookmark records from Postgres in score order
 */
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();

  if (!q) {
    return NextResponse.json({ error: 'q parameter is required' }, { status: 400 });
  }

  const category = searchParams.get('category') ?? undefined;
  const platform = searchParams.get('platform') ?? undefined;
  const collectionId = searchParams.get('collectionId') ?? undefined;

  // Generate embedding for the search query
  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateEmbedding(q);
  } catch (err) {
    console.error('[search] Embedding generation failed:', err);
    return NextResponse.json({ error: 'Failed to process search query' }, { status: 500 });
  }

  // Search Pinecone — always filtered by userId to prevent cross-user leakage
  const searchResults = await searchBookmarkVectors(queryEmbedding, {
    userId: user.id,
    platform,
    category,
    collectionId,
  });

  if (searchResults.length === 0) {
    return NextResponse.json({ bookmarks: [], query: q });
  }

  // Fetch full bookmark records from Postgres
  const bookmarkIds = searchResults.map((r) => r.bookmarkId);
  const scoreMap = new Map(searchResults.map((r) => [r.bookmarkId, r.score]));

  const bookmarks = await db.bookmark.findMany({
    where: {
      id: { in: bookmarkIds },
      userId: user.id, // Double-check user ownership even though Pinecone is scoped
    },
    include: { processedContent: true, collection: true },
  });

  // Sort to match Pinecone score order
  bookmarks.sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0));

  // Attach similarity scores for optional display
  const results = bookmarks.map((b) => ({
    ...b,
    similarityScore: scoreMap.get(b.id) ?? 0,
  }));

  return NextResponse.json({ bookmarks: results, query: q });
}
