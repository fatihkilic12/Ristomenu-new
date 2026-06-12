import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getMenuOnly } from '@/actions/store';
import { useModalBackClose } from '@/hooks/useModalBackClose';
import { getAllergenIcon, getAllergenLabel } from '@/lib/allergens';
import { StoreConfigProvider, useStoreConfig } from '@/context/StoreConfigContext';
import { EURO, IMAGE_ADDRESS, IMAGE_SERVER_ADDRESS } from '@/config/constants';
import { getBranding } from '@/lib/branding';
import { vibrate } from '@/hooks/useLongPress';
import LanguageSelector from '@/components/shared/LanguageSelector';
import StoreFooter from '@/components/shared/StoreFooter';
import CategoryNav from '@/components/shared/CategoryNav';
import CategoryPhotoStrip from '@/components/shared/CategoryPhotoStrip';
import ProductCard from '@/components/shared/ProductCard';
import CompactProductCard from '@/components/shared/CompactProductCard';
import ListProductCard from '@/components/shared/ListProductCard';

// Lite-mode browse menu — same visual design as MenuOnlyPage but
// stripped of every observer / event loop that pegs the WebView on
// under-powered Android tablets. The user-visible difference is the
// list of expensive things the page DOESN'T do, not the look:
//
//   - No IntersectionObserver tracking the active category. The
//     CategoryNav still shows pills (with the first category as the
//     static "active" highlight) and tapping one scrolls to the
//     section via the browser-native scrollIntoView. No scrollend
//     listener, no programmatic-scroll guard, no per-frame intersect
//     callbacks.
//   - No useMenuRefresh: instead of subscribing to the Pusher push
//     fan-out and invalidating five query keys on every operator
//     edit, the page just refetches the menu every 5 minutes via
//     react-query's `refetchInterval`. Operators get the propagation
//     delay, but old tablets don't get re-rendered on every save.
//   - No useIdleAction: the idle close-the-modal + scroll-to-first
//     behaviour is gone — for a permanently-displayed wall menu the
//     between-customer reset matters less than CPU headroom.
//   - The two <style> blocks that MenuOnlyPage inlines per render are
//     defined as module-level constants below so React only emits the
//     same stylesheet once instead of constructing the string on every
//     render pass.
//
// What stays the same: the entire visual surface. Header, category
// strip, pill nav, product card variants (classic / compact / luxe),
// per-category list override, branded colors, allergens, alcohol
// pill, ProductInfoModal. The customer can't tell the page apart from
// MenuOnlyPage — only the operator (and the WebView profiler) notices.

function safeHostname(url: string): string | null {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch { return null; }
}

// Static <style> contents — same strings MenuOnlyPage builds per
// render, lifted out so React's reconciler skips the string-build
// step on every pass. The luxe block is opt-in (only injected when
// the store picked the luxe layout).
const LUXE_STYLES = `
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
.luxe-menu[data-title-size='small']  h2 { font-size: 2.4rem; }
.luxe-menu[data-title-size='medium'] h2 { font-size: 2.95rem; }
.luxe-menu[data-title-size='large']  h2 { font-size: 3.5rem; }
`;

const SCALE_STYLES = `
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
`;

function MenuLiteContent() {
  const { storeId } = useParams<{ storeId: string }>();
  const { company, loading: configLoading } = useStoreConfig();
  const { i18n, t } = useTranslation();

  const branding = getBranding(company);
  const logo = branding.logo;
  const websiteUrl: string | undefined = branding.website_url || undefined;
  const websiteHostname = websiteUrl ? safeHostname(websiteUrl) : null;
  const goToWebsite = () => { if (websiteUrl) window.location.href = websiteUrl; };

  // No useMenuRefresh — see file header. We use react-query's
  // refetchInterval for a slow 5-min refresh instead of subscribing to
  // every Pusher invalidation event.
  const { data: menu, isLoading } = useQuery({
    queryKey: ['menu-lite', storeId, i18n.language],
    queryFn: () => getMenuOnly(storeId!),
    enabled: !!storeId && !configLoading,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const categories = menu?.menu?.categories || [];
  const products = menu?.menu?.products || [];
  const optionGroups = menu?.menu?.options || [];

  const [openProduct, setOpenProduct] = useState<Record<string, any> | null>(null);
  const categoryRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // The pill nav highlights the FIRST category as a static visual
  // anchor — we deliberately don't track scroll position to avoid the
  // per-frame IntersectionObserver callbacks that MenuOnlyPage pays
  // for. Customers tap a pill to jump; no auto-update on scroll.
  const staticActiveCategory: number | null = categories[0]?.id ?? null;

  // Lite-mode scroll-to-category: native scrollIntoView, no
  // smooth-scroll release machinery, no scrollend listener. The
  // header / sticky nav offset is handled by scrollMarginTop on the
  // target sections (same approach MenuOnlyPage uses).
  const scrollToCategory = useCallback((catId: number) => {
    const el = categoryRefs.current[catId];
    if (!el) return;
    // `instant` skips the smooth animation — cheaper on slow GPUs.
    // The visual snap is fine for a wall menu where the customer
    // taps once and reads.
    try {
      el.scrollIntoView({ behavior: 'auto', block: 'start' });
    } catch {
      el.scrollIntoView();
    }
  }, []);

  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#fafafa]">
        <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const layout = branding.menu_layout;
  const isLuxe = layout === 'luxe';
  const isCompact = layout === 'compact';
  const titleSize = branding.title_size;
  const titleSizeClass: Record<typeof titleSize, string> = isCompact
    ? { small: 'text-xl', medium: 'text-2xl', large: 'text-3xl' }
    : { small: 'text-3xl', medium: 'text-4xl', large: 'text-5xl' };
  const headingClass = `${titleSizeClass[titleSize]} font-bold ${isCompact ? 'mb-2' : 'mb-3'} px-1 capitalize`;
  const photoCategories = categories.filter(
    (c: Record<string, any>) => typeof c.image === 'string' && c.image,
  );
  const renderCategoryStrip = branding.show_category_photos && photoCategories.length > 0;

  return (
    <div className="min-h-dvh bg-[#fafafa]">
      <header className="sticky top-0 z-50 bg-[var(--color-header)] text-[var(--color-header-text)] px-3 sm:px-4 h-20 grid grid-cols-3 items-center shadow-sm">
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
            <span aria-hidden />
          )}
        </div>
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
        <div className="justify-self-end">
          <LanguageSelector languages={company?.languages || []} defaultLang={company?.default_lang} variant="dark" />
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {isLuxe && <style>{LUXE_STYLES}</style>}
          <style>{SCALE_STYLES}</style>
          <div className={isLuxe ? 'luxe-menu' : ''} data-title-size={titleSize} data-menu-scale={titleSize}>
            {renderCategoryStrip && (
              <CategoryPhotoStrip
                categories={photoCategories}
                activeId={staticActiveCategory}
                onSelect={scrollToCategory}
              />
            )}
            {!renderCategoryStrip && (
              <CategoryNav
                categories={categories}
                activeId={staticActiveCategory}
                onSelect={scrollToCategory}
              />
            )}

            <div className="px-3 py-4">
              {categories.map((cat: Record<string, any>) => {
                const catProducts = products.filter((p: any) => p.category === cat.id);
                if (catProducts.length === 0) return null;
                const isCategoryList = cat.display_style === 'list';
                return (
                  <div
                    key={cat.id}
                    ref={(el) => { categoryRefs.current[cat.id] = el; }}
                    data-category={cat.id}
                    className={isCompact ? 'mb-4' : 'mb-6'}
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
      )}

      {openProduct && (
        <ProductInfoModal
          product={openProduct}
          optionGroups={optionGroups}
          showAllergens={branding.show_allergens}
          onClose={() => setOpenProduct(null)}
        />
      )}

      <StoreFooter />
    </div>
  );
}

// Same modal as MenuOnlyPage — visually identical for the customer.
// Kept here (rather than imported from MenuOnlyPage) so the two files
// can evolve independently if one of them needs a behavioural tweak
// that doesn't make sense for the other.
function ProductInfoModal({ product, optionGroups, showAllergens, onClose }: {
  product: Record<string, any>;
  optionGroups: Array<Record<string, any>>;
  showAllergens: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const rawUri = product.uri || (product.image ? IMAGE_ADDRESS(product.image) : null);
  const imgUrl = rawUri && rawUri.startsWith('/') ? `${IMAGE_SERVER_ADDRESS}${rawUri}` : rawUri;
  const basePrice = product.price != null ? (product.price / 100).toFixed(2) : null;

  const productOptionGroups = (product.options || [])
    .map((gid: number) => optionGroups.find((g) => g.id === gid))
    .filter(Boolean) as Array<Record<string, any>>;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useModalBackClose(true, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50" />
      <div
        className="relative z-10 w-full h-[100dvh] sm:h-auto sm:rounded-2xl sm:max-w-xl sm:max-h-[90dvh] flex flex-col bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
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
            <div className="h-14" />
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

            {(showAllergens && product.allergens?.length > 0) ||
            product.is_hard_alcohol ||
            product.is_soft_alcohol ? (
              <div className="mt-5 space-y-3">
                {showAllergens && product.allergens?.length > 0 && (
                  <div>
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
                  <div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 font-bold">
                      {product.is_hard_alcohol ? '18+' : '16+'}
                    </span>
                  </div>
                )}
              </div>
            ) : null}

            {productOptionGroups.length > 0 && (
              <div className="mt-6 space-y-6">
                {productOptionGroups.map((group) => {
                  const visibleItems = (group.items || []).filter(
                    (it: Record<string, any>) => !it.is_hidden && !it.is_sold_out,
                  );
                  if (visibleItems.length === 0) return null;
                  return (
                    <div key={group.id}>
                      <h3 className="text-base font-bold text-gray-900 capitalize mb-2.5">
                        {group.name}
                      </h3>
                      <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white">
                        {visibleItems.map((item: Record<string, any>) => {
                          const price = typeof item.price === 'number' && item.price > 0
                            ? `+${EURO}${(item.price / 100).toFixed(2)}`
                            : null;
                          return (
                            <li
                              key={item.id}
                              className="flex items-center justify-between gap-3 px-4 py-3"
                            >
                              <span className="text-base text-gray-900 capitalize leading-snug">{item.name}</span>
                              {price && (
                                <span className="text-base font-semibold text-[var(--color-primary)] shrink-0">
                                  {price}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            onPointerDown={(e) => { if (e.pointerType === 'touch') vibrate(10); }}
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

export default function MenuLitePage() {
  const { storeId } = useParams<{ storeId: string }>();
  if (!storeId) return null;
  return (
    <StoreConfigProvider storeId={storeId}>
      <MenuLiteContent />
    </StoreConfigProvider>
  );
}
