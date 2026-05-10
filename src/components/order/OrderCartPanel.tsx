import { useTranslation } from 'react-i18next';
import { useCart } from '@/context/CartContext';
import { DELIVERY, PICKUP, EURO } from '@/config/constants';

type Props = {
  menu: Record<string, any> | null;
  storeConfig: Record<string, any> | null;
  effectiveType: string;
  bothActive: boolean;
  onChangeType: (t: string) => void;
  onEdit: (item: any) => void;
  onConfirm: () => void;
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

export default function OrderCartPanel({
  menu, storeConfig, effectiveType, bothActive, onChangeType, onEdit, onConfirm,
}: Props) {
  const { cart, deleteFromCart, updateCart, itemCount } = useCart();
  const { t } = useTranslation();

  const subtotal = cart.reduce((sum, item) => sum + getItemPrice(item, menu), 0);
  const isDelivery = effectiveType === DELIVERY;
  const ds = storeConfig?.delivery_settings;
  const ps = storeConfig?.pickup_settings;
  const deliveryFee = isDelivery ? (ds?.default_delivery_fee || 0) : 0;
  const minOrder = isDelivery ? (ds?.min_order_value || 0) : 0;
  const total = subtotal + deliveryFee;
  const belowMin = isDelivery && minOrder > 0 && subtotal < minOrder;

  const change = (item: any, delta: number) => {
    const q = item.quantity + delta;
    if (q <= 0) deleteFromCart(item.id);
    else updateCart(item.id, { ...item, quantity: q });
  };

  return (
    <aside className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <h2 className="text-xl font-extrabold text-[var(--color-text)]">
          {t('restaurants.cart.title', 'Your order')}
        </h2>
      </div>

      {/* Delivery / pickup — toggle when both are active, single label otherwise */}
      {bothActive ? (
        <div className="px-5 pb-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--color-surface-2)] rounded-xl">
            <ToggleButton
              active={effectiveType === DELIVERY}
              onClick={() => onChangeType(DELIVERY)}
              icon="🚴"
              label={t('common.delivery', 'Delivery')}
              eta={ds ? `${ds.duration_min || 20}-${ds.duration_max || 45} min` : ''}
            />
            <ToggleButton
              active={effectiveType === PICKUP}
              onClick={() => onChangeType(PICKUP)}
              icon="🛍️"
              label={t('common.pickup', 'Pickup')}
              eta={ps ? `±${ps.duration || 20} min` : ''}
            />
          </div>
        </div>
      ) : (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)]">
            <span className="text-xl" aria-hidden>{isDelivery ? '🚴' : '🛍️'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] leading-none">
                {t('checkout.order_mode', 'Order mode')}
              </p>
              <p className="text-sm font-extrabold text-[var(--color-text)] leading-tight mt-0.5">
                {isDelivery ? t('common.delivery', 'Delivery') : t('common.pickup', 'Pickup')}
              </p>
            </div>
            <p className="text-xs text-[var(--color-muted)] shrink-0">
              {isDelivery && ds
                ? `${ds.duration_min || 20}-${ds.duration_max || 45} min`
                : ps
                  ? `±${ps.duration || 20} min`
                  : ''}
            </p>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center text-center py-10 text-[var(--color-muted)]">
            <span className="text-5xl mb-3" aria-hidden>🛒</span>
            <p className="font-bold text-[var(--color-text)]">{t('checkout.fill_basket', 'Fill your basket')}</p>
            <p className="text-sm mt-1">{t('restaurants.cart.empty', 'Your basket is empty')}</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {cart.map(item => {
              const itemTotal = getItemPrice(item, menu);
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
                <div key={item.id} className="py-3 first:pt-1">
                  {/* Title + options (clickable to edit) */}
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="w-full text-left"
                  >
                    <p className="text-sm font-semibold text-[var(--color-text)] leading-tight line-clamp-2 capitalize">
                      {item.product_data?.name || `#${item.product}`}
                    </p>
                    {optionLabels && (
                      <p className="text-xs text-[var(--color-muted)] line-clamp-1 mt-0.5">{optionLabels}</p>
                    )}
                  </button>

                  {/* Price + horizontal qty stepper */}
                  <div className="flex items-center justify-between gap-3 mt-2">
                    <span className="text-sm font-bold text-[var(--color-text)]">
                      {EURO}{(itemTotal / 100).toFixed(2)}
                    </span>
                    <div className="flex items-center bg-[var(--color-surface-2)] rounded-full p-0.5 border border-[var(--color-border)]">
                      <button
                        type="button"
                        onClick={() => change(item, -1)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors ${
                          isLast
                            ? 'text-red-400 hover:bg-red-500/15'
                            : 'text-[var(--color-text)] hover:bg-[var(--color-text)]/10'
                        }`}
                        aria-label={isLast ? 'Remove' : 'Decrease'}
                      >
                        {isLast
                          ? <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                          : <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        }
                      </button>
                      <span className="w-6 text-center text-sm font-extrabold tabular-nums text-[var(--color-text)]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => change(item, 1)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-accent)] hover:bg-[var(--color-accent)]/15 transition-colors"
                        aria-label="Increase"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Totals */}
      {cart.length > 0 && (
        <div className="px-5 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-2)] space-y-1.5">
          <Row label={t('restaurants.cart.subtotal', 'Subtotal')} value={`${EURO}${(subtotal / 100).toFixed(2)}`} />
          {isDelivery && deliveryFee > 0 && (
            <Row label={t('restaurants.cart.delivery_fee', 'Delivery fee')} value={`${EURO}${(deliveryFee / 100).toFixed(2)}`} />
          )}
          <div className="flex justify-between font-extrabold text-base text-[var(--color-text)] pt-1">
            <span>{t('restaurants.cart.total', 'Total')}</span>
            <span>{EURO}{(total / 100).toFixed(2)}</span>
          </div>
          {belowMin && (
            <p className="text-xs text-orange-300 mt-2">
              {t('restaurants.cart.minimum_alert.text', {
                company: storeConfig?.name,
                price: `${EURO}${(minOrder / 100).toFixed(2)}`,
                rest: `${EURO}${((minOrder - subtotal) / 100).toFixed(2)}`,
                defaultValue: `Minimum order ${EURO}${(minOrder / 100).toFixed(2)}, you need ${EURO}${((minOrder - subtotal) / 100).toFixed(2)} more.`,
              })}
            </p>
          )}
        </div>
      )}

      {/* Submit */}
      <div className="px-5 pb-5 pt-4">
        <button
          type="button"
          onClick={onConfirm}
          disabled={cart.length === 0 || belowMin}
          className="w-full h-12 rounded-xl font-bold text-base bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {cart.length === 0
            ? t('checkout.empty', 'Add items to start')
            : <>
                <span>{t('checkout.go_to_checkout', 'Checkout')}</span>
                <span className="opacity-70">·</span>
                <span>{itemCount} {itemCount === 1 ? t('common.item', 'item') : t('common.items', 'items')}</span>
              </>
          }
        </button>
      </div>
    </aside>
  );
}

function ToggleButton({ active, onClick, icon, label, eta }: {
  active: boolean; onClick: () => void; icon: string; label: string; eta: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all ${
        active
          ? 'bg-[var(--color-bg)] ring-1 ring-[var(--color-accent)]'
          : 'bg-transparent hover:bg-white/5'
      }`}
    >
      <span className="text-lg" aria-hidden>{icon}</span>
      <span className="text-left">
        <span className={`block text-sm font-bold leading-tight ${active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}>
          {label}
        </span>
        {eta && (
          <span className="block text-[11px] leading-tight text-[var(--color-muted)] mt-0.5">{eta}</span>
        )}
      </span>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="font-semibold text-[var(--color-text)]">{value}</span>
    </div>
  );
}
