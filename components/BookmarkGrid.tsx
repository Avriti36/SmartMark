'use client';

import { useState, useCallback } from 'react';
import BookmarkCard from './BookmarkCard';
import ProcessingCard from './ProcessingCard';

interface Bookmark {
  id: string;
  originalUrl: string;
  personalNote?: string | null;
  categoryOverride?: string | null;
  status: string;
  createdAt: string;
  similarityScore?: number;
  processedContent: {
    title?: string | null;
    summary?: string | null;
    category?: string | null;
    thumbnailUrl?: string | null;
    platform: string;
    contentType?: string | null;
  };
}

interface BookmarkGridProps {
  bookmarks: Bookmark[];
  isLoading?: boolean;
  onDeleted?: () => void;
  onUpdated?: () => void;
  showScore?: boolean;
}

export default function BookmarkGrid({
  bookmarks,
  isLoading,
  onDeleted,
  onUpdated,
  showScore,
}: BookmarkGridProps) {
  // Track which processing cards have resolved (replaced by real data after polling)
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  const handleDone = useCallback(
    (id: string) => {
      setResolved((prev) => new Set([...prev, id]));
      onUpdated?.();
    },
    [onUpdated]
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden"
          >
            <div className="aspect-video bg-slate-100 animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 bg-slate-100 rounded animate-pulse w-5/6" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!bookmarks.length) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">🔖</div>
        <p className="text-slate-500 text-lg font-medium">No bookmarks yet</p>
        <p className="text-slate-400 text-sm mt-1">
          Paste a link above to save your first bookmark
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {bookmarks.map((bookmark) => {
        const isProcessing =
          bookmark.status === 'processing' && !resolved.has(bookmark.id);

        if (isProcessing) {
          return (
            <ProcessingCard
              key={bookmark.id}
              bookmarkId={bookmark.id}
              originalUrl={bookmark.originalUrl}
              onDone={() => handleDone(bookmark.id)}
            />
          );
        }

        if (bookmark.status === 'failed') {
          return (
            <div
              key={bookmark.id}
              className="bg-white rounded-xl border border-red-200 p-4 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2 text-red-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span className="text-sm font-medium">Failed to process</span>
              </div>
              <p className="text-xs text-slate-400 truncate">{bookmark.originalUrl}</p>
              <button
                onClick={() =>
                  fetch(`/api/bookmarks/${bookmark.id}`, { method: 'DELETE' }).then(
                    onDeleted
                  )
                }
                className="text-xs text-red-400 hover:text-red-600 self-start"
              >
                Remove
              </button>
            </div>
          );
        }

        return (
          <BookmarkCard
            key={bookmark.id}
            bookmark={bookmark}
            onDeleted={onDeleted}
            onUpdated={onUpdated}
            showScore={showScore}
          />
        );
      })}
    </div>
  );
}
