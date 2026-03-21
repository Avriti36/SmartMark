'use client';

import { useEffect, useState } from 'react';

interface ProcessingCardProps {
  bookmarkId: string;
  originalUrl: string;
  onDone?: (data: {
    title?: string;
    thumbnail_url?: string;
    status: string;
  }) => void;
}

export default function ProcessingCard({
  bookmarkId,
  originalUrl,
  onDone,
}: ProcessingCardProps) {
  const [dots, setDots] = useState('.');

  // Animate the dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '.' : d + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Poll status every 3 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/bookmarks/${bookmarkId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'done' || data.status === 'failed') {
          onDone?.(data);
        }
      } catch {
        // Ignore polling errors — will retry
      }
    };

    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [bookmarkId, onDone]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Skeleton thumbnail */}
      <div className="aspect-video bg-slate-100 animate-pulse" />

      <div className="p-4 space-y-3">
        {/* Badge placeholder */}
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" />
          <div className="h-5 w-12 bg-slate-100 rounded-full animate-pulse" />
        </div>

        {/* Title placeholder */}
        <div className="space-y-1.5">
          <div className="h-4 bg-slate-100 rounded animate-pulse" />
          <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
        </div>

        {/* Summary placeholder */}
        <div className="space-y-1.5">
          <div className="h-3 bg-slate-100 rounded animate-pulse" />
          <div className="h-3 bg-slate-100 rounded animate-pulse w-5/6" />
          <div className="h-3 bg-slate-100 rounded animate-pulse w-4/6" />
        </div>

        {/* Status message */}
        <p className="text-xs text-blue-500 font-medium">
          AI is reading your link{dots}
        </p>

        <p className="text-xs text-slate-400 truncate">{originalUrl}</p>
      </div>
    </div>
  );
}
