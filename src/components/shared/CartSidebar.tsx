import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useTranslation } from 'react-i18next';
import { EURO } from '@/config/constants';

type Props = {
  menu: Record<string, any> | null;
  onEdit: (item: any) => void;
  onConfirm: () => void;
};

export default function CartSidebar({ menu, onEdit, onConfirm }: Props) {
  const { cart, note, setNote, deleteFromCart, itemCount } = useCart();
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);

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
        <h2 className="font-bold text-lg">{t('restaurants.cart.title', 'Your order')}</h2>
        <span className="text-sm text-[var(--color-muted)]">{itemCount} {itemCount === 1 ? t('common.item', 'item') : t('common.items', 'items')}</span>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 && (
          <p className="text-center text-[var(--color-muted)] text-sm py-8">{t('restaurants.cart.empty', 'Your cart is empty')}</p>
        )}
        {cart.map(item => (
          <div key={item.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50">
            <span className="bg-[var(--color-primary)] text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
              {item.quantity}
            </span>
            <div className="flex-1 min-w-0">
              <button type="button" onClick={() => onEdit(item)} className="text-[13px] font-medium text-left hover:underline truncate block w-full">
                {item.product_data?.name || `#${item.product}`}
              </button>
              {item.options && Object.keys(item.options).length > 0 && (
                <p className="text-[11px] text-[var(--color-muted)] truncate">
                  {Object.keys(item.options).map(optId => {
                    for (const group of (item.options_data || [])) {
                      const opt = group.items?.find((i: any) => i.id === Number(optId));
                      if (opt) return opt.name;
                    }
                    return null;
                  }).filter(Boolean).join(', ')}
                </p>
              )}
              {item.note && <p className="text-[11px] text-[var(--color-muted)] truncate">{item.note}</p>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[13px] font-medium">{EURO}{(getPrice(item) / 100).toFixed(2)}</span>
              <button type="button" onClick={() => deleteFromCart(item.id)} className="text-gray-300 hover:text-red-500 text-xs p-0.5">✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Note */}
      <div className="px-3 py-2 border-t border-[var(--color-border)]">
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={t('restaurants.cart.note.add', 'Add a note...')}
          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--color-border)]">
        <div className="flex justify-between mb-3">
          <span className="text-sm font-medium">{t('restaurants.cart.subtotal', 'Subtotal')}</span>
          <span className="font-bold">{EURO}{(subtotal / 100).toFixed(2)}</span>
        </div>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={cart.length === 0}
            className="w-full py-3 rounded-xl font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('restaurants.cart.confirm', 'Confirm order')}
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-center text-sm text-[var(--color-muted)]">
              {t('restaurants.cart.place_order', 'Place this order?')}
            </p>
            <button
              type="button"
              onClick={() => { setConfirming(false); onConfirm(); }}
              className="w-full py-3 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              {t('restaurants.cart.ok', 'Confirm')} — {EURO}{(subtotal / 100).toFixed(2)}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="w-full py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
            >
              {t('restaurants.cart.cancel', 'Cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
