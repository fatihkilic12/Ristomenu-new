import { useCallback, useEffect, useRef, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useStoreConfig } from '@/context/StoreConfigContext';
import { getDineInPause } from '@/lib/dineIn';
import { getBranding } from '@/lib/branding';
import { ADD, EDIT } from '@/config/constants';
import CategoryNav from '@/components/shared/CategoryNav';
import CategoryPhotoStrip from '@/components/shared/CategoryPhotoStrip';
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
  const branding = getBranding(company);
  const layout = branding.menu_layout;
  const titleSize = branding.title_size;
  const showCategoryPhotos = branding.show_category_photos;
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

    // Header (h-20 = 80) + sticky nav row + breathing. The nav row is
    // either the slim pill bar (~50px) or the taller photo strip
    // (~140px including label) — derive from the toggle so the section
    // lands flush below the sticky bar instead of being hidden under it.
    const stripOn = branding.show_category_photos
      && categories.some((c: Record<string, any>) => c.image);
    const navHeight = stripOn ? 150 : 50;
    const top = el.getBoundingClientRect().top + window.scrollY - 80 - navHeight - 8;
    window.scrollTo({ top, behavior: 'smooth' });
  }, [branding.show_category_photos, categories]);

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

  // Map title_size + layout to the h2 className for the category headings
  // (PIZZAS, DESSERTS …). Luxe has its own .luxe-menu h2 base size in the
  // injected <style> below, so we scale around that with a class on the
  // body element below; classic/compact use Tailwind sizes.
  // Sizes deliberately leaned UP after operator feedback that "large" felt
  // closer to a regular heading — large should read as a clearly oversized
  // poster-style title from across the table.
  const titleSizeClass: Record<typeof titleSize, string> =
    isCompact
      ? {small: 'text-base', medium: 'text-xl', large: 'text-3xl'}
      : {small: 'text-xl', medium: 'text-3xl', large: 'text-5xl'};
  // Static-string concat (not `mb-${n}`) so Tailwind's JIT scanner
  // can statically extract both `mb-2` and `mb-3` from the source.
  const headingClass = `${titleSizeClass[titleSize]} font-bold ${isCompact ? 'mb-2' : 'mb-3'} px-1`;

  // Honor the operator's explicit toggle — if they turned the strip on,
  // show whatever photos they've uploaded so far. A previous build hid
  // the rail until 3+ categories had photos, but that confused operators
  // who toggled it on with 1-2 photos and saw "nothing happen". Now any
  // category without a photo simply doesn't get a tile.
  const photoCategories = categories.filter(
    (c: Record<string, any>) => typeof c.image === 'string' && c.image,
  );
  const renderCategoryStrip = showCategoryPhotos && photoCategories.length > 0;

  return (
    <>
      <DineInPausedBanner/>
      {isLuxe && (
        <style>{`
          /* Luxe — fine-dining feel. Paper texture + serif typography +
             gold accent line on each category heading + larger spacing
             so the menu reads like a printed insert, not a scrolling
             list of food cards. */
          .luxe-menu {
            font-family: 'Cormorant Garamond', 'Playfair Display', Georgia, serif;
            background-color: #f3ead6;
            background-image:
              radial-gradient(circle at 20% 18%, rgba(120, 88, 50, 0.06), transparent 40%),
              radial-gradient(circle at 82% 75%, rgba(60, 38, 22, 0.05), transparent 45%),
              url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.42 0 0 0 0 0.32 0 0 0 0 0.18 0 0 0 0.09 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
            background-repeat: no-repeat, no-repeat, repeat;
            color: #2c1810;
          }
          /* Category heading — bigger, all-caps with letter-spacing,
             gold hairline beneath. Reads like a section title on a
             tasting-menu card. */
          .luxe-menu h2 {
            font-family: 'Cormorant Garamond', 'Playfair Display', Georgia, serif;
            font-weight: 700;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #2c1810;
            font-size: 1.5rem;
            text-align: center;
            margin-top: 28px;
            margin-bottom: 22px;
            padding: 0;
            border: none;
            position: relative;
          }
          /* Title-size override (operator picks in Portal → Storefront).
             Luxe defaults to "medium" (the .luxe-menu h2 base above).
             Sizes leaned up after operator feedback that "large" felt
             too tame — bump so it actually reads as oversized. */
          .luxe-menu h2 { font-size: 2.25rem; }
          .luxe-menu[data-title-size='small'] h2  { font-size: 1.6rem; }
          .luxe-menu[data-title-size='large'] h2  { font-size: 3.25rem; letter-spacing: 0.18em; }
          .luxe-menu h2::after {
            content: '';
            display: block;
            width: 60px;
            height: 1px;
            background: linear-gradient(to right, transparent, #b8945a, transparent);
            margin: 12px auto 0;
          }
          /* Product cards lose the rounded photo grid in favour of a
             borderless single-column list — each product takes its
             own line like a printed menu entry. Override the grid
             classes coming from ProductCard's wrapping div. */
          .luxe-menu .luxe-product-list {
            display: flex !important;
            flex-direction: column;
            gap: 18px;
            background: transparent;
          }
          /* Strip the white card chrome inside Luxe so the paper
             background shows through behind each product. */
          .luxe-menu .luxe-product-list > button {
            background: transparent !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            border-bottom: 1px dashed rgba(60, 38, 22, 0.18);
            padding-bottom: 16px;
          }
          .luxe-menu .luxe-product-list > button:last-child {
            border-bottom: none;
          }
          /* Body type — serif italic accents on descriptions, slightly
             larger price for emphasis. */
          .luxe-menu p, .luxe-menu span, .luxe-menu h3 {
            font-family: 'Cormorant Garamond', 'Playfair Display', Georgia, serif;
            color: #2c1810;
          }
          .luxe-menu h3 {
            font-weight: 600;
            letter-spacing: 0.01em;
            font-size: 1.15rem;
          }
          .luxe-menu p {
            font-style: italic;
            color: #5a4530;
            font-size: 0.95rem;
            line-height: 1.45;
          }
        `}</style>
      )}
      {/* title_size globally scales every product-card text: name,
          description AND price. Targets the data-attributes the three
          ProductCard variants now stamp on their text elements, so the
          operator's "Klein/Middel/Groot" choice ripples through the
          whole menu, not just the section headings. */}
      <style>{`
        [data-menu-scale='small']  [data-product-name]   { font-size: 12px; }
        [data-menu-scale='small']  [data-product-desc]   { font-size: 10px; }
        [data-menu-scale='small']  [data-price]          { font-size: 13px; }
        [data-menu-scale='small']  [data-category-label] { font-size: 11px; }
        /* Tighter spacing for "Klein" so the menu reads denser. */
        [data-menu-scale='small']  [data-category]                       { margin-bottom: 16px; }
        [data-menu-scale='small']  [data-category] > h2                  { margin-bottom: 8px; }
        [data-menu-scale='small']  [data-category] > [data-products-grid].grid { gap: 8px; }

        [data-menu-scale='large']  [data-product-name]   { font-size: 20px; }
        [data-menu-scale='large']  [data-product-desc]   { font-size: 16px; }
        [data-menu-scale='large']  [data-price]          { font-size: 22px; }
        [data-menu-scale='large']  [data-category-label] { font-size: 15px; }
        /* Roomier spacing for "Groot" so the bigger type has breathing
           room. Bumps category-to-category margin, the gap between the
           heading and its product grid, and the inter-card gap on the
           classic photo grid. Luxe / list / compact variants don't use
           .grid so they're untouched here (their internal spacing is
           driven by their own dashed-underline / divider layouts). */
        [data-menu-scale='large']  [data-category]                       { margin-bottom: 40px; }
        [data-menu-scale='large']  [data-category] > h2                  { margin-bottom: 20px; }
        [data-menu-scale='large']  [data-category] > [data-products-grid].grid { gap: 20px; }
        [data-menu-scale='large']  [data-category] > [data-products-grid].luxe-product-list { gap: 28px; }
      `}</style>
      <div
        className={`flex overflow-x-clip ${isLuxe ? 'luxe-menu' : ''}`}
        data-title-size={titleSize}
        data-menu-scale={titleSize}
      >
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {renderCategoryStrip && (
            <CategoryPhotoStrip
              categories={photoCategories}
              activeId={activeCategory}
              onSelect={scrollToCategory}
            />
          )}
          {/* Pill CategoryNav is redundant when the photo strip is on —
              both render the same labels in the same scroll-on-tap role.
              Show the pills only when the strip is hidden. */}
          {!renderCategoryStrip && (
            <CategoryNav categories={categories} activeId={activeCategory} onSelect={scrollToCategory} />
          )}

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
                  className={isCompact ? 'mb-4' : 'mb-6'}
                  // scrollMarginTop matches the sticky-nav offset used by
                  // scrollToCategory so jumping to a section lands flush
                  // under whichever nav row is active (slim pill vs the
                  // taller photo strip).
                  style={{scrollMarginTop: renderCategoryStrip ? 238 : 138}}
                >
                  <h2 className={isLuxe ? undefined : headingClass}>
                    {cat.name}
                  </h2>
                  {isCategoryList ? (
                    // Per-category override — wide rows with full
                    // descriptions. Designed for pizzas / pastas where
                    // every variant reads differently.
                    <div data-products-grid className="rounded-lg overflow-hidden border border-[var(--color-border)] bg-white">
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
                    <div data-products-grid className="rounded-lg overflow-hidden border border-[var(--color-border)] bg-white">
                      {catProducts.map((product: Record<string, any>) => (
                        <CompactProductCard
                          key={product.id}
                          product={product}
                          onClick={() => onProductClick(product)}
                          cartCount={getCartCount(product.id)}
                        />
                      ))}
                    </div>
                  ) : isLuxe ? (
                    // Luxe — single-column list, each product gets a
                    // dashed-underline like a printed menu entry. The
                    // class is what the .luxe-product-list styles
                    // above hook into to strip card chrome and stack
                    // products vertically.
                    <div data-products-grid className="luxe-product-list">
                      {catProducts.map((product: Record<string, any>) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onClick={() => onProductClick(product)}
                          cartCount={getCartCount(product.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    // Classic — photo-first grid (default).
                    <div data-products-grid className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
