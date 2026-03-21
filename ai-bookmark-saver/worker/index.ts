import { Worker, Job } from 'bullmq';
import { connection } from '../lib/queue';
import { processContent, upsertVectorForBookmark } from './processor';

console.log('[worker] Starting bookmark processing worker...');

const worker = new Worker(
  'bookmark-processing',
  async (job: Job) => {
    console.log(`[worker] Processing job: ${job.name} (id=${job.id})`);

    switch (job.name) {
      case 'process-content':
        await processContent(job.data.processedContentId);
        break;

      case 'upsert-vector':
        await upsertVectorForBookmark(job.data.bookmarkId);
        break;

      default:
        console.warn(`[worker] Unknown job name: ${job.name}`);
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

worker.on('completed', (job) => {
  console.log(`[worker] Job completed: ${job.name} (id=${job.id})`);
});

worker.on('failed', (job, err) => {
  console.error(`[worker] Job failed: ${job?.name} (id=${job?.id}):`, err.message);
});

worker.on('error', (err) => {
  console.error('[worker] Worker error:', err);
});

process.on('SIGTERM', async () => {
  console.log('[worker] SIGTERM received — closing worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[worker] SIGINT received — closing worker...');
  await worker.close();
  process.exit(0);
});
