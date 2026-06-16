import { memo, useEffect, useRef } from 'react';
import { absoluteMediaUrl } from '@/lib/branding';

// McDonald's-style vertical sidebar: categories stack down the left edge
// of the kiosk surface, products live in a 2-column grid on the right.
// The horizontal counterpart (KioskCategoryNav) is still around for the
// older single-column layout — once everyone is on the new design we
// can remove it.
//
// Colors derive from kiosk-shell CSS vars (set by KioskMenu based on the
// operator's menu_theme): --kiosk-card-bg, --kiosk-border, --kiosk-text.
// The active tile uses a solid primary-color fill so the selection pops
// regardless of how dark or light the brand color happens to be — the
// previous bg-[var(--color-primary)]/5 tint disappeared on dark brand
// palettes like the Matiate red/black scheme.
type Props = {
  categories: Record<string, any>[];
  activeId: number | null;
  onSelect: (id: number) => void;
  /** True when the sticky green cart bar is rendered at the bottom of
   *  the menu — we add bottom padding equal to that bar's height so the
   *  last category tiles stay scrollable to the user instead of sitting
   *  permanently hidden behind it. */
  cartVisible?: boolean;
};

// The storefront menu's Category.image is a URL string (the resolved
// .url on the FK target), not a numeric ID — so absoluteMediaUrl is
// the right call here, not IMAGE_ADDRESS(id) which is for products.
function categoryImage(cat: Record<string, any>): string | null {
  return absoluteMediaUrl(cat.image);
}

export default memo(function KioskCategorySidebar({ categories, activeId, onSelect, cartVisible = false }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }, [activeId]);

  return (
    <aside
      ref={navRef}
      className="shrink-0 w-56 h-full overflow-y-auto scrollbar-hide border-r"
      style={{
        background: 'var(--kiosk-sidebar-bg)',
        borderColor: 'var(--kiosk-border)',
      }}
    >
      <div className={`flex flex-col gap-3 px-4 pt-5 ${cartVisible ? 'pb-44' : 'pb-5'}`}>
        {categories.map((cat) => {
          const isActive = cat.id === activeId;
          const img = categoryImage(cat);
          return (
            <button
              key={cat.id}
              ref={isActive ? activeRef : null}
              onClick={() => onSelect(cat.id)}
              className="relative flex flex-col items-center gap-2.5 rounded-2xl transition-all px-2 pt-4 pb-3"
              style={{ background: 'var(--kiosk-card-bg)' }}
            >
              {/* Photo carries the selection cue — primary-color ring +
                  offset on active, neutral border otherwise. Matches the
                  dine-in CategoryPhotoStrip pattern so the photo itself
                  stays visible (the previous solid-primary fill flooded
                  the whole tile and hid the actual category image).
                  w-full + aspect-square lets the photo fill the tile
                  instead of sitting as an 80x80 stamp in an empty box —
                  fixes the 'photo looks tiny for its container' report. */}
              <div
                className="w-full aspect-square rounded-2xl overflow-hidden flex items-center justify-center"
                style={{
                  background: 'var(--kiosk-shell-bg)',
                  boxShadow: isActive
                    ? '0 0 0 3px var(--color-primary), 0 0 0 6px var(--kiosk-card-bg)'
                    : 'inset 0 0 0 1px var(--kiosk-border)',
                }}
              >
                {img ? (
                  <img src={img} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-9 h-9" style={{color: 'var(--kiosk-muted)'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 2v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V2" />
                    <path d="M6 11v11" />
                    <path d="M19 15V2a4 4 0 0 0-4 4v6a2 2 0 0 0 2 2h2v8" />
                  </svg>
                )}
              </div>
              <span
                className="text-[15px] font-bold leading-tight text-center line-clamp-2"
                style={{ color: isActive ? 'var(--color-primary)' : 'var(--kiosk-text)' }}
              >
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
});
