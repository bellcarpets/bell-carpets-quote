/**
 * ScopeOfWorks — Clean flat list, document style.
 * No numbered timeline, no animation cascade — just the work items.
 */

interface ScopeItem {
  title: string;
  description: string;
}

interface ScopeOfWorksProps {
  items: ScopeItem[];
  areas?: string;
}

export default function ScopeOfWorks({ items, areas }: ScopeOfWorksProps) {
  // Build display items: areas as first item (if present), then scope item titles only
  const displayItems: string[] = [
    ...(areas && areas.trim() ? [areas.trim()] : []),
    ...items.map((item) => item.title).filter(Boolean),
  ];

  if (displayItems.length === 0) return null;

  return (
    <section className="mt-14">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-white/10" />
        <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-white/40">
          Scope of Works
        </h2>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Flat item list */}
      <div className="divide-y divide-white/[0.06]">
        {displayItems.map((title, i) => (
          <div key={i} className="flex items-center gap-4 py-3">
            <span className="text-[10px] font-medium text-white/20 w-5 flex-shrink-0 text-right tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-sm text-white/70">{title}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
