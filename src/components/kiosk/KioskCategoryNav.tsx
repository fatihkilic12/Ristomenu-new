import { memo, useEffect, useRef } from 'react';
import { IMAGE_ADDRESS, IMAGE_SERVER_ADDRESS } from '@/config/constants';

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
              <div className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center bg-white">
                {img ? (
                  <img src={img} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl opacity-60">🍽</span>
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
