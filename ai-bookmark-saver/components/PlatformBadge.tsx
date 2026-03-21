const PLATFORM_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  youtube:   { label: 'YouTube',   className: 'bg-red-100   text-red-700'   },
  instagram: { label: 'Instagram', className: 'bg-pink-100  text-pink-700'  },
  twitter:   { label: 'X / Twitter', className: 'bg-blue-100 text-blue-700' },
  web:       { label: 'Web',       className: 'bg-slate-100 text-slate-600' },
};

export default function PlatformBadge({ platform }: { platform: string }) {
  const config = PLATFORM_CONFIG[platform] ?? PLATFORM_CONFIG.web;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
