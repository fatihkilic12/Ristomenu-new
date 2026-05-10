import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/context/CartContext';
import { ADD, EDIT } from '@/config/constants';
import OrderProductCard from '@/components/order/OrderProductCard';
import OptionModal, { type OptionModalRef } from '@/components/shared/OptionModal';

type Props = {
  menu: Record<string, any> | null;
  menuLoading: boolean;
};

export default function OrderMenuView({ menu, menuLoading }: Props) {
  const { cart } = useCart();
  const { t } = useTranslation();
  const modalRef = useRef<OptionModalRef>(null);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const categoryRefs = useRef<Record<number, HTMLElement | null>>({});
  const navRef = useRef<HTMLDivElement>(null);
  // While a programmatic scroll is in progress (user clicked a pill), suppress
  // the IntersectionObserver so it doesn't flicker through every section as it
  // scrolls past. Released a moment after the smooth scroll lands.
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimer = useRef<number | null>(null);

  const categories = menu?.menu?.categories || [];
  const products = menu?.menu?.products || [];
  const options = menu?.menu?.options || [];

  // Filter products by search query
  const searchLower = search.trim().toLowerCase();
  const filteredProducts = searchLower
    ? products.filter((p: any) =>
        (p.name || '').toLowerCase().includes(searchLower) ||
        (p.description || '').toLowerCase().includes(searchLower)
      )
    : products;

  // Initial active category
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  // Scroll observer for category highlighting
  useEffect(() => {
    if (search) return; // Don't auto-highlight while filtering
    const observer = new IntersectionObserver(
      entries => {
        if (programmaticScrollRef.current) return; // Locked during click-to-scroll
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = Number(entry.target.getAttribute('data-category'));
            if (id) setActiveCategory(id);
          }
        }
      },
      { rootMargin: '-25% 0px -65% 0px' }
    );
    Object.values(categoryRefs.current).forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [products, search]);

  // Scroll active pill into view
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || !activeCategory) return;
    const btn = nav.querySelector<HTMLButtonElement>(`[data-cat="${activeCategory}"]`);
    if (!btn) return;
    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const left = nav.scrollLeft + btnRect.left - navRect.left - navRect.width / 2 + btnRect.width / 2;
    nav.scrollTo({ left, behavior: 'smooth' });
  }, [activeCategory]);

  const scrollToCategory = useCallback((catId: number) => {
    const el = categoryRefs.current[catId];
    if (!el) return;

    // Lock the observer so it doesn't override the active pill while we scroll
    // past intermediate sections. Cleared via scrollend event (or fallback timer).
    programmaticScrollRef.current = true;
    if (programmaticScrollTimer.current) window.clearTimeout(programmaticScrollTimer.current);
    setActiveCategory(catId);

    // Header (h-16 = 64) + sticky pill nav (~56) + breathing room
    const offset = 64 + 56 + 12;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      programmaticScrollRef.current = false;
      window.removeEventListener('scrollend', release);
    };
    window.addEventListener('scrollend', release, { once: true });
    // Fallback for browsers without `scrollend` (Safari) — release after a
    // generous timeout so the observer takes over again.
    programmaticScrollTimer.current = window.setTimeout(release, 1200);

    window.scrollTo({ top, behavior: 'smooth' });
  }, []);

  const cartCount = (productId: number) =>
    cart.filter(i => i.product === productId).reduce((s, i) => s + i.quantity, 0);

  const productOptions = (product: Record<string, any>) => {
    const optionIds = new Set([...(product.options || [])]);
    const cat = categories.find((c: any) => c.id === product.category);
    if (cat?.options) cat.options.forEach((id: number) => optionIds.add(id));
    return options.filter((o: any) => optionIds.has(o.id));
  };

  const onProductClick = (product: Record<string, any>) => {
    modalRef.current?.openModal({ product, options: productOptions(product), mode: ADD, item: null });
  };

  const onProductEdit = (item: Record<string, any>) => {
    modalRef.current?.openModal({ product: item.product_data, options: productOptions(item.product_data || {}), mode: EDIT, item });
  };

  // Expose edit handler via ref-like attribute on window for cart sidebar to call
  // Simpler: pass through to parent via a callback prop pattern. Here we use it inline.
  useEffect(() => {
    (window as any).__orderEditItem = onProductEdit;
    return () => { delete (window as any).__orderEditItem; };
  });

  // Categories that have at least one (filtered) product
  const visibleCategories = useMemo(
    () => categories.filter((c: any) => filteredProducts.some((p: any) => p.category === c.id)),
    [categories, filteredProducts]
  );

  if (menuLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Search */}
      <div className="px-4 mt-5">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('restaurants.single.search', 'Search products')}
            className="w-full h-12 pl-11 pr-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)]/50"
          />
        </div>
      </div>

      {/* Category pill nav (sticky just under the page header) */}
      <div className="sticky top-16 z-20 bg-[var(--color-bg)]/95 backdrop-blur-md border-b border-[var(--color-border)] mt-4">
        <div ref={navRef} className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 px-4 py-3">
            {visibleCategories.map((cat: Record<string, any>) => {
              const active = cat.id === activeCategory;
              return (
                <button
                  key={cat.id}
                  data-cat={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all border whitespace-nowrap capitalize ${
                    active
                      ? 'bg-[var(--color-text)] text-[var(--color-bg)] border-[var(--color-text)]'
                      : 'bg-transparent text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-text)]/40'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="px-4 pb-12">
        {visibleCategories.length === 0 && search && (
          <p className="text-center text-[var(--color-muted)] py-12">
            {t('restaurants.items.no_items_found', 'No items found')}
          </p>
        )}
        {visibleCategories.map((cat: Record<string, any>) => {
          const catProducts = filteredProducts.filter((p: any) => p.category === cat.id);
          if (catProducts.length === 0) return null;
          return (
            <section
              key={cat.id}
              ref={el => { categoryRefs.current[cat.id] = el; }}
              data-category={cat.id}
              className="mt-8 first:mt-6 scroll-mt-32"
            >
              <header className="mb-4 flex items-baseline justify-between gap-4">
                <h2 className="text-2xl font-extrabold text-[var(--color-text)] capitalize">{cat.name}</h2>
                <span className="text-sm text-[var(--color-muted)] shrink-0">
                  {catProducts.length} {catProducts.length === 1
                    ? t('common.item', 'item')
                    : t('common.items', 'items')}
                </span>
              </header>
              {cat.description && (
                <p className="text-sm text-[var(--color-muted)] mb-4 leading-relaxed">{cat.description}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {catProducts.map((product: Record<string, any>) => (
                  <OrderProductCard
                    key={product.id}
                    product={product}
                    onClick={() => onProductClick(product)}
                    cartCount={cartCount(product.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <OptionModal ref={modalRef} />
    </>
  );
}

// Helper hook for parent components to trigger product edit from outside (e.g. cart sidebar)
export function triggerOrderEditItem(item: any) {
  (window as any).__orderEditItem?.(item);
}
