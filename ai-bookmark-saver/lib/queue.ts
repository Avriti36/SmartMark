import { Queue } from 'bullmq';
import Redis from 'ioredis';

export const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

export const bookmarkQueue = new Queue('bookmark-processing', { connection });

/**
 * Enqueue a full content-processing job (cache MISS).
 * The worker processes the URL once and updates all linked Bookmark rows.
 */
export async function enqueueProcessContent(processedContentId: string) {
  await bookmarkQueue.add(
    'process-content',
    { processedContentId },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  );
}

/**
 * Enqueue a lightweight cache-HIT job.
 * No AI calls needed — just upsert the Pinecone vector for the new bookmark
 * using embedding values already stored in ProcessedContent.
 */
export async function enqueuePineconeUpsert(bookmarkId: string) {
  await bookmarkQueue.add(
    'upsert-vector',
    { bookmarkId },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 50 },
    }
  );
}
