'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { signOut, useSession } from 'next-auth/react';

interface Collection {
  id: string;
  name: string;
  emoji?: string | null;
  _count?: { bookmarks: number };
}

export default function CollectionSidebar() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('');

  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ['collections'],
    queryFn: async () => {
      const res = await fetch('/api/collections');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; emoji?: string }) => {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create collection');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setShowCreate(false);
      setNewName('');
      setNewEmoji('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/collections/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate({ name: newName.trim(), emoji: newEmoji || undefined });
  }

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-100">
        <span className="text-base font-bold text-slate-900">🔖 Bookmark AI</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {/* All bookmarks */}
        <Link
          href="/"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
            pathname === '/'
              ? 'bg-blue-50 text-blue-700'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          All Bookmarks
        </Link>

        {/* Divider */}
        <div className="pt-3 pb-1 px-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Collections
            </span>
            <button
              onClick={() => setShowCreate(true)}
              className="text-slate-400 hover:text-slate-600 transition"
              title="New collection"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Collections list */}
        {collections.map((c) => {
          const href = `/collections/${c.id}`;
          const active = pathname === href;
          return (
            <div key={c.id} className="group flex items-center">
              <Link
                href={href}
                className={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                  active
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{c.emoji ?? '📁'}</span>
                <span className="truncate">{c.name}</span>
                {c._count !== undefined && (
                  <span className="ml-auto text-xs text-slate-400">
                    {c._count.bookmarks}
                  </span>
                )}
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Delete collection "${c.name}"? Bookmarks won't be deleted.`)) {
                    deleteMutation.mutate(c.id);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-400 transition mr-1"
                title="Delete collection"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}

        {collections.length === 0 && (
          <p className="text-xs text-slate-400 px-3 py-2">No collections yet</p>
        )}
      </nav>

      {/* User footer */}
      {session?.user && (
        <div className="border-t border-slate-100 px-4 py-3 flex items-center gap-2.5">
          {session.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt={session.user.name ?? ''}
              className="w-7 h-7 rounded-full"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
              {session.user.name?.[0]?.toUpperCase() ?? session.user.email?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">
              {session.user.name ?? session.user.email}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-slate-400 hover:text-slate-600 transition"
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      )}

      {/* Create collection modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-900">New Collection</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newEmoji}
                  onChange={(e) => setNewEmoji(e.target.value)}
                  placeholder="🗂️"
                  maxLength={2}
                  className="w-14 border border-slate-300 rounded-lg px-2 py-2 text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Collection name"
                  autoFocus
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setNewName('');
                    setNewEmoji('');
                  }}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim() || createMutation.isPending}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition"
                >
                  {createMutation.isPending ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
