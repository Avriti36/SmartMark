'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import BookmarkGrid from '@/components/BookmarkGrid';
import SearchBar from '@/components/SearchBar';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['search', q],
    queryFn: async () => {
      if (!q) return { bookmarks: [], query: '' };
      const res = await fetch(`/api/bookmarks/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: Boolean(q),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {q ? `Results for "${q}"` : 'Search'}
          </h1>
          {data?.bookmarks?.length !== undefined && (
            <p className="text-sm text-slate-500 mt-0.5">
              {data.bookmarks.length} result{data.bookmarks.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <SearchBar initialValue={q} />
      </div>

      {!q && (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg mb-2">Search your bookmarks with natural language</p>
          <p className="text-sm">Try: "that video about sleep and memory" or "articles about startup growth"</p>
        </div>
      )}

      {q && (
        <BookmarkGrid
          bookmarks={data?.bookmarks ?? []}
          isLoading={isLoading}
          showScore
        />
      )}
    </div>
  );
}
