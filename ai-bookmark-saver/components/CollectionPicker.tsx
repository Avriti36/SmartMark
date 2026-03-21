'use client';

interface Collection {
  id: string;
  name: string;
  emoji?: string | null;
}

interface CollectionPickerProps {
  collections: Collection[];
  value: string | null;
  onChange: (id: string | null) => void;
}

export default function CollectionPicker({
  collections,
  value,
  onChange,
}: CollectionPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-slate-500 font-medium whitespace-nowrap">
        Add to collection:
      </label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
      >
        <option value="">None</option>
        {collections.map((c) => (
          <option key={c.id} value={c.id}>
            {c.emoji ? `${c.emoji} ` : ''}{c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
