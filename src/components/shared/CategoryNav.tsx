import { memo, useEffect, useRef } from 'react';

type Props = {
  categories: Record<string, any>[];
  activeId: number | null;
  onSelect: (id: number) => void;
};

export default memo(function CategoryNav({ categories, activeId, onSelect }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

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
    <nav ref={navRef} className="sticky top-20 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 overflow-x-auto scrollbar-hide">
      <div className="flex gap-1 px-4 py-2.5">
        {categories.map(cat => (
          <button
            key={cat.id}
            ref={cat.id === activeId ? activeRef : null}
            onClick={() => onSelect(cat.id)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
              cat.id === activeId
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </nav>
  );
});
