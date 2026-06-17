import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/context/CartContext';
import { DELIVERY, PICKUP, EURO, IMAGE_ADDRESS, IMAGE_SERVER_ADDRESS } from '@/config/constants';

// Same image resolver CartSidebar / KioskCartPage use — small enough to
// duplicate inline rather than lift to a shared lib. product.uri wins
// (the API already builds the absolute CDN URL); fall back to the
// numeric image FK through IMAGE_ADDRESS only when uri is missing.
function itemImage(item: any): string | null {
  const product = item.product_data || {};
  const raw = product.uri || (product.image ? IMAGE_ADDRESS(product.image) : null);
  if (!raw) return null;
  return raw.startsWith('/') ? `${IMAGE_SERVER_ADDRESS}${raw}` : raw;
}
import { isChannelPaused } from '@/lib/pause';
import { getEffectiveMinOrder } from '@/lib/minOrder';
import { getPreOrderSlots } from '@/actions/store';
import PauseBanner from '@/components/shared/PauseBanner';
import PreOrderSlotModal from '@/components/order/PreOrderSlotModal';

type Props = {
  menu: Record<string, any> | null;
  storeConfig: Record<string, any> | null;
  effectiveType: string;
  bothActive: boolean;
  onChangeType: (t: string) => void;
  onEdit: (item: any) => void;
  onConfirm: () => void;
  /** When provided, the cart panel uses this slug to fetch pre-order slots. */
  storeSlug?: string;
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
  menu, storeConfig, effectiveType, bothActive, onChangeType, onEdit, onConfirm, storeSlug,
}: Props) {
  const { cart, deleteFromCart, updateCart, itemCount, desiredTime, setDesiredTime } = useCart();
  const { t, i18n } = useTranslation();
  // Modal-open flag. Both the "Order for later?" link and the closed-store
  // CTA route through this. We never auto-open: the customer always taps to
  // schedule (matches the Deliveroo/UberEats pattern).
  const [pickerOpen, setPickerOpen] = useState(false);

  // Fetch slots here too, scoped to the same query key the picker uses, so the
  // CTA can react to `currently_open` without waiting for the picker to mount.
  // (When `storeSlug` is missing — e.g. dine-in cart panel — we skip.)
  const isPreorderChannel = effectiveType === DELIVERY || effectiveType === PICKUP;
  const { data: slotsData } = useQuery({
    queryKey: ['preorder-slots', storeSlug, effectiveType],
    queryFn: () => getPreOrderSlots(storeSlug!, effectiveType as 'delivery' | 'pickup', 7),
    enabled: !!storeSlug && isPreorderChannel,
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
  const currentlyOpenForChannel = slotsData?.currently_open;
  // "Channel currently closed" → store the customer must pick a future time.
  // Note: we treat `undefined` (still loading) as "open" to avoid flashing the
  // closed UI on first paint.
  const channelClosed = isPreorderChannel && currentlyOpenForChannel === false;

  const subtotal = cart.reduce((sum, item) => sum + getItemPrice(item, menu), 0);
  const isDelivery = effectiveType === DELIVERY;
  const ds = storeConfig?.delivery_settings;
  const ps = storeConfig?.pickup_settings;
  const deliveryFee = isDelivery ? (ds?.default_delivery_fee || 0) : 0;
  // Cart panel doesn't yet know the customer's postal code — that's collected
  // on the CheckoutPage — so we fall back to the channel default here. The
  // CheckoutPage re-runs this with the typed postal_code and a region match
  // can lower (or raise) the threshold there.
  // TODO(regions): once postal_code is collected earlier (e.g. on landing),
  // pass it as the 4th arg so the cart panel reflects the per-region minimum.
  const minOrder = getEffectiveMinOrder(effectiveType, ds, storeConfig?.regions);
  const total = subtotal + deliveryFee;
  const belowMin = isDelivery && minOrder > 0 && subtotal < minOrder;
  const deliveryPaused = isChannelPaused(ds);
  const pickupPaused = isChannelPaused(ps);
  // Block the "Checkout" CTA if the currently selected channel is paused.
  // The actual order-create POST also rejects this server-side, but cutting
  // it off here avoids the round-trip and a confusing 400.
  const currentChannelPaused = isDelivery ? deliveryPaused : pickupPaused;

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
            {/* Paused channels stay clickable on purpose — the customer
                lands on the channel page, sees the paused hero with a
                clear reason and a one-tap switch back to the other
                channel. Disabling here would hide that path. The eta
                label flips to "Tijdelijk niet beschikbaar" so the
                channel's status is still obvious from the cart. */}
            <ToggleButton
              active={effectiveType === DELIVERY}
              onClick={() => onChangeType(DELIVERY)}
              icon="🚴"
              label={t('common.delivery', 'Delivery')}
              eta={deliveryPaused
                ? t('pause.unavailable_short', 'Tijdelijk niet beschikbaar')
                : (ds ? `${ds.duration_min || 20}-${ds.duration_max || 45} min` : '')}
              etaColor={deliveryPaused ? 'warn' : undefined}
            />
            <ToggleButton
              active={effectiveType === PICKUP}
              onClick={() => onChangeType(PICKUP)}
              icon="🛍️"
              label={t('common.pickup', 'Pickup')}
              eta={pickupPaused
                ? t('pause.unavailable_short', 'Tijdelijk niet beschikbaar')
                : (ps ? `±${ps.duration || 20} min` : '')}
              etaColor={pickupPaused ? 'warn' : undefined}
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

      {/* Pause notice — compact variant inside the panel */}
      {currentChannelPaused && (
        <div className="px-5 pb-3">
          <PauseBanner
            orderType={effectiveType}
            deliverySettings={ds}
            pickupSettings={ps}
            variant="compact"
          />
        </div>
      )}

      {/* Items — `min-h-0` is the Flexbox dance that lets a flex-1 child
          actually shrink + scroll instead of pushing siblings (totals +
          checkout button) off-screen. Without it, the scrollable area
          inherits the content's intrinsic height and the button disappears
          below the fold once a few items pile up. */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
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

              const img = itemImage(item);
              return (
                <div key={item.id} className="py-3 first:pt-1">
                  {/* Title + options (clickable to edit). Thumbnail
                      added so customers can visually pick out the item
                      instead of re-reading every line — especially
                      helpful on long delivery orders. shrink-0 fixed
                      size so a long product name can't crowd the
                      picture out. */}
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="w-full flex items-start gap-3 text-left"
                  >
                    <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-[var(--color-surface-2)] ring-1 ring-inset ring-[var(--color-border)]">
                      {img ? (
                        <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-full h-full p-2.5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M3 2v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V2" />
                          <path d="M6 11v11" />
                          <path d="M19 15V2a4 4 0 0 0-4 4v6a2 2 0 0 0 2 2h2v8" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--color-text)] leading-tight line-clamp-2 capitalize">
                        {item.product_data?.name || `#${item.product}`}
                      </p>
                      {optionLabels && (
                        <p className="text-xs text-[var(--color-muted)] line-clamp-1 mt-0.5">{optionLabels}</p>
                      )}
                    </div>
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
            <p
              role="alert"
              className="text-xs font-medium text-red-600 dark:text-red-300 mt-2"
            >
              {t('checkout.min_order.short', {
                min: `${EURO}${(minOrder / 100).toFixed(2)}`,
                missing: `${EURO}${((minOrder - subtotal) / 100).toFixed(2)}`,
                defaultValue: `Minimum order value is ${EURO}${(minOrder / 100).toFixed(2)} — add ${EURO}${((minOrder - subtotal) / 100).toFixed(2)} more.`,
              })}
            </p>
          )}
        </div>
      )}

      {/* Scheduled-slot confirmation badge — shows when a future time has
          been committed. The customer can tap "Change time" to re-open the
          modal, or tap "ASAP" (when the store is open) to revert. */}
      {desiredTime && cart.length > 0 && (
        <div className="px-5 pb-2">
          <div className="p-3 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-sm">
            <p className="font-semibold text-[var(--color-text)]">
              {isDelivery
                ? t('preorder.scheduled_delivery', 'For delivery at {{label}}', {
                    label: formatSlotInline(desiredTime, i18n.language, t),
                  })
                : t('preorder.scheduled_pickup', 'For pickup at {{label}}', {
                    label: formatSlotInline(desiredTime, i18n.language, t),
                  })}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] underline"
              >
                {t('preorder.change', 'Change time')}
              </button>
              {/* Only allow reverting to ASAP when the store is open — when
                  closed, "ASAP" isn't a valid choice. */}
              {!channelClosed && (
                <button
                  type="button"
                  onClick={() => setDesiredTime(null)}
                  className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] underline"
                >
                  {t('preorder.cancel_later', 'Cancel — order ASAP instead')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* "Order for later?" link — visible only when the store is open and no
          slot is already committed. Closed-store flow goes through the CTA
          itself (see disabled "Pick a time to continue" below). */}
      {storeSlug && isPreorderChannel && !channelClosed && !desiredTime && cart.length > 0 && (
        <div className="px-5 pb-1">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full text-sm font-semibold text-[var(--color-text)] underline underline-offset-2 hover:no-underline py-2"
          >
            {t('preorder.order_for_later', 'Order for later?')}
          </button>
        </div>
      )}

      {/* Submit. When below-min, the button is disabled AND aria-disabled so
          screen readers + the inline warning above tell the same story. The
          short label "Min. €X — add €Y" replaces the normal "Checkout · N
          items" CTA so the reason is visible on the button itself.
          When the store is closed for this channel the CTA flips to "Order
          for later" until a slot is picked. */}
      <div className="px-5 pb-5 pt-4">
        <button
          type="button"
          onClick={() => {
            // Closed-store flow: the CTA doubles as "open the slot modal" until
            // the customer has picked a future time. Once a slot is in
            // desiredTime we resume normal checkout.
            if (channelClosed && !desiredTime && isPreorderChannel && storeSlug) {
              setPickerOpen(true);
              return;
            }
            onConfirm();
          }}
          disabled={
            cart.length === 0 ||
            belowMin ||
            currentChannelPaused
          }
          aria-disabled={
            cart.length === 0 ||
            belowMin ||
            currentChannelPaused ||
            undefined
          }
          className="w-full h-12 rounded-xl font-bold text-base bg-[var(--color-text)] text-[var(--color-bg)] hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale flex items-center justify-center gap-2"
        >
          {currentChannelPaused
            ? t('pause.unavailable_short', 'Tijdelijk niet beschikbaar')
            : cart.length === 0
              ? t('checkout.empty', 'Add items to start')
              : belowMin
                ? t('checkout.min_order.cta', {
                    min: `${EURO}${(minOrder / 100).toFixed(2)}`,
                    missing: `${EURO}${((minOrder - subtotal) / 100).toFixed(2)}`,
                    defaultValue: `Min. ${EURO}${(minOrder / 100).toFixed(2)} — add ${EURO}${((minOrder - subtotal) / 100).toFixed(2)}`,
                  })
                : channelClosed && !desiredTime
                  ? t('preorder.cta_pick_time', 'Pick a time to continue')
                  : <>
                      <span>{t('checkout.go_to_checkout', 'Checkout')}</span>
                      <span className="opacity-70">·</span>
                      <span>{itemCount} {itemCount === 1 ? t('common.item', 'item') : t('common.items', 'items')}</span>
                    </>
          }
        </button>
      </div>

      {/* Slot picker modal. Mounted once, controlled by `pickerOpen`. We force
          `required` whenever the channel is closed — that hides the close X
          and the backdrop-dismiss so the user has to commit to a slot or
          change channel/cart. */}
      {storeSlug && isPreorderChannel && (
        <PreOrderSlotModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          orderType={effectiveType as 'delivery' | 'pickup'}
          storeSlug={storeSlug}
          required={channelClosed}
          value={desiredTime}
          onChange={iso => setDesiredTime(iso)}
        />
      )}
    </aside>
  );
}

// Short representation of the desired-time ISO for in-line copy. Reuses the
// device locale so the formatting matches the customer's typical clock. We
// keep this dumb on purpose — anything richer (e.g. "Tomorrow at 13:00")
// would re-implement the day-grouping logic that already lives in the picker.
function formatSlotInline(iso: string, locale: string, t: (k: string, def: string) => string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  try {
    const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    if (sameDay) return `${t('preorder.today', 'Today')} ${time}`;
    const day = d.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
    return `${day} ${time}`;
  } catch {
    return iso;
  }
}

function ToggleButton({ active, onClick, icon, label, eta, etaColor }: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  eta: string;
  /** `warn` paints the eta line orange — used to flag a paused channel
   *  while keeping the button clickable. */
  etaColor?: 'warn';
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
      <span className="text-left min-w-0">
        <span className="block text-sm font-bold leading-tight text-[var(--color-text)]">
          {label}
        </span>
        {eta && (
          <span
            className={`block text-[11px] leading-tight mt-0.5 truncate ${
              etaColor === 'warn' ? 'text-orange-500' : 'text-[var(--color-muted)]'
            }`}
          >
            {eta}
          </span>
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
