'use client';

const CATEGORIES = [
  'Technology', 'Science', 'Health', 'Finance', 'Business',
  'Design', 'Education', 'Entertainment', 'News', 'Food',
  'Travel', 'Sports', 'Philosophy', 'History', 'Art', 'Other',
];

const PLATFORMS = [
  { value: 'youtube',   label: 'YouTube'    },
  { value: 'instagram', label: 'Instagram'  },
  { value: 'twitter',   label: 'X / Twitter'},
  { value: 'web',       label: 'Web'        },
];

interface CategoryFilterProps {
  activeCategory: string | null;
  activePlatform: string | null;
  onCategoryChange: (cat: string | null) => void;
  onPlatformChange: (platform: string | null) => void;
}

export default function CategoryFilter({
  activeCategory,
  activePlatform,
  onCategoryChange,
  onPlatformChange,
}: CategoryFilterProps) {
  const hasActiveFilter = activeCategory || activePlatform;

  return (
    <div className="space-y-2">
      {/* Platform filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-500 font-medium">Platform:</span>
        {PLATFORMS.map((p) => (
          <button
            key={p.value}
            onClick={() =>
              onPlatformChange(activePlatform === p.value ? null : p.value)
            }
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              activePlatform === p.value
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-500 font-medium">Category:</span>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(activeCategory === cat ? null : cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              activeCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Clear filters */}
      {hasActiveFilter && (
        <button
          onClick={() => {
            onCategoryChange(null);
            onPlatformChange(null);
          }}
          className="text-xs text-blue-500 hover:text-blue-700 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
