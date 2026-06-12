import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getCompanyInfo, getMenuOnly } from '@/actions/store';
import { EURO, IMAGE_SERVER_ADDRESS, IMAGE_ADDRESS } from '@/config/constants';

// Lite-mode menu surface — for old / weak Android tablets that
// can't keep up with MenuOnlyPage's full feature set.
//
// What MenuOnlyPage does and we explicitly DON'T:
//   - IntersectionObserver tracking the active category
//   - Sticky category nav with smooth-scroll listeners
//   - 3 layout variants + per-render `<style>` injection for
//     title_size scaling
//   - CategoryPhotoStrip with horizontal-scroll thumbnails
//   - Full ProductInfoModal with option groups + allergens
//   - useMenuRefresh's Pusher-driven react-query invalidation
//   - useIdleAction / useTapSynthesisWatchdog interaction
//   - StoreConfigProvider's branding CSS-variable management
//
// What we keep:
//   - The same /menu-only/ endpoint
//   - Logo + restaurant name in a static header
//   - Categories as plain <section> blocks (no observer, no nav)
//   - Products as flat rows (image left, name + price right)
//   - Tap a product to inline-expand a description block
//
// Result: one big scrolling document, browser-native lazy image
// loading, zero observers, single useState. Render cost is roughly
// "static HTML + tap state for one product at a time".
//
// Operator routes weak tablets to /company/<slug>/menu-lite manually
// — no auto-detection, no opt-in via query param, just a separate
// URL the operator points the slow tablet at.

type RawProduct = Record<string, any>;
type RawCategory = Record<string, any>;

function resolveImage(p: RawProduct): string | null {
  const raw = p.uri || (p.image ? IMAGE_ADDRESS(p.image) : null);
  if (!raw) return null;
  return raw.startsWith('/') ? `${IMAGE_SERVER_ADDRESS}${raw}` : raw;
}

function MoneyLabel({ cents }: { cents: number | null | undefined }) {
  if (cents == null) return null;
  return (
    <span className="text-base font-semibold text-gray-900 shrink-0 tabular-nums">
      {EURO}{(cents / 100).toFixed(2)}
    </span>
  );
}

function ProductRow({ product }: { product: RawProduct }) {
  const [open, setOpen] = useState(false);
  const img = resolveImage(product);
  const description: string = product.description || '';
  const hasMore = description.trim().length > 0;

  return (
    <li
      // Tap toggles the description block. Only one description is
      // expanded at a time per row; tapping again collapses. Pointer
      // cursor + slight bg flash on tap so the surface signals it's
      // interactive without us shipping a JS active-state.
      onClick={() => hasMore && setOpen((v) => !v)}
      className={`flex flex-col border-b border-gray-100 last:border-b-0 ${hasMore ? 'active:bg-gray-50' : ''}`}
    >
      <div className="flex items-center gap-3 px-3 py-3">
        {img ? (
          <img
            src={img}
            alt=""
            // Native lazy load — image only fetches when scrolled
            // into view. No IntersectionObserver needed.
            loading="lazy"
            decoding="async"
            className="w-14 h-14 rounded-md object-cover bg-gray-100 shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-md bg-gray-100 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold capitalize truncate">
            {product.name}
          </p>
          {product.is_sold_out && (
            <p className="text-[11px] uppercase tracking-wider text-red-600 font-bold">
              Uitverkocht
            </p>
          )}
        </div>
        <MoneyLabel cents={product.price} />
      </div>
      {open && hasMore && (
        <div className="px-3 pb-3 pl-[68px] text-sm text-gray-600 leading-relaxed">
          {description}
        </div>
      )}
    </li>
  );
}

function MenuLiteContent({ storeId }: { storeId: string }) {
  const { i18n } = useTranslation();

  // Minimal store fetch — only what the header renders. Long
  // staleTime: this data doesn't change mid-session.
  const { data: company } = useQuery({
    queryKey: ['store-info-lite', storeId],
    queryFn: () => getCompanyInfo(storeId),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Menu data. Long staleTime + interval refetch every 5 min is the
  // simplest possible freshness story — no Pusher hook, no Push-
  // driven invalidations, no event listeners. Old tablets get a
  // periodic refresh that fits within their CPU budget without
  // re-rendering on every operator edit.
  const { data: menu, isLoading, isError } = useQuery({
    queryKey: ['menu-lite', storeId, i18n.language],
    queryFn: () => getMenuOnly(storeId),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });

  // Build the (category → ordered products) index once per data
  // change rather than re-filtering on every render.
  const grouped = useMemo(() => {
    const cats: RawCategory[] = menu?.menu?.categories || [];
    const prods: RawProduct[] = menu?.menu?.products || [];
    const byCat: Record<number, RawProduct[]> = {};
    for (const p of prods) {
      if (p.category == null) continue;
      (byCat[p.category] ||= []).push(p);
    }
    // Server already orders products per category; we just preserve
    // arrival order. If category.order is set on the server payload
    // categories arrive sorted too.
    return cats
      .map((cat) => ({ cat, items: byCat[cat.id] || [] }))
      .filter((g) => g.items.length > 0);
  }, [menu]);

  const logo: string | null = useMemo(() => {
    const b = company?.branding;
    if (b?.logo) return b.logo as string;
    if (company?.img) {
      return typeof company.img === 'string' ? company.img : null;
    }
    return null;
  }, [company]);

  return (
    <div className="min-h-dvh bg-white text-gray-900">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-3 h-14 flex items-center justify-center shadow-sm">
        {logo ? (
          <img
            src={logo}
            alt={company?.name || ''}
            className="max-h-8 w-auto object-contain"
          />
        ) : (
          <span className="font-bold text-lg capitalize">
            {company?.name || ''}
          </span>
        )}
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          …
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
          Menu niet beschikbaar.
        </div>
      ) : (
        <main>
          {grouped.map(({ cat, items }) => (
            <section key={cat.id} className="border-b border-gray-200">
              <h2 className="px-3 pt-4 pb-2 text-base font-bold capitalize text-gray-800 bg-gray-50">
                {cat.name}
              </h2>
              <ul className="bg-white">
                {items.map((p) => (
                  <ProductRow key={p.id} product={p} />
                ))}
              </ul>
            </section>
          ))}
        </main>
      )}
    </div>
  );
}

export default function MenuLitePage() {
  const { storeId } = useParams<{ storeId: string }>();
  if (!storeId) return null;
  // Intentionally no StoreConfigProvider — that pulls /store/<slug>/
  // AND /store/<slug>/config/ in parallel and writes CSS custom
  // properties on every render. Lite mode falls back to neutral
  // greyscale styling so it never has to do that work.
  return <MenuLiteContent storeId={storeId} />;
}
