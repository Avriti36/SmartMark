import { db } from '../lib/db';
import { detectPlatform } from '../lib/utils/normaliseUrl';
import { generateEmbedding, buildEmbeddingText } from '../lib/embeddings';
import { upsertBookmarkVector } from '../lib/pinecone';
import { uploadThumbnail } from '../lib/storage';
import { processYouTube } from '../lib/extractors/youtube';
import { processTwitter } from '../lib/extractors/twitter';
import { processInstagram } from '../lib/extractors/instagram';
import { processWebLink } from '../lib/extractors/web';
import type { BookmarkAIResult } from '../lib/types';

/**
 * Full content processing job (cache MISS).
 * Called by the worker for new URLs that have never been processed.
 * Processes the content ONCE and updates all Bookmark rows linked to this ProcessedContent.
 */
export async function processContent(processedContentId: string): Promise<void> {
  const content = await db.processedContent.findUnique({
    where: { id: processedContentId },
    include: { bookmarks: true },
  });

  if (!content) throw new Error(`ProcessedContent not found: ${processedContentId}`);
  if (content.status === 'done') {
    console.log(`[processor] Already done: ${processedContentId} — skipping`);
    return;
  }

  await db.processedContent.update({
    where: { id: processedContentId },
    data: { status: 'processing' },
  });

  try {
    const platform = detectPlatform(content.normalisedUrl);
    let aiResult: BookmarkAIResult;

    console.log(`[processor] Processing ${platform} URL: ${content.normalisedUrl}`);

    switch (platform) {
      case 'youtube':
        aiResult = await processYouTube(content.normalisedUrl);
        break;
      case 'twitter':
        aiResult = await processTwitter(content.normalisedUrl);
        break;
      case 'instagram':
        aiResult = await processInstagram(content.normalisedUrl);
        break;
      default:
        aiResult = await processWebLink(content.normalisedUrl);
    }

    // Generate embedding ONCE for this URL
    const textToEmbed = buildEmbeddingText(
      aiResult.title,
      aiResult.summary,
      aiResult.searchable_context
    );
    const embeddingValues = await generateEmbedding(textToEmbed);

    // Upload thumbnail once to permanent storage
    const thumbnailUrl = aiResult.thumbnail_url
      ? await uploadThumbnail(aiResult.thumbnail_url, processedContentId)
      : null;

    // Persist AI results and embedding values to ProcessedContent
    await db.processedContent.update({
      where: { id: processedContentId },
      data: {
        title: aiResult.title,
        summary: aiResult.summary,
        keyTopics: aiResult.key_topics,
        category: aiResult.category,
        contentType: aiResult.content_type,
        searchableContext: aiResult.searchable_context,
        authorHandle: aiResult.author ?? null,
        thumbnailUrl,
        embeddingValues,
        status: 'done',
        processedAt: new Date(),
        errorMessage: null,
      },
    });

    // Update all Bookmark rows linked to this content (may be > 1 if concurrent saves)
    await db.bookmark.updateMany({
      where: { processedContentId },
      data: { status: 'done', errorMessage: null },
    });

    // Upsert one Pinecone vector per Bookmark (per user) — all same embedding values
    for (const bookmark of content.bookmarks) {
      try {
        await upsertBookmarkVector(
          bookmark.id,
          bookmark.userId,
          platform,
          aiResult.category,
          bookmark.collectionId ?? null,
          embeddingValues
        );
      } catch (pineconeErr) {
        console.error(`[processor] Pinecone upsert failed for bookmark ${bookmark.id}:`, pineconeErr);
        // Don't fail the whole job — Pinecone upsert will be retried on next search
      }
    }

    console.log(`[processor] Done: ${processedContentId} (${platform})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[processor] Failed: ${processedContentId}:`, message);

    await db.processedContent.update({
      where: { id: processedContentId },
      data: { status: 'failed', errorMessage: message },
    });

    await db.bookmark.updateMany({
      where: { processedContentId },
      data: { status: 'failed', errorMessage: message },
    });

    throw error; // Re-throw so BullMQ can retry
  }
}

/**
 * Lightweight Pinecone upsert job (cache HIT).
 * The embedding values are already stored in ProcessedContent —
 * we just need to create a Pinecone entry for the new user's Bookmark.
 */
export async function upsertVectorForBookmark(bookmarkId: string): Promise<void> {
  const bookmark = await db.bookmark.findUnique({
    where: { id: bookmarkId },
    include: { processedContent: true },
  });

  if (!bookmark) throw new Error(`Bookmark not found: ${bookmarkId}`);

  const { processedContent } = bookmark;

  if (processedContent.status !== 'done' || !processedContent.embeddingValues.length) {
    throw new Error(`ProcessedContent not ready for bookmark ${bookmarkId}`);
  }

  const platform = detectPlatform(processedContent.normalisedUrl);
  const category = bookmark.categoryOverride ?? processedContent.category ?? 'Other';

  await upsertBookmarkVector(
    bookmarkId,
    bookmark.userId,
    platform,
    category,
    bookmark.collectionId ?? null,
    processedContent.embeddingValues
  );

  await db.bookmark.update({
    where: { id: bookmarkId },
    data: { status: 'done' },
  });
}
