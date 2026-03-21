'use client';

import { useState } from 'react';
import Image from 'next/image';
import PlatformBadge from './PlatformBadge';

interface ProcessedContent {
  title?: string | null;
  summary?: string | null;
  category?: string | null;
  thumbnailUrl?: string | null;
  platform: string;
  contentType?: string | null;
}

interface BookmarkCardProps {
  bookmark: {
    id: string;
    originalUrl: string;
    personalNote?: string | null;
    categoryOverride?: string | null;
    status: string;
    createdAt: string;
    processedContent: ProcessedContent;
    similarityScore?: number;
  };
  onDeleted?: () => void;
  onUpdated?: () => void;
  showScore?: boolean;
}

export default function BookmarkCard({
  bookmark,
  onDeleted,
  showScore,
}: BookmarkCardProps) {
  const [deleting, setDeleting] = useState(false);
  const { processedContent: pc } = bookmark;

  const effectiveCategory = bookmark.categoryOverride ?? pc.category;
  const title = pc.title ?? bookmark.originalUrl;
  const thumbnailUrl = pc.thumbnailUrl;

  async function handleDelete() {
    if (!confirm('Delete this bookmark?')) return;
    setDeleting(true);
    await fetch(`/api/bookmarks/${bookmark.id}`, { method: 'DELETE' });
    onDeleted?.();
  }

  return (
    <div className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col">
      {/* Thumbnail */}
      <a
        href={bookmark.originalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block aspect-video bg-slate-100 relative overflow-hidden"
      >
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
        )}
      </a>

      {/* Content */}
      <div className="flex-1 p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <PlatformBadge platform={pc.platform} />
          {effectiveCategory && (
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {effectiveCategory}
            </span>
          )}
        </div>

        <a
          href={bookmark.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 hover:text-blue-600 transition">
            {title}
          </h3>
        </a>

        {pc.summary && (
          <p className="text-xs text-slate-500 line-clamp-3">{pc.summary}</p>
        )}

        {bookmark.personalNote && (
          <p className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1 italic">
            "{bookmark.personalNote}"
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 flex items-center justify-between text-xs text-slate-400">
        <span>
          {new Date(bookmark.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
        <div className="flex items-center gap-2">
          {showScore && bookmark.similarityScore !== undefined && (
            <span className="text-emerald-600 font-medium">
              {Math.round(bookmark.similarityScore * 100)}% match
            </span>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition"
            title="Delete bookmark"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
