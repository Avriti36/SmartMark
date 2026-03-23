'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AddBookmarkForm from '@/components/AddBookmarkForm';
import BookmarkGrid from '@/components/BookmarkGrid';
import SearchBar from '@/components/SearchBar';
import CategoryFilter from '@/components/CategoryFilter';

export default function DashboardPage() {
  const [category, setCategory] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bookmarks', category, platform],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (platform) params.set('platform', platform);
      const res = await fetch(`/api/bookmarks?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch bookmarks');
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Bookmarks</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {data?.total ?? 0} saved
          </p>
        </div>
        <SearchBar />
      </div>

      {/* Add bookmark */}
      <AddBookmarkForm onSaved={() => refetch()} />

      {/* Filters */}
      <CategoryFilter
        activeCategory={category}
        activePlatform={platform}
        onCategoryChange={setCategory}
        onPlatformChange={setPlatform}
      />

      {/* Grid */}
      <BookmarkGrid
        bookmarks={data?.bookmarks ?? []}
        isLoading={isLoading}
        onDeleted={() => refetch()}
        onUpdated={() => refetch()}
      />
    </div>
  );
}
