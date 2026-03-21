/**
 * Normalise a URL to its canonical form before cache lookup.
 *
 * The same content can arrive via many URL variants:
 *   https://www.youtube.com/watch?v=abc123&feature=share
 *   https://youtu.be/abc123
 *   https://youtube.com/watch?v=abc123
 * All three should resolve to the same ProcessedContent row.
 */
export function normaliseUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }

  // YouTube: extract video ID and produce canonical form
  const ytMatch = rawUrl.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) return `https://www.youtube.com/watch?v=${ytMatch[1]}`;

  // Instagram: strip trailing slash and query params
  if (url.hostname.includes('instagram.com')) {
    return `https://www.instagram.com${url.pathname.replace(/\/$/, '')}`;
  }

  // Twitter/X: normalise to x.com, strip query params
  if (url.hostname.includes('twitter.com') || url.hostname.includes('x.com')) {
    return `https://x.com${url.pathname.replace(/\/$/, '')}`;
  }

  // General web: strip common tracking params, normalise trailing slash
  const TRACKING_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'fbclid', 'gclid', 'ref', 'mc_cid', 'mc_eid',
  ];
  const cleanUrl = new URL(rawUrl.trim());
  TRACKING_PARAMS.forEach((p) => cleanUrl.searchParams.delete(p));

  return cleanUrl.toString().replace(/\/$/, '');
}

/**
 * Detect the platform from a normalised URL.
 */
export function detectPlatform(url: string): 'youtube' | 'instagram' | 'twitter' | 'web' {
  if (/youtube\.com\/(watch|shorts)|youtu\.be\//.test(url)) return 'youtube';
  if (/instagram\.com\/(p|reel|tv)\//.test(url)) return 'instagram';
  if (/twitter\.com\/|x\.com\//.test(url)) return 'twitter';
  return 'web';
}
