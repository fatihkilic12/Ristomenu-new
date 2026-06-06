import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getDeliveryMenu } from '@/actions/store';
import { useMenuRefresh } from '@/hooks/useMenuRefresh';
import { useModalBackClose } from '@/hooks/useModalBackClose';
import { useIsTabletMode } from '@/hooks/useIsTabletMode';
import { useIdleAction } from '@/hooks/useIdleAction';
import { getAllergenIcon, getAllergenLabel } from '@/lib/allergens';
import { StoreConfigProvider, useStoreConfig } from '@/context/StoreConfigContext';
import { EURO, IMAGE_ADDRESS, IMAGE_SERVER_ADDRESS, PICKUP } from '@/config/constants';
import { getBranding } from '@/lib/branding';
import { vibrate } from '@/hooks/useLongPress';
import LanguageSelector from '@/components/shared/LanguageSelector';
import StoreFooter from '@/components/shared/StoreFooter';
import CategoryNav from '@/components/shared/CategoryNav';
import CategoryPhotoStrip from '@/components/shared/CategoryPhotoStrip';
import ProductCard from '@/components/shared/ProductCard';
import CompactProductCard from '@/components/shared/CompactProductCard';
import ListProductCard from '@/components/shared/ListProductCard';

function safeHostname(url: string): string | null {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch { return null; }
}

function MenuOnlyContent() {
  const { storeId } = useParams<{ storeId: string }>();
  const { company, loading: configLoading } = useStoreConfig();
  const { i18n, t } = useTranslation();

  const branding = getBranding(company);
  const logo = branding.logo;
  const websiteUrl: string | undefined = branding.website_url || undefined;
  const websiteHostname = websiteUrl ? safeHostname(websiteUrl) : null;
  const goToWebsite = () => { if (websiteUrl) window.location.href = websiteUrl; };

  // We re-use the delivery/pickup menu endpoint (it returns the full catalog).
  // Nothing is ever submitted from this page. Tablets get realtime
  // menu_updated events via Pusher; customer phones don't.
  useMenuRefresh(storeId);

  // Tablet-only between-customer cleanup (?tablet=1 sessionStorage flag).
  // Two soft tiers, no hard reload:
  //   - 60s idle  → close any open product modal
  //   - 4min idle → scroll back to the first category
  // The actions themselves are wired further down once `categories` /
  // `scrollToCategory` are in scope.
  const isTablet = useIsTabletMode();
  const { data: menu, isLoading } = useQuery({
    queryKey: ['menu-only', storeId, i18n.language],
    queryFn: () => getDeliveryMenu(storeId!, PICKUP),
    enabled: !!storeId && !configLoading,
  });

  const categories = menu?.menu?.categories || [];
  const products = menu?.menu?.products || [];

  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [openProduct, setOpenProduct] = useState<Record<string, any> | null>(null);
  const categoryRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimer = useRef<number | null>(null);

  // Initial active category
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  // IntersectionObserver — same flicker-free scroll-to-category as the other menus
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (programmaticScrollRef.current) return;
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

    // Header (h-20 = 80) + sticky nav row + breathing. Strip height
    // scales with title_size (96 → 112 → 128 tile + label) so the
    // offset has to follow.
    const stripOn = branding.show_category_photos
      && categories.some((c: Record<string, any>) => c.image);
    const stripHeight =
      branding.title_size === 'large' ? 184
      : branding.title_size === 'medium' ? 168
      : 150;
    const navHeight = stripOn ? stripHeight : 50;
    const top = el.getBoundingClientRect().top + window.scrollY - 80 - navHeight - 8;
    window.scrollTo({ top, behavior: 'smooth' });
  }, [branding.show_category_photos, branding.title_size, categories]);

  // After 4 min idle, scroll back to the first category AND close any
  // open product modal so the next customer doesn't walk up to mid-
  // product chrome blocking the page. The previous Tier 1 (separate
  // 60s timer that closed only the modal) was removed — each
  // useIdleAction adds 5 capture-phase window listeners
  // (touchstart/mousedown/wheel/scroll/keydown), and stripping one of
  // the two tiers halves that overhead on a tablet that runs for hours.
  // Both behaviors collapse cleanly into Tier 2: a 4 min absence is
  // long enough to assume "previous customer left", which is the only
  // case where auto-closing the modal mattered.
  useIdleAction(isTablet, 4 * 60 * 1000, () => {
    setOpenProduct(null);
    const first = categories[0]?.id ?? null;
    if (first != null) {
      setActiveCategory(first);
      scrollToCategory(first);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#fafafa]">
        <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#fafafa]">
      {/* Header — same shape as DineInPage: 3 columns with logo centered. */}
      <header className="sticky top-0 z-50 bg-[var(--color-header)] text-[var(--color-header-text)] px-3 sm:px-4 h-20 grid grid-cols-3 items-center shadow-sm">
        {/* Left: back-to-website if configured (mirrors the table-pill spot) */}
        <div className="justify-self-start">
          {websiteUrl ? (
            <button
              type="button"
              onClick={goToWebsite}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/15 px-3.5 py-2 rounded-full text-sm font-bold whitespace-nowrap"
              title={websiteUrl}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span className="hidden sm:inline">{t('common.back_to_website', 'Back to website')}</span>
              {websiteHostname && <span className="opacity-70 hidden md:inline">· {websiteHostname}</span>}
            </button>
          ) : (
            // No back button without a website URL — we don't want users
            // navigating back to the LandingPage from here. Empty span keeps
            // the 3-column grid balanced so the logo stays centred.
            <span aria-hidden />
          )}
        </div>
        {/* Middle: logo only — matches DineInPage. Locked height, natural
            width, object-contain so wide word-mark logos render uncropped. */}
        <div className="justify-self-center min-w-0">
          {logo ? (
            <img
              src={logo}
              alt={company?.name}
              className="max-h-10 w-auto max-w-[40vw] object-contain"
            />
          ) : (
            <span className="font-bold text-lg capitalize">{company?.name}</span>
          )}
        </div>
        {/* Right: language */}
        <div className="justify-self-end">
          <LanguageSelector languages={company?.languages || []} defaultLang={company?.default_lang} variant="dark" />
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        // Variants are decided per-store in Portal → Storefront → Menu-layout.
        // Same three options as the orderable dine-in view:
        //   classic — photo-first grid (default)
        //   compact — list rows for menus with many items
        //   luxe    — paper-textured wrapper + serif type for fine-dining
        // Plus two cross-layout knobs (mirrored from MenuView):
        //   title_size — small/medium/large heading scale
        //   show_category_photos — horizontal-scroll category-photo strip
        (() => {
          const layout = branding.menu_layout;
          const isLuxe = layout === 'luxe';
          const isCompact = layout === 'compact';
          const titleSize = branding.title_size;
          // Scale shifted UP — what used to be "medium" is the new
          // "small", so even the baseline storefront feels confident.
          // "Medium" lands halfway to "large" to keep three distinct
          // visual steps.
          const titleSizeClass: Record<typeof titleSize, string> =
            isCompact
              ? {small: 'text-xl', medium: 'text-2xl', large: 'text-3xl'}
              : {small: 'text-3xl', medium: 'text-4xl', large: 'text-5xl'};
          // Static-string concat so Tailwind JIT statically picks up both classes.
          const headingClass = `${titleSizeClass[titleSize]} font-bold ${isCompact ? 'mb-2' : 'mb-3'} px-1 capitalize`;
          const photoCategories = categories.filter(
            (c: Record<string, any>) => typeof c.image === 'string' && c.image,
          );
          const renderCategoryStrip = branding.show_category_photos && photoCategories.length > 0;
          return (
            <>
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
                  /* Title-size — three distinct steps after the scale
                     was shifted up. Small inherits what used to be
                     medium, medium lands halfway to large. */
                  .luxe-menu[data-title-size='small']  h2 { font-size: 2.4rem; }
                  .luxe-menu[data-title-size='medium'] h2 { font-size: 2.95rem; }
                  .luxe-menu[data-title-size='large']  h2 { font-size: 3.5rem; }
                `}</style>
              )}
              {/* title_size globally scales every product-card text:
                  name, description AND price. Targets data-attrs the
                  three ProductCard variants stamp on text elements. */}
              <style>{`
                /* Scale shifted up — "Klein" inherits the Tailwind
                   defaults baked into each ProductCard (no rule). */
                [data-menu-scale='medium'] [data-product-name]   { font-size: 16px; }
                [data-menu-scale='medium'] [data-product-desc]   { font-size: 13px; }
                [data-menu-scale='medium'] [data-price]          { font-size: 18px; }
                [data-menu-scale='medium'] [data-category-label] { font-size: 14px; }
                [data-menu-scale='medium'] [data-category]                       { margin-bottom: 32px; }
                [data-menu-scale='medium'] [data-category] > h2                  { margin-bottom: 16px; }
                [data-menu-scale='medium'] [data-category] > [data-products-grid].grid { gap: 16px; }
                [data-menu-scale='medium'] [data-strip-tile]                     { width: 112px; }
                [data-menu-scale='medium'] [data-strip-tile] [data-strip-thumb]  { width: 112px; height: 112px; }

                [data-menu-scale='large']  [data-product-name]   { font-size: 20px; }
                [data-menu-scale='large']  [data-product-desc]   { font-size: 16px; }
                [data-menu-scale='large']  [data-price]          { font-size: 22px; }
                [data-menu-scale='large']  [data-category-label] { font-size: 16px; }
                [data-menu-scale='large']  [data-category]                       { margin-bottom: 40px; }
                [data-menu-scale='large']  [data-category] > h2                  { margin-bottom: 20px; }
                [data-menu-scale='large']  [data-category] > [data-products-grid].grid { gap: 20px; }
                [data-menu-scale='large']  [data-strip-tile]                     { width: 128px; }
                [data-menu-scale='large']  [data-strip-tile] [data-strip-thumb]  { width: 128px; height: 128px; }
              `}</style>
              <div className={isLuxe ? 'luxe-menu' : ''} data-title-size={titleSize} data-menu-scale={titleSize}>
                {renderCategoryStrip && (
                  <CategoryPhotoStrip
                    categories={photoCategories}
                    activeId={activeCategory}
                    onSelect={scrollToCategory}
                  />
                )}
                {/* Pill nav is redundant when the photo strip is on —
                    both labels, same scroll-on-tap. Show pills only when
                    the strip is hidden. */}
                {!renderCategoryStrip && (
                  <CategoryNav categories={categories} activeId={activeCategory} onSelect={scrollToCategory} />
                )}

                <div className="px-3 py-4">
                  {categories.map((cat: Record<string, any>) => {
                    const catProducts = products.filter((p: any) => p.category === cat.id);
                    if (catProducts.length === 0) return null;
                    // Per-category override: 'list' shows wide rows with
                    // the full product description, ignoring the
                    // store-wide menu_layout. Matches the same branch
                    // already in MenuView (dine-in) so a pizzas /
                    // pastas operator's choice in Portal → Menu →
                    // Categories propagates to the menu-only view too.
                    const isCategoryList = cat.display_style === 'list';
                    return (
                      <div
                        key={cat.id}
                        ref={el => { categoryRefs.current[cat.id] = el; }}
                        data-category={cat.id}
                        className={isCompact ? 'mb-4' : 'mb-6'}
                        // scrollMarginTop matches the sticky-nav offset
                        // so the section lands flush below the active row
                        // (slim pill vs taller photo strip).
                        style={{
                          scrollMarginTop: renderCategoryStrip
                            ? (titleSize === 'large' ? 272
                               : titleSize === 'medium' ? 256
                               : 238)
                            : 138,
                        }}
                      >
                        <h2 className={isLuxe ? 'capitalize' : headingClass}>
                          {cat.name}
                        </h2>
                        {isCategoryList ? (
                          <div data-products-grid className="rounded-lg overflow-hidden border border-[var(--color-border)] bg-white">
                            {catProducts.map((product: Record<string, any>) => (
                              <ListProductCard
                                key={product.id}
                                product={product}
                                onClick={() => setOpenProduct(product)}
                              />
                            ))}
                          </div>
                        ) : isCompact ? (
                          <div data-products-grid className="rounded-lg overflow-hidden border border-[var(--color-border)] bg-white">
                            {catProducts.map((product: Record<string, any>) => (
                              <CompactProductCard
                                key={product.id}
                                product={product}
                                onClick={() => setOpenProduct(product)}
                              />
                            ))}
                          </div>
                        ) : (
                          <div data-products-grid className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {catProducts.map((product: Record<string, any>) => (
                              <ProductCard
                                key={product.id}
                                product={product}
                                onClick={() => setOpenProduct(product)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          );
        })()
      )}

      {/* Read-only product modal */}
      {openProduct && (
        <ProductInfoModal
          product={openProduct}
          showAllergens={branding.show_allergens}
          onClose={() => setOpenProduct(null)}
        />
      )}

      <StoreFooter />
    </div>
  );
}

function ProductInfoModal({ product, showAllergens, onClose }: {
  product: Record<string, any>;
  showAllergens: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const rawUri = product.uri || (product.image ? IMAGE_ADDRESS(product.image) : null);
  const imgUrl = rawUri && rawUri.startsWith('/') ? `${IMAGE_SERVER_ADDRESS}${rawUri}` : rawUri;
  const basePrice = product.price != null ? (product.price / 100).toFixed(2) : null;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Hardware-back / browser-back closes the modal — see useModalBackClose.
  useModalBackClose(true, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50" />
      <div
        className="relative z-10 w-full h-[100dvh] sm:h-auto sm:rounded-2xl sm:max-w-xl sm:max-h-[90dvh] flex flex-col bg-white shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-20 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/70 shadow-lg"
          aria-label="Close"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        <div className="overflow-y-auto flex-1">
          {imgUrl ? (
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] bg-gray-100 overflow-hidden">
              <img src={imgUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              {(product.vegan || product.vegetarian) && (
                <div className="absolute bottom-3 left-3 flex gap-1.5">
                  {product.vegan && <span className="bg-green-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">VEGAN</span>}
                  {product.vegetarian && !product.vegan && <span className="bg-green-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">VEGGIE</span>}
                </div>
              )}
            </div>
          ) : (
            <div className="h-14" /> /* spacer for back button when no image */
          )}

          <div className="p-6">
            <div className="flex justify-between items-start gap-3">
              <h2 className="text-2xl font-bold leading-tight capitalize">{product.name}</h2>
              {basePrice && (
                <span className="text-xl font-bold text-[var(--color-primary)] shrink-0">
                  {EURO}{basePrice}
                </span>
              )}
            </div>

            {product.description && (
              <p className="text-base text-gray-500 leading-relaxed mt-3">{product.description}</p>
            )}

            {showAllergens && product.allergens?.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  {t('menu_only.allergens', 'Allergens')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {product.allergens.map((a: string) => {
                    const label = getAllergenLabel(a, t);
                    return (
                      <span
                        key={a}
                        title={label}
                        className="inline-flex items-center gap-1 text-[13px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium"
                      >
                        <span aria-hidden>{getAllergenIcon(a)}</span>
                        <span>{label}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {(product.is_hard_alcohol || product.is_soft_alcohol) && (
              <div className="mt-3">
                <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 font-bold">
                  {product.is_hard_alcohol ? '18+' : '16+'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Sticky footer — same position as the dine-in "Add to cart" button */}
        <div className="p-4 border-t border-gray-100 bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            onPointerDown={e => { if (e.pointerType === 'touch') vibrate(10); }}
            className="w-full py-3.5 rounded-xl font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-hover)] active:scale-[0.98] transition-all text-[15px] inline-flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            {t('menu_only.back_to_menu', 'Back to menu')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MenuOnlyPage() {
  const { storeId } = useParams<{ storeId: string }>();
  if (!storeId) return null;
  return (
    <StoreConfigProvider storeId={storeId}>
      <MenuOnlyContent />
    </StoreConfigProvider>
  );
}
