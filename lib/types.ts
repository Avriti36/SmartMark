/**
 * Standardised output produced by all platform extractors after AI processing.
 * Every bookmark, regardless of platform, must produce this shape.
 */
export interface BookmarkAIResult {
  title: string;
  summary: string;
  key_topics: string[];
  category: string;
  content_type: string;
  searchable_context: string;
  author?: string;
  thumbnail_url?: string | null;
}

export const VALID_CATEGORIES = [
  'Technology', 'Science', 'Health', 'Finance', 'Business',
  'Design', 'Education', 'Entertainment', 'News', 'Food',
  'Travel', 'Sports', 'Philosophy', 'History', 'Art', 'Other',
] as const;

export type Category = (typeof VALID_CATEGORIES)[number];

/**
 * Parse a raw Gemini JSON response string into a BookmarkAIResult.
 * Strips markdown code fences if present.
 */
export function parseAIResult(raw: string): BookmarkAIResult {
  const clean = raw.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);

  if (!parsed.title || !parsed.summary) {
    throw new Error('AI result missing required fields (title, summary)');
  }

  return {
    title: String(parsed.title),
    summary: String(parsed.summary),
    key_topics: Array.isArray(parsed.key_topics) ? parsed.key_topics.map(String) : [],
    category: String(parsed.category ?? 'Other'),
    content_type: String(parsed.content_type ?? 'Other'),
    searchable_context: String(parsed.searchable_context ?? ''),
    author: parsed.author_handle ?? parsed.author ?? undefined,
    thumbnail_url: parsed.thumbnail_url ?? null,
  };
}
