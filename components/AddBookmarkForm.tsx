'use client';

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import CollectionPicker from './CollectionPicker';

interface AddBookmarkFormProps {
  onSaved?: () => void;
  defaultCollectionId?: string;
}

export default function AddBookmarkForm({ onSaved, defaultCollectionId }: AddBookmarkFormProps) {
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [collectionId, setCollectionId] = useState<string | null>(defaultCollectionId ?? null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const res = await fetch('/api/collections');
      if (!res.ok) throw new Error('Failed');
      return res.json() as Promise<Array<{ id: string; name: string; emoji?: string | null }>>;
    },
  });

  function isValidUrl(val: string) {
    try { new URL(val); return true; } catch { return false; }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!isValidUrl(trimmed)) {
      setError('Please enter a valid URL (include https://)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: trimmed,
          personal_note: note.trim() || undefined,
          collection_id: collectionId || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Failed to save bookmark');
      }

      // Reset form
      setUrl('');
      setNote('');
      setExpanded(false);
      inputRef.current?.blur();

      // Trigger parent refresh — the new bookmark appears as a ProcessingCard
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3"
    >
      {/* URL input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError('');
              if (!expanded && e.target.value) setExpanded(true);
            }}
            onFocus={() => setExpanded(true)}
            placeholder="Paste a link to save — YouTube, Twitter, Instagram, or any website"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 rounded-lg transition whitespace-nowrap"
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving…
            </span>
          ) : (
            'Save'
          )}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Expanded options */}
      {expanded && (
        <div className="space-y-2 pt-1">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why are you saving this? (optional note)"
            rows={2}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
          />
          {collections && collections.length > 0 && (
            <CollectionPicker
              collections={collections}
              value={collectionId}
              onChange={setCollectionId}
            />
          )}
        </div>
      )}
    </form>
  );
}
