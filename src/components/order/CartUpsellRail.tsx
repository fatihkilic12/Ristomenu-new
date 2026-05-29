import { useMemo } from 'react';
import { useCart } from '@/context/CartContext';
import { useTranslation } from 'react-i18next';
import { EURO } from '@/config/constants';

type Props = {
  /** Resolved menu payload: `{ menu: { products: [...] } }` */
  menu: Record<string, any> | null;
  /** Optional override of the rail title. */
  title?: string;
};

// "Vergeet niet..." rail shown at the bottom of the cart. Combines two
// signals so the operator gets both a quick win (a static upsell pool —
// drinks, sides, desserts) and per-product precision (companions linked
// from the products already in the cart). Per-product links win the
// dedupe tie-breaker, then the global pool fills the rest.
export default function CartUpsellRail({ menu, title }: Props) {
  const { cart, addToCart } = useCart();
  const { t } = useTranslation();

  const products: any[] = menu?.menu?.products ?? [];

  const suggestions = useMemo(() => {
    if (!products.length) return [];
    const inCartIds = new Set(cart.map((c) => c.product));

    // Per-product linked upsells — priority ordering: first product in cart
    // contributes its links first, so the suggestion list visually tracks
    // what the customer just added.
    const linked: any[] = [];
    const linkedSeen = new Set<number>();
    for (const item of cart) {
      const p = products.find((x) => x.id === item.product);
      const ids: number[] = Array.isArray(p?.upsell_product_ids) ? p.upsell_product_ids : [];
      for (const id of ids) {
        if (inCartIds.has(id) || linkedSeen.has(id)) continue;
        const candidate = products.find((x) => x.id === id);
        if (!candidate || candidate.is_sold_out) continue;
        linked.push(candidate);
        linkedSeen.add(id);
      }
    }

    // Global pool — anything flagged is_upsell that isn't already in the
    // cart and wasn't already pulled in by a per-product link.
    const global: any[] = [];
    for (const p of products) {
      if (!p?.is_upsell || p.is_sold_out) continue;
      if (inCartIds.has(p.id) || linkedSeen.has(p.id)) continue;
      global.push(p);
    }

    // Keep the rail snappy — operators can mark many items as upsell but
    // a wall of 20 buttons hurts conversion. Cap at 8.
    return [...linked, ...global].slice(0, 8);
  }, [cart, products]);

  if (suggestions.length === 0) return null;

  return (
    <div className="px-3 py-3 border-t border-[var(--color-border)] bg-gray-50">
      <p className="text-[12px] font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-2">
        {title ?? t('restaurants.cart.upsell.title', 'Vergeet niet…')}
      </p>
      <div className="flex gap-2 overflow-x-auto -mx-3 px-3 pb-1 snap-x snap-mandatory">
        {suggestions.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() =>
              addToCart({
                product: p.id,
                product_data: { name: p.name, price: p.price },
                quantity: 1,
                options: {},
              })
            }
            className="snap-start shrink-0 w-36 bg-white border border-[var(--color-border)] rounded-xl p-2 text-left hover:border-[var(--color-primary)] transition-colors"
          >
            {p.uri && (
              <div className="w-full aspect-square mb-2 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={p.uri}
                  alt={p.name || `#${p.id}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <p className="text-[13px] font-medium line-clamp-2 min-h-[34px]">
              {p.name || `#${p.id}`}
            </p>
            <div className="flex items-center justify-between mt-1">
              {typeof p.price === 'number' && (
                <span className="text-[13px] font-semibold">
                  {EURO}{(p.price / 100).toFixed(2)}
                </span>
              )}
              <span className="text-[11px] font-bold text-white bg-[var(--color-primary)] rounded-full w-6 h-6 flex items-center justify-center">
                +
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
