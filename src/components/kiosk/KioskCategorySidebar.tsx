import { memo, useEffect, useRef } from 'react';
import { IMAGE_ADDRESS, IMAGE_SERVER_ADDRESS } from '@/config/constants';

// McDonald's-style vertical sidebar: categories stack down the left edge
// of the kiosk surface, products live in a 2-column grid on the right.
// The horizontal counterpart (KioskCategoryNav) is still around for the
// older single-column layout — once everyone is on the new design we
// can remove it.
type Props = {
  categories: Record<string, any>[];
  activeId: number | null;
  onSelect: (id: number) => void;
};

function categoryImage(cat: Record<string, any>): string | null {
  const raw = cat.uri || (cat.image ? IMAGE_ADDRESS(cat.image) : null);
  if (!raw) return null;
  return raw.startsWith('/') ? `${IMAGE_SERVER_ADDRESS}${raw}` : raw;
}

export default memo(function KioskCategorySidebar({ categories, activeId, onSelect }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Keep the active category visible as the customer scrolls the
  // products panel — same idea as the horizontal version, just on the
  // y axis. scrollIntoView with block:'nearest' avoids jumping when
  // the user is already looking at the right row.
  useEffect(() => {
    activeRef.current?.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }, [activeId]);

  return (
    <aside
      ref={navRef}
      className="shrink-0 w-56 h-full overflow-y-auto scrollbar-hide bg-white border-r border-gray-100"
    >
      <div className="flex flex-col gap-3 px-4 py-5">
        {categories.map((cat) => {
          const isActive = cat.id === activeId;
          const img = categoryImage(cat);
          return (
            <button
              key={cat.id}
              ref={isActive ? activeRef : null}
              onClick={() => onSelect(cat.id)}
              className={`relative flex flex-col items-center gap-2.5 rounded-2xl border-2 transition-all px-2 pt-4 pb-3 ${
                isActive
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-sm'
                  : 'border-transparent bg-gray-50 active:bg-gray-100'
              }`}
            >
              {/* Active-rail accent on the left edge — makes the
                  selection feel anchored to the sidebar rather than
                  floating, the way McDonald's kiosks render it. */}
              {isActive && (
                <span aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 rounded-r-full bg-[var(--color-primary)]" />
              )}
              <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center bg-white ring-1 ring-inset ring-gray-100">
                {img ? (
                  <img src={img} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-9 h-9 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 2v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V2" />
                    <path d="M6 11v11" />
                    <path d="M19 15V2a4 4 0 0 0-4 4v6a2 2 0 0 0 2 2h2v8" />
                  </svg>
                )}
              </div>
              <span className={`text-[15px] font-bold leading-tight text-center line-clamp-2 ${
                isActive ? 'text-[var(--color-primary)]' : 'text-gray-700'
              }`}>
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
});
