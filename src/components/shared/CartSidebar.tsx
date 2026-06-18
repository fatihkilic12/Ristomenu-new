import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useStoreConfig } from '@/context/StoreConfigContext';
import { useTranslation } from 'react-i18next';
import { EURO, IMAGE_ADDRESS, IMAGE_SERVER_ADDRESS } from '@/config/constants';
import { getBranding } from '@/lib/branding';
import CartUpsellRail from '@/components/order/CartUpsellRail';

// Resolve the same image URL we render on the product card so the
// cart row carries the visual the customer just tapped on. Mirrors
// KioskCartPage's helper — kept inline because the cart already lives
// in shared/ and we don't want a one-line lib for this.
function itemImage(item: any): string | null {
  const product = item.product_data || {};
  const raw = product.uri || (product.image ? IMAGE_ADDRESS(product.image) : null);
  if (!raw) return null;
  return raw.startsWith('/') ? `${IMAGE_SERVER_ADDRESS}${raw}` : raw;
}

type Props = {
  menu: Record<string, any> | null;
  onEdit: (item: any) => void;
  onConfirm: () => void;
  // Optional close handler — when set we render an X in the header
  // top-right. The mobile drawer passes it through so customers who
  // don't know they can tap the backdrop have a visible escape; the
  // desktop sidebar mounts inline next to the menu and leaves it off.
  onClose?: () => void;
};

export default function CartSidebar({ menu, onEdit, onConfirm, onClose }: Props) {
  const { cart, note, setNote, updateCart, deleteFromCart, itemCount, isSubmitting } = useCart();
  const { company } = useStoreConfig();
  const { allow_notes } = getBranding(company);
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);

  // Stepper helper — mirrors OrderCartPanel so dine-in feels identical to
  // delivery. delta -1 on the last unit deletes the row instead of going
  // to zero, so the qty pill doesn't show 0 in a stuck state.
  const change = (item: any, delta: number) => {
    const q = item.quantity + delta;
    if (q <= 0) deleteFromCart(item.id);
    else updateCart(item.id, { ...item, quantity: q });
  };

  const getPrice = (item: any): number => {
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
  };

  const subtotal = cart.reduce((sum, item) => sum + getPrice(item), 0);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      <div className="shrink-0 p-4 border-b border-[var(--color-border)] flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-xl">{t('restaurants.cart.title', 'Your order')}</h2>
          <span className="text-base text-[var(--color-muted)]">{itemCount} {itemCount === 1 ? t('common.item', 'item') : t('common.items', 'items')}</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 -mr-1 -mt-1 w-10 h-10 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label={t('common.close', 'Close')}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Items — min-h-0 lets flex-1 actually shrink so overflow-y-auto
          triggers when the cart is taller than the column. Without it the
          scroll container grows to fit and pushes the footer offscreen. */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 && (
          <p className="text-center text-[var(--color-muted)] text-base py-8">{t('restaurants.cart.empty', 'Your cart is empty')}</p>
        )}
        {cart.map(item => {
          const optionLabels = Object.keys(item.options || {})
            .map(optId => {
              for (const group of (item.options_data || [])) {
                const opt = group.items?.find((i: any) => i.id === Number(optId));
                if (opt) return opt.name;
              }
              return null;
            })
            .filter(Boolean)
            .join(', ');
          const isLast = item.quantity === 1;

          const img = itemImage(item);

          return (
            <div key={item.id} className="py-2 first:pt-1 px-1 border-b last:border-b-0 border-[var(--color-border)]">
              <button type="button" onClick={() => onEdit(item)} className="w-full flex items-start gap-3 text-left">
                {/* Thumbnail — same image the customer tapped on the
                    product card. Gives the cart row a visual anchor so
                    customers can spot "the burger I added" at a glance
                    instead of re-reading every line. shrink-0 + fixed
                    w/h so a long name doesn't crush the picture. */}
                <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-gray-100 ring-1 ring-inset ring-gray-200">
                  {img ? (
                    <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-full h-full p-3 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3 2v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V2" />
                      <path d="M6 11v11" />
                      <path d="M19 15V2a4 4 0 0 0-4 4v6a2 2 0 0 0 2 2h2v8" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold leading-tight line-clamp-2 capitalize">
                    {item.product_data?.name || `#${item.product}`}
                  </p>
                  {optionLabels && (
                    <p className="text-sm text-[var(--color-muted)] line-clamp-1 mt-0.5">{optionLabels}</p>
                  )}
                  {item.note && (
                    <p className="text-sm text-[var(--color-muted)] line-clamp-1 mt-0.5 italic">{item.note}</p>
                  )}
                </div>
              </button>
              <div className="flex items-center justify-between gap-3 mt-2">
                <span className="text-base font-bold">{EURO}{(getPrice(item) / 100).toFixed(2)}</span>
                <div className="flex items-center bg-gray-50 rounded-full p-0.5 border border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={() => change(item, -1)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isLast ? 'text-red-500 hover:bg-red-500/10' : 'text-gray-700 hover:bg-gray-200'
                    }`}
                    aria-label={isLast ? t('common.remove', 'Remove') : t('common.decrease', 'Decrease')}
                  >
                    {isLast
                      ? <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                      : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    }
                  </button>
                  <span className="w-7 text-center text-base font-extrabold tabular-nums">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => change(item, 1)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors"
                    aria-label={t('common.increase', 'Increase')}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upsell suggestions — hidden when the cart is empty (handled inside
          the component since suggestions also disappear once everything is
          already in the cart). */}
      {cart.length > 0 && <div className="shrink-0"><CartUpsellRail menu={menu}/></div>}

      {/* Note */}
      {allow_notes && (
        <div className="shrink-0 px-3 py-2 border-t border-[var(--color-border)]">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={t('restaurants.cart.note.add', 'Add a note...')}
            className="w-full text-base px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
      )}

      {/* Footer */}
      <div className="shrink-0 p-3 border-t border-[var(--color-border)]">
        <div className="flex justify-between mb-3">
          <span className="text-base font-medium">{t('restaurants.cart.subtotal', 'Subtotal')}</span>
          <span className="text-base font-bold">{EURO}{(subtotal / 100).toFixed(2)}</span>
        </div>

        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={cart.length === 0}
          className="w-full py-3 rounded-xl text-base font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('restaurants.cart.confirm', 'Confirm order')}
        </button>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop is non-dismissible while submitting — a stray tap
              outside the modal mid-submit shouldn't close it; the user
              would lose the spinner feedback and assume the order
              didn't go through. */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => { if (!isSubmitting) setConfirming(false); }}
          />
          <div className="relative z-10 bg-white rounded-2xl w-full max-w-sm p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mx-auto mb-5">
              {isSubmitting ? (
                <div className="w-9 h-9 border-[3px] border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-9 h-9 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
              )}
            </div>
            <h2 className="text-xl font-bold mb-2">
              {isSubmitting
                ? t('restaurants.cart.placing', 'Bestelling wordt verstuurd…')
                : t('restaurants.cart.place_order', 'Place this order?')}
            </h2>
            <p className="text-base text-gray-500 mb-7">
              {itemCount} {itemCount === 1 ? t('common.item', 'item') : t('common.items', 'items')} — {EURO}{(subtotal / 100).toFixed(2)}
            </p>
            <button
              type="button"
              // Keep the modal open during submit so the spinner +
              // disabled state stays visible. Once onConfirm() resolves
              // we close the modal ourselves — the parent (DineInPage)
              // stays mounted and opens its own success/error modal on
              // top, so without this the confirm modal would linger
              // behind the result and look like the order didn't go
              // through. handleConfirm in the parent already swallows
              // errors and routes them into its result state, so
              // closing on both outcomes is correct.
              onClick={async () => {
                if (isSubmitting) return;
                try {
                  await onConfirm();
                } finally {
                  setConfirming(false);
                }
              }}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl text-base font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-colors mb-2 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {isSubmitting && (
                <span className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" aria-hidden />
              )}
              {isSubmitting
                ? t('restaurants.cart.placing_short', 'Bezig…')
                : t('restaurants.cart.ok', 'Confirm')}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl text-base font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('restaurants.cart.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
