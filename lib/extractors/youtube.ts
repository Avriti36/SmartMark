import { GoogleGenerativeAI } from '@google/generative-ai';
import { BookmarkAIResult, parseAIResult } from '../types';

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const YOUTUBE_PROMPT = `You are analyzing a YouTube video. Return a JSON object with the following fields:
- title: string (video title)
- summary: string (3-5 sentence summary of what the video is about, covering the main ideas, arguments, or narrative — write it as if explaining to someone who hasn't watched it)
- key_topics: string[] (5-10 key concepts, ideas, or subjects discussed)
- category: string (pick ONE from: Technology, Science, Health, Finance, Business, Design, Education, Entertainment, News, Food, Travel, Sports, Philosophy, History, Art, Other)
- content_type: string (e.g. "Tutorial", "Essay", "Interview", "Documentary", "Short", "Lecture", "Review")
- searchable_context: string (a dense paragraph of additional context — include any specific frameworks, named techniques, people mentioned, book titles, terminology — this is used for semantic search)

Return ONLY valid JSON. No markdown, no explanation.`;

/**
 * Process a YouTube video URL using Gemini's native video understanding.
 * Falls back to YouTube Data API v3 metadata if Gemini fails.
 */
export async function processYouTube(youtubeUrl: string): Promise<BookmarkAIResult> {
  // Step 1: Get thumbnail from oEmbed (no API key needed)
  const thumbnailUrl = await getYouTubeThumbnail(youtubeUrl);

  // Step 2: Try Gemini native video understanding
  try {
    const result = await analyzeWithGemini(youtubeUrl);
    return { ...result, thumbnail_url: thumbnailUrl };
  } catch (err) {
    console.warn('[youtube] Gemini video analysis failed, falling back to Data API:', err);
    return fallbackToDataApi(youtubeUrl, thumbnailUrl);
  }
}

async function analyzeWithGemini(youtubeUrl: string): Promise<BookmarkAIResult> {
  const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              mimeType: 'video/*',
              fileUri: youtubeUrl,
            },
          },
          { text: YOUTUBE_PROMPT },
        ],
      },
    ],
  });

  const raw = result.response.text();
  return parseAIResult(raw);
}

async function getYouTubeThumbnail(youtubeUrl: string): Promise<string | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`;
    const res = await fetch(oembedUrl);
    if (!res.ok) return null;
    const data = await res.json();
    return data.thumbnail_url ?? null;
  } catch {
    return null;
  }
}

async function fallbackToDataApi(
  youtubeUrl: string,
  thumbnailUrl: string | null
): Promise<BookmarkAIResult> {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_DATA_API_KEY not set — cannot fall back');

  const videoId = youtubeUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/)?.[1];
  if (!videoId) throw new Error('Could not extract video ID from URL');

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${apiKey}`
  );
  if (!res.ok) throw new Error(`YouTube Data API failed: ${res.status}`);

  const data = await res.json();
  const snippet = data.items?.[0]?.snippet;
  if (!snippet) throw new Error('No video data returned from YouTube Data API');

  // Summarize the title + description with Gemini text model
  const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const prompt = `You are analyzing a YouTube video. Here is the title and description:

Title: ${snippet.title}
Description: ${snippet.description}

${YOUTUBE_PROMPT}`;

  const result = await model.generateContent(prompt);
  const parsed = parseAIResult(result.response.text());

  return {
    ...parsed,
    title: parsed.title || snippet.title,
    thumbnail_url: thumbnailUrl ?? snippet.thumbnails?.high?.url ?? null,
  };
}
