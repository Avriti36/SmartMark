import { GoogleGenerativeAI } from '@google/generative-ai';
import { BookmarkAIResult, parseAIResult } from '../types';

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const WEB_PROMPT = (extractedText: string) => `You are analyzing the content of a web page. The extracted text is provided below.
Return a JSON object with:
- title: string (page or article title)
- summary: string (3-5 sentences covering the main argument, findings, or content)
- key_topics: string[] (5-10 concepts or subjects)
- category: string (pick ONE: Technology, Science, Health, Finance, Business, Design, Education, Entertainment, News, Food, Travel, Sports, Philosophy, History, Art, Other)
- content_type: string (e.g. "Article", "Blog Post", "News", "Product Page", "Documentation", "Recipe", "Research Paper")
- searchable_context: string (dense paragraph with all specific terms, names, methodologies, product names, book references for search)
- thumbnail_url: string | null (if an image URL is clearly the main article image from Open Graph data, include it; otherwise null)

Extracted content:
---
${extractedText.slice(0, 60000)}
---

Return ONLY valid JSON.`;

interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

/**
 * Process a general web URL.
 * Step 1: Fetch HTML and extract readable content (Defuddle or Readability.js)
 * Step 2: Send extracted text to Gemini for summarization
 */
export async function processWebLink(url: string): Promise<BookmarkAIResult> {
  const { text, ogData } = await extractContent(url);

  if (!text && !ogData.title) {
    throw new Error('Could not extract any content from the URL');
  }

  const contentToAnalyze = text || `Title: ${ogData.title}\nDescription: ${ogData.description}`;

  const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(WEB_PROMPT(contentToAnalyze));
  const parsed = parseAIResult(result.response.text());

  return {
    ...parsed,
    thumbnail_url: parsed.thumbnail_url ?? ogData.image ?? null,
  };
}

async function extractContent(
  url: string
): Promise<{ text: string; ogData: OpenGraphData }> {
  let html = '';
  let ogData: OpenGraphData = {};

  try {
    // Plain HTTP fetch first
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; AIBookmarkBot/1.0; +https://github.com/ai-bookmark-saver)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (res.ok) {
      html = await res.text();
    }
  } catch (err) {
    console.warn('[web] Plain HTTP fetch failed, content may be empty:', err);
  }

  if (!html) {
    return { text: '', ogData };
  }

  // Extract Open Graph metadata
  ogData = extractOpenGraph(html);

  // Try Defuddle first, fall back to Readability
  let text = '';
  try {
    const { Defuddle } = await import('defuddle');
    const { JSDOM } = await import('jsdom');
    const dom = new JSDOM(html, { url });
    const result = new Defuddle(dom.window.document).parse();
    text = result.content ?? '';
  } catch {
    try {
      const { Readability } = await import('@mozilla/readability');
      const { JSDOM } = await import('jsdom');
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      text = article?.textContent ?? '';
    } catch (err2) {
      console.warn('[web] Both Defuddle and Readability failed:', err2);
    }
  }

  return { text: text.trim(), ogData };
}

function extractOpenGraph(html: string): OpenGraphData {
  const og: OpenGraphData = {};

  const metaRegex = /<meta[^>]*(?:property|name)=["']([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*\/?>/gi;
  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    const prop = match[1].toLowerCase();
    const content = match[2];
    if (prop === 'og:title' || prop === 'twitter:title') og.title ??= content;
    if (prop === 'og:description' || prop === 'twitter:description') og.description ??= content;
    if (prop === 'og:image' || prop === 'twitter:image') og.image ??= content;
    if (prop === 'og:url') og.url ??= content;
  }

  // Fallback: <title> tag
  if (!og.title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) og.title = titleMatch[1].trim();
  }

  return og;
}
