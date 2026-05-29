import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/context/CartContext';
import { EURO, IMAGE_ADDRESS, IMAGE_SERVER_ADDRESS } from '@/config/constants';

type Props = {
  /** Full menu payload `{ menu: { products: [...] } }`. */
  menu: Record<string, any> | null;
  /** Product the customer just added — its `upsell_product_ids` take priority. */
  triggerProduct: Record<string, any> | null;
  /** Dismiss callback. Called for "Nee bedankt", "Verder met bestellen", and after every add (so the modal closes the moment the customer picks something — keeps the interaction snappy). */
  onClose: () => void;
};

// Resolves the image URL the same way the rest of the kiosk does, so the
// upsell tile looks identical to a regular product tile.
function imageFor(p: any): string | null {
  const raw = p?.uri || (p?.image ? IMAGE_ADDRESS(p.image) : null);
  if (!raw) return null;
  return raw.startsWith('/') ? `${IMAGE_SERVER_ADDRESS}${raw}` : raw;
}

// "Wil je er ... bij?" — the signature McDonald's interaction. Fires after
// every successful add-to-cart that has at least one suggestion. Closes
// immediately on a pick so the customer can keep adding without bouncing
// through a confirmation step.
export default function KioskUpsellModal({ menu, triggerProduct, onClose }: Props) {
  const { t } = useTranslation();
  const { cart, addToCart } = useCart();
  const [adding, setAdding] = useState<number | null>(null);

  const products: any[] = menu?.menu?.products ?? [];

  const suggestions = useMemo(() => {
    if (!products.length) return [];
    const inCartIds = new Set(cart.map((c) => c.product));

    const linked: any[] = [];
    const seen = new Set<number>();
    // Per-product links from the just-added product win the ordering. If
    // the trigger product happens to be empty (defensive) we just fall
    // through to the global pool.
    const linkedIds: number[] = Array.isArray(triggerProduct?.upsell_product_ids)
      ? triggerProduct.upsell_product_ids
      : [];
    for (const id of linkedIds) {
      if (inCartIds.has(id) || seen.has(id)) continue;
      const p = products.find((x) => x.id === id);
      if (!p || p.is_sold_out) continue;
      // Skip products that have required options — adding them without
      // showing the configurator would push an under-specified line.
      if (Array.isArray(p.options) && p.options.length > 0) continue;
      linked.push(p);
      seen.add(id);
    }

    const global: any[] = [];
    for (const p of products) {
      if (!p?.is_upsell || p.is_sold_out) continue;
      if (inCartIds.has(p.id) || seen.has(p.id)) continue;
      if (Array.isArray(p.options) && p.options.length > 0) continue;
      global.push(p);
    }

    return [...linked, ...global].slice(0, 6);
  }, [cart, products, triggerProduct]);

  // If there's nothing to suggest, the modal closes itself on mount so the
  // caller doesn't have to know the rule.
  useEffect(() => {
    if (suggestions.length === 0) onClose();
  }, [suggestions.length, onClose]);

  if (suggestions.length === 0) return null;

  const handlePick = (p: any) => {
    setAdding(p.id);
    addToCart({
      product: p.id,
      product_data: { name: p.name, price: p.price },
      quantity: 1,
      options: {},
    });
    // Brief tactile flash before closing — long enough to feel deliberate,
    // short enough to keep the kiosk snappy.
    setTimeout(() => {
      setAdding(null);
      onClose();
    }, 250);
  };

  const triggerLabel = triggerProduct?.name || t('common.your_pick', 'je keuze');

  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-end sm:items-center justify-center kiosk-anim-fade-in-up">
      <div className="w-full max-w-3xl bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="px-7 pt-7 pb-3 shrink-0">
          <p className="text-base font-semibold uppercase tracking-wider text-[var(--color-primary)]">
            {t('kiosk.upsell.eyebrow', { defaultValue: 'Vergeet niet' })}
          </p>
          <h2 className="text-3xl font-extrabold mt-1 leading-tight">
            {t('kiosk.upsell.title', {
              product: triggerLabel,
              defaultValue: `Wil je er iets bij?`,
            })}
          </h2>
          <p className="text-base text-gray-500 mt-2">
            {t('kiosk.upsell.subtitle', {
              defaultValue: 'Maak je bestelling compleet — één tik om toe te voegen.',
            })}
          </p>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-5 pb-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {suggestions.map((p) => {
              const img = imageFor(p);
              const isAdding = adding === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={adding != null}
                  onClick={() => handlePick(p)}
                  className={`relative text-left rounded-3xl bg-white border-2 transition-all overflow-hidden ${
                    isAdding
                      ? 'border-green-500 scale-[0.97] bg-green-50'
                      : 'border-gray-100 active:scale-[0.97] active:border-[var(--color-primary)]'
                  } ${adding != null && !isAdding ? 'opacity-40' : ''}`}
                >
                  <div className="aspect-square bg-gray-50">
                    {img ? (
                      <img src={img} alt="" loading="lazy" className="w-full h-full object-cover"/>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl font-black text-gray-300 capitalize">
                        {(p.name?.charAt(0) || '?').toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-base leading-tight line-clamp-2 capitalize min-h-[40px]">
                      {p.name || `#${p.id}`}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      {typeof p.price === 'number' && (
                        <span className="font-extrabold text-lg">
                          {EURO}{(p.price / 100).toFixed(2)}
                        </span>
                      )}
                      <span
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow ${
                          isAdding ? 'bg-green-500' : 'bg-[var(--color-primary)]'
                        }`}
                      >
                        {isAdding ? '✓' : '+'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pt-3 pb-5 shrink-0 border-t border-gray-100 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-16 rounded-2xl bg-gray-100 active:bg-gray-200 font-bold text-xl text-gray-700"
          >
            {t('kiosk.upsell.skip', { defaultValue: 'Nee bedankt, verder' })}
          </button>
        </div>
      </div>
    </div>
  );
}
