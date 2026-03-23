import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth';

/**
 * GET /api/bookmarks/:id/status
 * Frontend polls this every 3 seconds while status === 'processing'.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const bookmark = await db.bookmark.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      processedContent: {
        select: {
          title: true,
          thumbnailUrl: true,
          summary: true,
          category: true,
          platform: true,
          status: true,
        },
      },
    },
  });

  if (!bookmark) {
    return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: bookmark.id,
    status: bookmark.status,
    title: bookmark.processedContent.title,
    thumbnail_url: bookmark.processedContent.thumbnailUrl,
    summary: bookmark.processedContent.summary,
    category: bookmark.categoryOverride ?? bookmark.processedContent.category,
    platform: bookmark.processedContent.platform,
    error: bookmark.errorMessage,
  });
}
