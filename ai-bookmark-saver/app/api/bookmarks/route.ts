import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth';
import { normaliseUrl, detectPlatform } from '@/lib/utils/normaliseUrl';
import { enqueueProcessContent, enqueuePineconeUpsert } from '@/lib/queue';

// ─── POST /api/bookmarks ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  let body: { url?: string; personal_note?: string; collection_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url: rawUrl, personal_note, collection_id } = body;

  if (!rawUrl) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  let normalisedUrl: string;
  try {
    normalisedUrl = normaliseUrl(rawUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  const platform = detectPlatform(normalisedUrl);

  // Check if user already saved this URL
  const existingProcessedContent = await db.processedContent.findUnique({
    where: { normalisedUrl },
  });

  if (existingProcessedContent) {
    // Check if this user already has this bookmark
    const existingBookmark = await db.bookmark.findUnique({
      where: {
        userId_processedContentId: {
          userId: user.id,
          processedContentId: existingProcessedContent.id,
        },
      },
    });

    if (existingBookmark) {
      // Return existing bookmark silently (no duplicate)
      return NextResponse.json(existingBookmark, { status: 200 });
    }

    // Cache HIT — create Bookmark linked to existing ProcessedContent
    const bookmark = await db.bookmark.create({
      data: {
        userId: user.id,
        processedContentId: existingProcessedContent.id,
        originalUrl: rawUrl,
        personalNote: personal_note ?? null,
        collectionId: collection_id ?? null,
        // If content is done, status starts as 'processing' (just waiting for Pinecone upsert)
        // If content is still processing, status is also 'processing'
        status: 'processing',
      },
    });

    if (existingProcessedContent.status === 'done') {
      // Lightweight job: copy embeddings → upsert Pinecone → mark done
      await enqueuePineconeUpsert(bookmark.id);
    }
    // Else: the in-flight process-content job will update all linked bookmarks when done

    return NextResponse.json(bookmark, { status: 201 });
  }

  // Cache MISS — create ProcessedContent + Bookmark, enqueue full processing job
  const processedContent = await db.processedContent.create({
    data: {
      normalisedUrl,
      platform,
      status: 'pending',
    },
  });

  const bookmark = await db.bookmark.create({
    data: {
      userId: user.id,
      processedContentId: processedContent.id,
      originalUrl: rawUrl,
      personalNote: personal_note ?? null,
      collectionId: collection_id ?? null,
      status: 'processing',
    },
  });

  await enqueueProcessContent(processedContent.id);

  return NextResponse.json(bookmark, { status: 201 });
}

// ─── GET /api/bookmarks ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const platform = searchParams.get('platform');
  const collectionId = searchParams.get('collectionId');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20'));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { userId: user.id };

  if (collectionId === 'none') {
    where.collectionId = null;
  } else if (collectionId) {
    where.collectionId = collectionId;
  }

  if (platform) {
    where.processedContent = { ...(where.processedContent as object ?? {}), platform };
  }

  const [bookmarks, total] = await Promise.all([
    db.bookmark.findMany({
      where,
      include: { processedContent: true, collection: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.bookmark.count({ where }),
  ]);

  // Apply category filter (which may be an override or AI-assigned)
  const filtered = category
    ? bookmarks.filter(
        (b) =>
          (b.categoryOverride ?? b.processedContent.category) === category
      )
    : bookmarks;

  return NextResponse.json({
    bookmarks: filtered,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
