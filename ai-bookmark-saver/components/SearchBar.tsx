'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const EXAMPLE_QUERIES = [
  'that video about sleep and memory',
  'articles on startup fundraising',
  'design inspiration for mobile apps',
  'procrastination and neuroscience',
];

interface SearchBarProps {
  initialValue?: string;
}

export default function SearchBar({ initialValue = '' }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);
  const [placeholder, setPlaceholder] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const exampleIndex = useRef(0);

  // Rotate placeholder example queries
  useEffect(() => {
    let charIndex = 0;
    let example = EXAMPLE_QUERIES[exampleIndex.current];
    let typing = true;

    const tick = setInterval(() => {
      if (typing) {
        charIndex++;
        setPlaceholder('Try: "' + example.slice(0, charIndex) + '"');
        if (charIndex >= example.length) {
          typing = false;
          setTimeout(() => {
            // Erase
            const erase = setInterval(() => {
              charIndex--;
              setPlaceholder('Try: "' + example.slice(0, charIndex) + '"');
              if (charIndex === 0) {
                clearInterval(erase);
                exampleIndex.current = (exampleIndex.current + 1) % EXAMPLE_QUERIES.length;
                example = EXAMPLE_QUERIES[exampleIndex.current];
                typing = true;
              }
            }, 30);
          }, 2000);
        }
      }
    }, 60);

    return () => clearInterval(tick);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);

    clearTimeout(debounceRef.current);
    if (val.trim()) {
      debounceRef.current = setTimeout(() => {
        router.push(`/search?q=${encodeURIComponent(val.trim())}`);
      }, 300);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearTimeout(debounceRef.current);
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-72">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </span>
      <input
        type="search"
        value={query}
        onChange={handleChange}
        placeholder={placeholder || 'Search bookmarks…'}
        className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
      />
    </form>
  );
}
