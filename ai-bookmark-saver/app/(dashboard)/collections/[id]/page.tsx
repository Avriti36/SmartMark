'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import BookmarkGrid from '@/components/BookmarkGrid';
import SearchBar from '@/components/SearchBar';

export default function CollectionPage() {
  const { id } = useParams<{ id: string }>();

  const { data: collection } = useQuery({
    queryKey: ['collection', id],
    queryFn: async () => {
      const res = await fetch(`/api/collections/${id}`);
      if (!res.ok) throw new Error('Collection not found');
      return res.json();
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bookmarks', 'collection', id],
    queryFn: async () => {
      const res = await fetch(`/api/bookmarks?collectionId=${id}`);
      if (!res.ok) throw new Error('Failed to fetch bookmarks');
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            {collection?.emoji && <span>{collection.emoji}</span>}
            {collection?.name ?? 'Collection'}
          </h1>
          {collection?.description && (
            <p className="text-sm text-slate-500 mt-0.5">{collection.description}</p>
          )}
        </div>
        <SearchBar />
      </div>

      <BookmarkGrid
        bookmarks={data?.bookmarks ?? []}
        isLoading={isLoading}
        onDeleted={() => refetch()}
        onUpdated={() => refetch()}
      />
    </div>
  );
}
