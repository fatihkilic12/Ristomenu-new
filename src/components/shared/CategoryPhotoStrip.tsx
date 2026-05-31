import { memo, useEffect, useRef } from 'react';
import { absoluteMediaUrl } from '@/lib/branding';

// Horizontal photo strip variant of CategoryNav. Tap → scrollToCategory,
// active tile centred in the rail as the user scrolls.
//
// Memoized for a reason: the parent re-renders on every IntersectionObserver
// firing while the customer scrolls through the menu. Without memo the entire
// strip (N <img> tiles) reconciles on every tick, and combined with the
// sticky backdrop-blur this previously caused visible flashing + frame drops.
//
// Two other perf calls baked in here:
//   1. Opaque background — `bg-white` not `bg-white/85 backdrop-blur-xl`.
//      Backdrop-blur on a wide sticky element forces the GPU to re-blur the
//      whole content area on every scroll tick. Solid background is one
//      paint, no compositing.
//   2. Instant strip scroll — `behavior: 'auto'` (not 'smooth'). Multiple
//      smooth scrolls fired in quick succession (observer-driven active
//      changes during page scroll) overlap and visibly fight. Snapping
//      the active tile to centre is jankless and reads as snappy.

type Props = {
  categories: Record<string, any>[];
  activeId: number | null;
  onSelect: (id: number) => void;
};

export default memo(function CategoryPhotoStrip({ categories, activeId, onSelect }: Props) {
  const navRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const btn = activeRef.current;
    const nav = navRef.current;
    if (!btn || !nav) return;
    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const scrollLeft = nav.scrollLeft + btnRect.left - navRect.left - navRect.width / 2 + btnRect.width / 2;
    nav.scrollTo({ left: scrollLeft, behavior: 'auto' });
  }, [activeId]);

  return (
    <div
      ref={navRef}
      className="sticky top-20 z-30 bg-white border-b border-gray-100 overflow-x-auto scrollbar-hide"
    >
      <div className="flex gap-3 px-3 py-2.5">
        {categories.map(cat => {
          const isActive = cat.id === activeId;
          return (
            <button
              key={cat.id}
              ref={isActive ? activeRef : null}
              onClick={() => onSelect(cat.id)}
              data-strip-tile
              className="flex-shrink-0 w-24"
              aria-label={cat.name}
            >
              <div
                data-strip-thumb
                className={`w-24 h-24 rounded-xl overflow-hidden bg-gray-100 ${
                  isActive
                    ? 'ring-[3px] ring-[var(--color-primary)] ring-offset-2 shadow'
                    : 'border border-[var(--color-border)]'
                }`}
              >
                <img
                  src={absoluteMediaUrl(cat.image) ?? ''}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div
                data-category-label
                className={`mt-1.5 text-xs text-center line-clamp-2 leading-tight ${
                  isActive
                    ? 'font-bold text-[var(--color-primary)]'
                    : 'font-medium text-[var(--color-text)]'
                }`}
              >
                {cat.name}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
