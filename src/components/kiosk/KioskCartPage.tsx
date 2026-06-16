import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/context/CartContext';
import { EURO, IMAGE_ADDRESS, IMAGE_SERVER_ADDRESS } from '@/config/constants';

type Props = {
  menu: Record<string, any> | null;
  onEdit: (item: any) => void;
  onConfirm: () => void;
  onClose: () => void;
  allowNotes?: boolean;
  customerName?: string;
};

function getItemPrice(item: any, menu: any): number {
  const product = menu?.menu?.products?.find((p: any) => p.id === item.product);
  let price = product?.price || 0;
  if (item.options) {
    for (const [optId, qty] of Object.entries(item.options)) {
      for (const group of (menu?.menu?.options || [])) {
        const opt = group.items?.find((i: any) => i.id === Number(optId));
        if (opt?.price) price += opt.price * (qty as number);
      }
    }
  }
  return price * item.quantity;
}

function itemImage(item: any): string | null {
  const product = item.product_data || {};
  const raw = product.uri || (product.image ? IMAGE_ADDRESS(product.image) : null);
  if (!raw) return null;
  return raw.startsWith('/') ? `${IMAGE_SERVER_ADDRESS}${raw}` : raw;
}

export default function KioskCartPage({ menu, onEdit, onConfirm, onClose, allowNotes = true, customerName }: Props) {
  const { cart, note, setNote, deleteFromCart, updateCart, addToCart, itemCount, isSubmitting } = useCart();
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + getItemPrice(item, menu), 0);

  // Cart-level upsells — last touchpoint before checkout, McDonald's style.
  // Per-product links from every item in the cart take priority; the
  // global is_upsell pool fills the rest. Skips anything already in the
  // cart, sold out, or with required options (would need a configurator).
  const upsellProducts: any[] = menu?.menu?.products ?? [];
  const upsellSuggestions = useMemo(() => {
    if (!upsellProducts.length) return [];
    const inCartIds = new Set(cart.map((c) => c.product));
    const seen = new Set<number>();
    const linked: any[] = [];
    for (const item of cart) {
      const p = upsellProducts.find((x) => x.id === item.product);
      const ids: number[] = Array.isArray(p?.upsell_product_ids) ? p.upsell_product_ids : [];
      for (const id of ids) {
        if (inCartIds.has(id) || seen.has(id)) continue;
        const candidate = upsellProducts.find((x) => x.id === id);
        if (!candidate || candidate.is_sold_out) continue;
        if (Array.isArray(candidate.options) && candidate.options.length > 0) continue;
        linked.push(candidate);
        seen.add(id);
      }
    }
    const global: any[] = [];
    for (const p of upsellProducts) {
      if (!p?.is_upsell || p.is_sold_out) continue;
      if (inCartIds.has(p.id) || seen.has(p.id)) continue;
      if (Array.isArray(p.options) && p.options.length > 0) continue;
      global.push(p);
    }
    return [...linked, ...global].slice(0, 6);
  }, [cart, upsellProducts]);

  const changeQuantity = (item: any, delta: number) => {
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      deleteFromCart(item.id);
    } else {
      updateCart(item.id, { ...item, quantity: newQty });
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#fafafa] flex flex-col kiosk-anim-fade-in-up">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-gray-100 px-6 h-24 flex items-center gap-5 z-10">
        <button
          type="button"
          onClick={onClose}
          className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-700 active:bg-gray-200"
        >
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-extrabold leading-tight">{t('restaurants.cart.title', 'Your order')}</h1>
          {customerName && (
            <p className="text-base text-gray-500 truncate mt-0.5">{customerName} · {itemCount} {itemCount === 1 ? t('common.item', 'item') : t('common.items', 'items')}</p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto pb-56 px-5 pt-5">
        {cart.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-32">
            <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center text-6xl mb-6">🛒</div>
            <p className="text-gray-500 text-2xl">{t('restaurants.cart.empty', 'Your cart is empty')}</p>
          </div>
        )}

        <div className="space-y-4">
          {cart.map(item => {
            const img = itemImage(item);
            return (
              <div key={item.id} className="flex items-stretch gap-4 p-4 rounded-3xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="w-28 h-28 rounded-2xl bg-gray-100 overflow-hidden shrink-0 active:opacity-70"
                >
                  {img ? (
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl opacity-40 font-black text-gray-400 capitalize">
                      {(item.product_data?.name?.trim().charAt(0) || '?').toUpperCase()}
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="flex-1 min-w-0 text-left active:opacity-70 py-1"
                >
                  <h3 className="font-bold text-2xl leading-tight line-clamp-2 capitalize">{item.product_data?.name || `#${item.product}`}</h3>
                  {item.options && Object.keys(item.options).length > 0 && (
                    // Selected option labels — was text-base on a big
                    // kiosk screen which read like fine print. Bumped to
                    // text-xl + darker grey for legibility from arm's
                    // length.
                    <p className="text-xl text-gray-600 line-clamp-3 mt-2 leading-snug">
                      {Object.keys(item.options).map(optId => {
                        for (const group of (item.options_data || [])) {
                          const opt = group.items?.find((i: any) => i.id === Number(optId));
                          if (opt) return opt.name;
                        }
                        return null;
                      }).filter(Boolean).join(', ')}
                    </p>
                  )}
                  {item.note && <p className="text-base text-gray-500 line-clamp-2 mt-1.5 italic">"{item.note}"</p>}
                  <span className="font-extrabold text-2xl mt-3 block">{EURO}{(getItemPrice(item, menu) / 100).toFixed(2)}</span>
                </button>
                <div className="flex flex-col items-center justify-between shrink-0">
                  <button
                    type="button"
                    onClick={() => deleteFromCart(item.id)}
                    className="w-14 h-14 rounded-2xl text-red-500 active:bg-red-50 flex items-center justify-center"
                    aria-label="Remove"
                  >
                    {/* SVG trash glyph — the previous literal 🗑 emoji
                        renders inconsistently across OSes (came out as
                        a fuzzy grey rectangle on the kiosk hardware
                        we tested on). */}
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                  <div className="flex items-center bg-gray-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => changeQuantity(item, -1)}
                      className="w-14 h-14 flex items-center justify-center text-2xl font-bold text-gray-700 active:bg-gray-200 rounded-l-2xl"
                    >
                      −
                    </button>
                    <span className="w-10 text-center font-extrabold text-xl tabular-nums">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(item, 1)}
                      className="w-14 h-14 flex items-center justify-center text-2xl font-bold text-gray-700 active:bg-gray-200 rounded-r-2xl"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Upsell rail — McDonald's-style "vergeet niet" before checkout.
            Hidden once everything has been suggested + accepted or skipped. */}
        {cart.length > 0 && upsellSuggestions.length > 0 && (
          <div className="mt-6 rounded-3xl bg-white p-6">
            <p className="text-base font-semibold uppercase tracking-wider text-[var(--color-primary)] mb-1">
              {t('kiosk.upsell.cart.eyebrow', { defaultValue: 'Vergeet niet' })}
            </p>
            <h3 className="text-2xl font-extrabold mb-4 leading-tight">
              {t('kiosk.upsell.cart.title', { defaultValue: 'Maak het compleet' })}
            </h3>
            <div className="flex gap-4 overflow-x-auto -mx-6 px-6 pb-2 snap-x snap-mandatory">
              {upsellSuggestions.map((p: any) => {
                const raw = p?.uri || (p?.image ? IMAGE_ADDRESS(p.image) : null);
                const img = raw ? (raw.startsWith('/') ? `${IMAGE_SERVER_ADDRESS}${raw}` : raw) : null;
                return (
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
                    className="snap-start shrink-0 w-44 rounded-3xl bg-gray-50 border-2 border-transparent active:scale-[0.97] active:border-[var(--color-primary)] overflow-hidden"
                  >
                    <div className="aspect-square bg-white">
                      {img ? (
                        <img src={img} alt="" loading="lazy" className="w-full h-full object-cover"/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl font-black text-gray-300 capitalize">
                          {(p.name?.charAt(0) || '?').toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="p-3 text-left">
                      <p className="font-bold text-base leading-tight line-clamp-2 capitalize min-h-[40px]">
                        {p.name || `#${p.id}`}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        {typeof p.price === 'number' && (
                          <span className="font-extrabold text-lg">
                            {EURO}{(p.price / 100).toFixed(2)}
                          </span>
                        )}
                        <span className="w-11 h-11 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center text-2xl font-bold shadow">
                          +
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Note */}
        {allowNotes && cart.length > 0 && (
          <div className="mt-5 rounded-3xl bg-white p-6">
            <label className="text-lg font-bold block mb-3">{t('restaurants.cart.note.title', 'Note')}</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('restaurants.cart.note.add', 'Add a note...')}
              maxLength={200}
              className="w-full px-5 py-5 border-2 border-gray-100 rounded-2xl text-xl focus:outline-none focus:border-[var(--color-primary)] bg-gray-50"
            />
          </div>
        )}
      </div>

      {/* Sticky footer */}
      {cart.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-5 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-center mb-4 px-2">
            <span className="text-xl font-semibold text-gray-600">{t('restaurants.cart.subtotal', 'Subtotal')}</span>
            <span className="text-3xl font-extrabold">{EURO}{(subtotal / 100).toFixed(2)}</span>
          </div>

          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="w-full h-20 rounded-2xl font-extrabold text-2xl text-white bg-[var(--color-primary)] active:bg-[var(--color-primary-hover)]"
          >
            {t('restaurants.cart.confirm', 'Confirm order')}
          </button>
        </div>
      )}

      {/* Centered confirm modal — same pattern as CartSidebar / DineInPage:
          backdrop is non-dismissible while submitting (a stray tap mid-flight
          would hide the spinner and the customer assumes the order failed),
          the OK button shows a spinner + disabled state, and the parent
          (KioskMenu) flips to <KioskOrderConfirmation/> once the promise
          resolves so the modal disappears together with the cart screen. */}
      {confirming && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-8">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => { if (!isSubmitting) setConfirming(false); }}
          />
          <div className="relative z-10 bg-white rounded-[2rem] w-full max-w-2xl p-12 text-center shadow-2xl kiosk-anim-fade-in-up">
            <div className="w-32 h-32 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mx-auto mb-7">
              {isSubmitting ? (
                <div className="w-14 h-14 border-[4px] border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-14 h-14 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
              )}
            </div>
            <h2 className="text-4xl font-extrabold mb-3">
              {isSubmitting
                ? t('restaurants.cart.placing', 'Bestelling wordt verstuurd…')
                : t('restaurants.cart.place_order', 'Place this order?')}
            </h2>
            <p className="text-2xl text-gray-500 mb-9">
              {itemCount} {itemCount === 1 ? t('common.item', 'item') : t('common.items', 'items')} — {EURO}{(subtotal / 100).toFixed(2)}
            </p>
            <button
              type="button"
              onClick={() => { if (!isSubmitting) onConfirm(); }}
              disabled={isSubmitting}
              className="w-full h-20 rounded-2xl font-extrabold text-2xl text-white bg-[var(--color-primary)] active:bg-[var(--color-primary-hover)] mb-3 disabled:opacity-60 inline-flex items-center justify-center gap-3"
            >
              {isSubmitting && (
                <span className="w-6 h-6 border-[3px] border-white/80 border-t-transparent rounded-full animate-spin" aria-hidden />
              )}
              {isSubmitting
                ? t('restaurants.cart.placing_short', 'Bezig…')
                : t('restaurants.cart.ok', 'Confirm')}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={isSubmitting}
              className="w-full h-16 rounded-2xl font-bold text-xl text-gray-700 bg-gray-100 active:bg-gray-200 disabled:opacity-40"
            >
              {t('restaurants.cart.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
