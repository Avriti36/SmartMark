import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth';
import { deleteBookmarkVector, updateBookmarkVectorMetadata } from '@/lib/pinecone';
import { detectPlatform } from '@/lib/utils/normaliseUrl';

// ─── GET /api/bookmarks/[id] ──────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const bookmark = await db.bookmark.findFirst({
    where: { id: params.id, userId: user.id },
    include: { processedContent: true, collection: true },
  });

  if (!bookmark) {
    return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
  }

  return NextResponse.json(bookmark);
}

// ─── PATCH /api/bookmarks/[id] ────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const bookmark = await db.bookmark.findFirst({
    where: { id: params.id, userId: user.id },
    include: { processedContent: true },
  });

  if (!bookmark) {
    return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
  }

  const body: {
    personal_note?: string;
    category_override?: string | null;
    collection_id?: string | null;
  } = await req.json();

  const updateData: Record<string, unknown> = {};
  if ('personal_note' in body) updateData.personalNote = body.personal_note;
  if ('category_override' in body) updateData.categoryOverride = body.category_override;
  if ('collection_id' in body) updateData.collectionId = body.collection_id;

  const updated = await db.bookmark.update({
    where: { id: params.id },
    data: updateData,
    include: { processedContent: true, collection: true },
  });

  // If collectionId changed, update Pinecone vector metadata
  if ('collection_id' in body && bookmark.status === 'done') {
    try {
      const platform = detectPlatform(bookmark.processedContent.normalisedUrl);
      const category =
        (updateData.categoryOverride as string | null | undefined) ??
        bookmark.categoryOverride ??
        bookmark.processedContent.category ??
        'Other';

      await updateBookmarkVectorMetadata(params.id, {
        collectionId: (body.collection_id as string | null) ?? '',
        category,
        platform,
      });
    } catch (err) {
      console.error('[api] Pinecone metadata update failed:', err);
      // Non-fatal — search will still work with slightly stale metadata
    }
  }

  return NextResponse.json(updated);
}

// ─── DELETE /api/bookmarks/[id] ───────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const bookmark = await db.bookmark.findFirst({
    where: { id: params.id, userId: user.id },
  });

  if (!bookmark) {
    return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
  }

  // Delete Postgres row first
  await db.bookmark.delete({ where: { id: params.id } });

  // Then delete Pinecone vector — ProcessedContent is NOT deleted
  try {
    await deleteBookmarkVector(params.id);
  } catch (err) {
    console.error('[api] Pinecone delete failed (non-fatal):', err);
  }

  return NextResponse.json({ success: true });
}
