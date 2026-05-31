import { useCallback, useEffect, useRef, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useStoreConfig } from '@/context/StoreConfigContext';
import { getDineInPause } from '@/lib/dineIn';
import { getBranding } from '@/lib/branding';
import { ADD, EDIT } from '@/config/constants';
import CategoryNav from '@/components/shared/CategoryNav';
import ProductCard from '@/components/shared/ProductCard';
import CompactProductCard from '@/components/shared/CompactProductCard';
import ListProductCard from '@/components/shared/ListProductCard';
import CartSidebar from '@/components/shared/CartSidebar';
import CartMobileBar from '@/components/shared/CartMobileBar';
import DineInPausedBanner from '@/components/shared/DineInPausedBanner';
import OptionModal, { type OptionModalRef } from '@/components/shared/OptionModal';

type Props = {
  menu: Record<string, any> | null;
  menuLoading: boolean;
  onOrderConfirm: () => void;
};

export default function MenuView({ menu, menuLoading, onOrderConfirm }: Props) {
  const { cart } = useCart();
  const { company } = useStoreConfig();
  // When the operator hits "Pauzeer dine-in" on the Portal home, the cart
  // surfaces hide and product tiles drop into read-only mode. The menu
  // itself stays fully browsable so customers at the table can still read
  // descriptions and allergens while they wait.
  const { paused: dineInPaused } = getDineInPause(company);
  // Per-store layout variant — operator picks in Portal → Storefront →
  // Menu-layout. 'classic' is the existing grid; 'compact' is the
  // dense list for high-item-count menus; 'luxe' adds paper texture +
  // serif typography for fine-dining.
  const layout = getBranding(company).menu_layout;
  const modalRef = useRef<OptionModalRef>(null);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const categoryRefs = useRef<Record<number, HTMLDivElement | null>>({});
  // While a programmatic scroll is in progress (user clicked a pill), suppress
  // the IntersectionObserver so the active pill stays on the clicked target
  // instead of flickering through every section that scrolls past.
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimer = useRef<number | null>(null);

  const categories = menu?.menu?.categories || [];
  const products = menu?.menu?.products || [];
  const options = menu?.menu?.options || [];

  // Set initial active category
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  // Scroll observer for category highlighting
  useEffect(() => {
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
      { rootMargin: '-20% 0px -60% 0px' }
    );

    Object.values(categoryRefs.current).forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [products]);

  const scrollToCategory = useCallback((catId: number) => {
    const el = categoryRefs.current[catId];
    if (!el) return;

    programmaticScrollRef.current = true;
    if (programmaticScrollTimer.current) window.clearTimeout(programmaticScrollTimer.current);
    setActiveCategory(catId);

    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      programmaticScrollRef.current = false;
      window.removeEventListener('scrollend', release);
    };
    window.addEventListener('scrollend', release, { once: true });
    programmaticScrollTimer.current = window.setTimeout(release, 1200);

    // Header (h-20 = 80) + sticky pill nav (~50) + breathing room
    const top = el.getBoundingClientRect().top + window.scrollY - 138;
    window.scrollTo({ top, behavior: 'smooth' });
  }, []);

  const getCartCount = (productId: number) =>
    cart.filter(i => i.product === productId).reduce((s, i) => s + i.quantity, 0);

  const getProductOptions = (product: Record<string, any>) => {
    const optionIds = new Set([...(product.options || [])]);
    // Also include category options
    const cat = categories.find((c: any) => c.id === product.category);
    if (cat?.options) cat.options.forEach((id: number) => optionIds.add(id));
    return options.filter((o: any) => optionIds.has(o.id));
  };

  const onProductClick = (product: Record<string, any>) => {
    // While paused, tapping a tile is a no-op — the product modal would
    // surface an "Add to cart" CTA that can't actually do anything.
    // Banner is already visible up top so the customer knows why.
    if (dineInPaused) return;
    const productOptions = getProductOptions(product);
    modalRef.current?.openModal({ product, options: productOptions, mode: ADD, item: null });
  };

  const onProductEditClick = (item: Record<string, any>) => {
    const productOptions = getProductOptions(item.product_data || {});
    modalRef.current?.openModal({ product: item.product_data, options: productOptions, mode: EDIT, item });
  };

  if (menuLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 'luxe' wraps the whole menu area in a paper-textured background
  // and switches the body font to a serif. The SVG noise is inline so
  // we don't ship an asset; the operator's primary brand colour still
  // drives accents (buttons, active states) — luxe only changes the
  // ambient typography + paper feel, not the brand identity.
  const isLuxe = layout === 'luxe';
  const isCompact = layout === 'compact';

  return (
    <>
      <DineInPausedBanner/>
      {isLuxe && (
        <style>{`
          .luxe-menu {
            font-family: 'Cormorant Garamond', 'Playfair Display', Georgia, serif;
            background-color: #f7f1e6;
            background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.42 0 0 0 0 0.32 0 0 0 0 0.18 0 0 0 0.07 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
            background-repeat: repeat;
          }
          .luxe-menu h2 {
            font-family: 'Cormorant Garamond', 'Playfair Display', Georgia, serif;
            font-weight: 600;
            letter-spacing: 0.02em;
            color: #2c1810;
            font-size: 1.75rem;
            border-bottom: 1px solid rgba(60, 38, 22, 0.18);
            padding-bottom: 6px;
          }
        `}</style>
      )}
      <div className={`flex overflow-x-clip ${isLuxe ? 'luxe-menu' : ''}`}>
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <CategoryNav categories={categories} activeId={activeCategory} onSelect={scrollToCategory} />

          <div className="px-3 py-4">
            {categories.map((cat: Record<string, any>) => {
              const catProducts = products.filter((p: any) => p.category === cat.id);
              if (catProducts.length === 0) return null;
              // Per-category override: 'list' shows wide rows with the
              // full product description, regardless of the store-wide
              // menu_layout. Operator picks this in Portal → Menu →
              // Categories → <category> → Weergave op storefront.
              // 'default' (or anything else) falls through to the
              // store-wide layout below.
              const isCategoryList = cat.display_style === 'list';
              return (
                <div
                  key={cat.id}
                  ref={el => { categoryRefs.current[cat.id] = el; }}
                  data-category={cat.id}
                  className={isCompact ? 'mb-4 scroll-mt-36' : 'mb-6 scroll-mt-36'}
                >
                  <h2 className={isCompact ? 'text-base font-bold mb-2 px-1' : 'text-lg font-bold mb-3 px-1'}>
                    {cat.name}
                  </h2>
                  {isCategoryList ? (
                    // Per-category override — wide rows with full
                    // descriptions. Designed for pizzas / pastas where
                    // every variant reads differently.
                    <div className="rounded-lg overflow-hidden border border-[var(--color-border)] bg-white">
                      {catProducts.map((product: Record<string, any>) => (
                        <ListProductCard
                          key={product.id}
                          product={product}
                          onClick={() => onProductClick(product)}
                          cartCount={getCartCount(product.id)}
                        />
                      ))}
                    </div>
                  ) : isCompact ? (
                    // List-style: products stack vertically; image
                    // becomes a small thumbnail. Each row is its own
                    // tap-target with a divider line — denser scan than
                    // the classic 2/3-col grid.
                    <div className="rounded-lg overflow-hidden border border-[var(--color-border)] bg-white">
                      {catProducts.map((product: Record<string, any>) => (
                        <CompactProductCard
                          key={product.id}
                          product={product}
                          onClick={() => onProductClick(product)}
                          cartCount={getCartCount(product.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    // Classic + Luxe both use the same grid + ProductCard.
                    // Luxe gets its serif/paper feel from the wrapper +
                    // styles above; the cards themselves stay clean.
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {catProducts.map((product: Record<string, any>) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onClick={() => onProductClick(product)}
                          cartCount={getCartCount(product.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop cart sidebar — hidden while dine-in is paused so customers
            can't even start a doomed order. */}
        {!dineInPaused && (
          <div className="hidden lg:block w-72 shrink-0 sticky top-14 h-[calc(100dvh-3.5rem)] border-l border-[var(--color-border)]">
            <CartSidebar menu={menu} onEdit={onProductEditClick} onConfirm={onOrderConfirm} />
          </div>
        )}
      </div>

      {/* Mobile cart bar — same guard as the sidebar above. */}
      {!dineInPaused && (
        <CartMobileBar menu={menu} onEdit={onProductEditClick} onConfirm={onOrderConfirm} />
      )}

      {/* Option modal */}
      <OptionModal ref={modalRef} />
    </>
  );
}
