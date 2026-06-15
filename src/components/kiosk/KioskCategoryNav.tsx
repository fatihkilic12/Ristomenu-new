import { memo, useEffect, useRef } from 'react';
import { absoluteMediaUrl } from '@/lib/branding';

type Props = {
  categories: Record<string, any>[];
  activeId: number | null;
  onSelect: (id: number) => void;
};

// See KioskCategorySidebar — Category.image from the menu API is a URL
// path string, not an ID, so absoluteMediaUrl is the right resolver.
function categoryImage(cat: Record<string, any>): string | null {
  return absoluteMediaUrl(cat.image);
}

export default memo(function KioskCategoryNav({ categories, activeId, onSelect }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const btn = activeRef.current;
    const nav = navRef.current;
    if (!btn || !nav) return;
    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const scrollLeft = nav.scrollLeft + btnRect.left - navRect.left - navRect.width / 2 + btnRect.width / 2;
    nav.scrollTo({ left: scrollLeft, behavior: 'smooth' });
  }, [activeId]);

  return (
    <div
      ref={navRef}
      className="w-full overflow-x-auto scrollbar-hide bg-white border-b border-gray-100"
    >
      <div className="flex gap-4 px-6 py-5">
        {categories.map(cat => {
          const isActive = cat.id === activeId;
          const img = categoryImage(cat);
          return (
            <button
              key={cat.id}
              ref={isActive ? activeRef : null}
              onClick={() => onSelect(cat.id)}
              className={`shrink-0 flex flex-col items-center gap-3 rounded-2xl border-2 transition-all px-5 pt-4 pb-4 min-w-40 ${
                isActive
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-sm'
                  : 'border-transparent bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center bg-white ring-1 ring-inset ring-gray-100">
                {img ? (
                  <img src={img} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 2v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V2" />
                    <path d="M6 11v11" />
                    <path d="M19 15V2a4 4 0 0 0-4 4v6a2 2 0 0 0 2 2h2v8" />
                  </svg>
                )}
              </div>
              <span className={`text-lg font-bold leading-tight text-center max-w-40 line-clamp-2 ${
                isActive ? 'text-[var(--color-primary)]' : 'text-gray-700'
              }`}>
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
