import OpenAI from 'openai';
import { BookmarkAIResult, parseAIResult } from '../types';

// xAI uses an OpenAI-compatible client
const xai = new OpenAI({
  apiKey: process.env.XAI_API_KEY!,
  baseURL: 'https://api.x.ai/v1',
});

/**
 * Process a Twitter/X post URL using xAI Grok with x_search tool.
 * Grok has native real-time access to X content including images and video.
 */
export async function processTwitter(tweetUrl: string): Promise<BookmarkAIResult> {
  const response = await xai.chat.completions.create({
    model: 'grok-2-latest',
    messages: [
      {
        role: 'user',
        content: `Analyze this Twitter/X post and return a JSON object: ${tweetUrl}

Fields required:
- title: string (first ~100 chars of tweet text or a short descriptive title)
- summary: string (2-4 sentences — what is this tweet/thread about, what is being said or shown)
- key_topics: string[] (topics, hashtags, concepts mentioned)
- category: string (Technology / Science / Health / Finance / Business / Design / Education / Entertainment / News / Food / Travel / Sports / Philosophy / History / Art / Other)
- content_type: string ("Tweet", "Thread", "Tweet with Image", "Tweet with Video")
- author_handle: string
- searchable_context: string (all specific names, topics, arguments, linked content referenced)

Return ONLY valid JSON.`,
      },
    ],
    // @ts-expect-error — xAI extends the OpenAI spec with x_search tool
    tools: [
      {
        type: 'x_search',
        enableImageUnderstanding: true,
        enableVideoUnderstanding: true,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '';
  if (!raw) throw new Error('Grok returned no content for tweet URL');

  const parsed = parseAIResult(raw);
  return {
    ...parsed,
    author: parsed.author,
    thumbnail_url: null, // Twitter media URLs are not stable; skip thumbnail
  };
}
