import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useStoreConfig } from '@/context/StoreConfigContext';
import { useTranslation } from 'react-i18next';
import { EURO } from '@/config/constants';
import { getBranding } from '@/lib/branding';
import CartUpsellRail from '@/components/order/CartUpsellRail';

type Props = {
  menu: Record<string, any> | null;
  onEdit: (item: any) => void;
  onConfirm: () => void;
};

export default function CartSidebar({ menu, onEdit, onConfirm }: Props) {
  const { cart, note, setNote, updateCart, deleteFromCart, itemCount } = useCart();
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
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-[var(--color-border)]">
        <h2 className="font-bold text-xl">{t('restaurants.cart.title', 'Your order')}</h2>
        <span className="text-base text-[var(--color-muted)]">{itemCount} {itemCount === 1 ? t('common.item', 'item') : t('common.items', 'items')}</span>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
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

          return (
            <div key={item.id} className="py-2 first:pt-1 px-1 border-b last:border-b-0 border-[var(--color-border)]">
              <button type="button" onClick={() => onEdit(item)} className="w-full text-left">
                <p className="text-base font-semibold leading-tight line-clamp-2">
                  {item.product_data?.name || `#${item.product}`}
                </p>
                {optionLabels && (
                  <p className="text-sm text-[var(--color-muted)] line-clamp-1 mt-0.5">{optionLabels}</p>
                )}
                {item.note && (
                  <p className="text-sm text-[var(--color-muted)] line-clamp-1 mt-0.5 italic">{item.note}</p>
                )}
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
      {cart.length > 0 && <CartUpsellRail menu={menu}/>}

      {/* Note */}
      {allow_notes && (
        <div className="px-3 py-2 border-t border-[var(--color-border)]">
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
      <div className="p-3 border-t border-[var(--color-border)]">
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
          <div className="fixed inset-0 bg-black/50" onClick={() => setConfirming(false)} />
          <div className="relative z-10 bg-white rounded-2xl w-full max-w-sm p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mx-auto mb-5">
              <svg className="w-9 h-9 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
            </div>
            <h2 className="text-xl font-bold mb-2">{t('restaurants.cart.place_order', 'Place this order?')}</h2>
            <p className="text-base text-gray-500 mb-7">
              {itemCount} {itemCount === 1 ? t('common.item', 'item') : t('common.items', 'items')} — {EURO}{(subtotal / 100).toFixed(2)}
            </p>
            <button
              type="button"
              onClick={() => { setConfirming(false); onConfirm(); }}
              className="w-full py-3.5 rounded-xl text-base font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-colors mb-2"
            >
              {t('restaurants.cart.ok', 'Confirm')}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="w-full py-3 rounded-xl text-base font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              {t('restaurants.cart.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
