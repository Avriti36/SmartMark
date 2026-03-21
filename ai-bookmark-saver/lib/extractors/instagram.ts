import { ApifyClient } from '@apify/client';
import {
  GoogleGenerativeAI,
  FileState,
  GoogleAIFileManager,
} from '@google/generative-ai';
import { BookmarkAIResult, parseAIResult } from '../types';
import { downloadFile, uploadBuffer } from '../storage';

const apify = new ApifyClient({ token: process.env.APIFY_API_TOKEN! });
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);

const IMAGE_PROMPT = (caption: string) => `This is an Instagram post. The caption is: "${caption}"

Analyze the image and caption together. Return JSON:
- title: string (short descriptive title for the post)
- summary: string (2-4 sentences describing what is shown/discussed)
- key_topics: string[]
- category: string (one of: Technology / Science / Health / Finance / Business / Design / Education / Entertainment / News / Food / Travel / Sports / Philosophy / History / Art / Other)
- content_type: string ("Photo", "Infographic", "Meme", "Screenshot", "Illustration", "Other")
- searchable_context: string

Return ONLY valid JSON.`;

const VIDEO_PROMPT = (caption: string) => `This is an Instagram reel/video. Caption: "${caption}".
Analyze the video content and caption together. Return JSON:
- title: string (short descriptive title for the post)
- summary: string (2-4 sentences describing what is shown/discussed)
- key_topics: string[]
- category: string (one of: Technology / Science / Health / Finance / Business / Design / Education / Entertainment / News / Food / Travel / Sports / Philosophy / History / Art / Other)
- content_type: string ("Reel", "Video", "Tutorial", "Vlog")
- searchable_context: string

Return ONLY valid JSON.`;

interface ApifyInstagramPost {
  caption?: string;
  imageUrl?: string;
  videoUrl?: string;
  type?: 'Image' | 'Video' | 'Sidecar';
  ownerUsername?: string;
  timestamp?: string;
  displayUrl?: string;
}

/**
 * Process an Instagram post URL.
 * Step 1: Scrape with Apify (handles auth, CDN, all post types)
 * Step 2: Download media immediately (CDN URLs expire in hours)
 * Step 3: Send to Gemini for AI understanding
 */
export async function processInstagram(instagramUrl: string): Promise<BookmarkAIResult> {
  // Step 1: Fetch post data via Apify
  const run = await apify.actor('apify/instagram-scraper').call({
    directUrls: [instagramUrl],
    resultsType: 'posts',
    resultsLimit: 1,
  });

  const { items } = await apify.dataset(run.defaultDatasetId).listItems();
  const post = items[0] as ApifyInstagramPost | undefined;

  if (!post) {
    throw new Error('Instagram post not found or is private');
  }

  const caption = post.caption ?? '';
  const isVideo = post.type === 'Video' || Boolean(post.videoUrl);
  const mediaUrl = isVideo ? post.videoUrl : (post.imageUrl ?? post.displayUrl);

  if (!mediaUrl) {
    throw new Error('No media URL found in Instagram post');
  }

  // Step 2: Download media immediately before CDN URL expires
  const mediaBuffer = await downloadFile(mediaUrl);

  // Step 3: Analyze with Gemini
  if (isVideo) {
    return analyzeVideo(mediaBuffer, caption, post.ownerUsername);
  } else {
    return analyzeImage(mediaBuffer, mediaUrl, caption, post.ownerUsername);
  }
}

async function analyzeImage(
  imageBuffer: Buffer,
  originalUrl: string,
  caption: string,
  author?: string
): Promise<BookmarkAIResult> {
  const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Detect mime type from URL or default to jpeg
  const ext = originalUrl.split('.')[0]?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  const base64Image = imageBuffer.toString('base64');

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: { mimeType, data: base64Image },
          },
          { text: IMAGE_PROMPT(caption) },
        ],
      },
    ],
  });

  const parsed = parseAIResult(result.response.text());

  // Upload downloaded image to S3/R2 for permanent thumbnail
  const thumbnailKey = `thumbnails/instagram-${Date.now()}.jpg`;
  const permanentUrl = await uploadBuffer(imageBuffer, thumbnailKey, mimeType);

  return { ...parsed, author, thumbnail_url: permanentUrl };
}

async function analyzeVideo(
  videoBuffer: Buffer,
  caption: string,
  author?: string
): Promise<BookmarkAIResult> {
  // Upload to Gemini File API (handles larger files)
  const uploadResult = await fileManager.uploadFile(videoBuffer as unknown as string, {
    mimeType: 'video/mp4',
    displayName: `instagram-reel-${Date.now()}`,
  });

  // Wait for Gemini to process the file
  let file = await fileManager.getFile(uploadResult.file.name);
  let attempts = 0;
  while (file.state === FileState.PROCESSING && attempts < 30) {
    await new Promise((r) => setTimeout(r, 2000));
    file = await fileManager.getFile(uploadResult.file.name);
    attempts++;
  }

  if (file.state !== FileState.ACTIVE) {
    throw new Error(`Gemini file processing failed: ${file.state}`);
  }

  try {
    const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { fileData: { mimeType: 'video/mp4', fileUri: file.uri } },
            { text: VIDEO_PROMPT(caption) },
          ],
        },
      ],
    });

    const parsed = parseAIResult(result.response.text());
    return { ...parsed, author, thumbnail_url: null };
  } finally {
    // Always clean up the Gemini file after processing
    await fileManager.deleteFile(file.name).catch(console.warn);
  }
}
