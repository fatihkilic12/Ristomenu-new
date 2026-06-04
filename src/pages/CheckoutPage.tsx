import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { CartProvider, useCart } from '@/context/CartContext';
import { StoreConfigProvider, useStoreConfig } from '@/context/StoreConfigContext';
import { getDeliveryMenu, getPreOrderSlots } from '@/actions/store';
import { DELIVERY, PICKUP, EURO } from '@/config/constants';
import { COMPANY_ORDER, COMPANY_ORDER_TRACK } from '@/config/paths';
import { useCustomerDetails } from '@/hooks/useCustomerDetails';
import { extractPauseFromError, formatPauseUntil, isChannelPaused } from '@/lib/pause';
import { formatApiError } from '@/lib/apiError';
import { getEffectiveMinOrder } from '@/lib/minOrder';
import { getBranding } from '@/lib/branding';
import LanguageSelector from '@/components/shared/LanguageSelector';
import PauseBanner from '@/components/shared/PauseBanner';
import PreOrderSlotModal from '@/components/order/PreOrderSlotModal';

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

function CheckoutContent({ orderType }: { orderType: string }) {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const { company } = useStoreConfig();
  const { cart, note, submitOrder, resetCart, itemCount, desiredTime, setDesiredTime } = useCart();
  // Modal-open flag. The checkout page only opens this modal explicitly —
  // there's no inline picker any more. Closed-store + no-slot renders a CTA
  // that auto-opens with `required={true}`; open-store renders a small
  // "Order for later?" link with `required={false}`.
  const [pickerOpen, setPickerOpen] = useState(false);
  const { details, update, persist, setDetails } = useCustomerDetails(storeId);

  const isDelivery = orderType === DELIVERY;
  const isPickup = orderType === PICKUP;

  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // After a successful submit we resetCart() and navigate to the tracking page.
  // The reset emptties the cart, which would otherwise trigger the empty-cart
  // guard below and bounce the user back to the menu. This ref tells the guard
  // to stand down once an order has been placed.
  const submittedRef = useRef(false);

  // Ref for the inline error Alert at the top of the form. When the server
  // rejects with 400, we both render the message here AND smooth-scroll to it
  // so the customer physically sees what went wrong — the submit button
  // appearing to do nothing was a real complaint.
  const errorRef = useRef<HTMLDivElement>(null);

  // Theme mode (dark/light) — shares the order-page preference. Default light;
  // opt-in dark via the toggle (we don't read prefers-color-scheme).
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('order-theme') : null;
    return stored === 'dark' ? 'dark' : 'light';
  });
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('theme-order', themeMode === 'light' ? 'theme-order-light' : 'theme-order-dark');
    html.classList.remove(themeMode === 'light' ? 'theme-order-dark' : 'theme-order-light');
    localStorage.setItem('order-theme', themeMode);
    return () => {
      html.classList.remove('theme-order', 'theme-order-light', 'theme-order-dark');
    };
  }, [themeMode]);
  const toggleTheme = () => setThemeMode(m => m === 'dark' ? 'light' : 'dark');
  const headerBg = themeMode === 'dark' ? '#0a0a0b' : '#ffffff';
  const headerText = themeMode === 'dark' ? '#ffffff' : '#18181b';

  const { data: menu } = useQuery({
    queryKey: ['delivery-menu', storeId, orderType, i18n.language],
    queryFn: () => getDeliveryMenu(storeId!, orderType),
    enabled: !!storeId,
  });

  // Fetch slot info so we know whether the channel is currently open. The
  // PreOrderSlotPicker below uses the same query key (TanStack will dedupe).
  // We deliberately don't preload menus to discover this — `currently_open`
  // is computed cheaply server-side and lives behind a dedicated endpoint.
  const { data: slotsData } = useQuery({
    queryKey: ['preorder-slots', storeId, orderType],
    queryFn: () => getPreOrderSlots(storeId!, orderType as 'delivery' | 'pickup', 7),
    enabled: !!storeId,
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
  // First-render: while slotsData is loading we treat the store as "open" so
  // we don't flash the mandatory picker. The real value lands within ~100ms
  // and the picker then auto-shows when needed.
  const currentlyOpenForChannel = slotsData?.currently_open ?? true;
  const channelClosed = !currentlyOpenForChannel;
  // The mandatory picker is shown until the customer either picks a slot OR
  // the store comes back online. The opt-in picker is shown when the customer
  // toggles "Order for later" while the store is open.
  const mustPickSlot = channelClosed && !desiredTime;

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + getItemPrice(item, menu), 0),
    [cart, menu]
  );

  const ds = company?.delivery_settings;
  const ps = company?.pickup_settings;
  const deliveryFee = isDelivery ? (ds?.default_delivery_fee || 0) : 0;
  // Region-aware: if the customer has typed a postal code that matches a
  // region with an `override_min_order_value`, that wins over the channel
  // default. Empty postal_code → channel default. See lib/minOrder.ts.
  const minOrder = getEffectiveMinOrder(orderType, ds, company?.regions, details.postalCode);
  const total = subtotal + deliveryFee;
  const belowMin = isDelivery && minOrder > 0 && subtotal < minOrder;
  // If the channel got paused between landing here and now, block submit
  // outright. The server would 400 anyway, but stopping locally avoids the
  // round-trip and keeps the error UI tied to the visible banner.
  const channelPaused = isDelivery ? isChannelPaused(ds) : isChannelPaused(ps);

  // Empty cart guard — bounce back to menu (but not right after we just placed
  // an order, when the cart is intentionally empty and we're navigating to the
  // tracking page).
  useEffect(() => {
    if (submittedRef.current) return;
    if (cart.length === 0) {
      navigate(COMPANY_ORDER(storeId!) + (isDelivery ? '?type=delivery' : '?type=pickup'), { replace: true });
    }
  }, [cart.length, storeId, isDelivery, navigate]);

  const paymentMethods = company?.payment_methods || [];
  const enabledMethods: { slug: string; label: string; emoji: string }[] = useMemo(() => {
    // Cash is implicit on every storefront (always falls back to pay-at-door /
    // pay-at-counter). Keep it first in the list. The loop below skips a
    // server-side 'cash' entry so we don't render two cash tiles.
    const list: { slug: string; label: string; emoji: string }[] = [];
    list.push({ slug: 'cash', label: t('checkout.payment.cash', 'Cash'), emoji: '💶' });
    const map: Record<string, { label: string; emoji: string }> = {
      ideal:              { label: 'iDEAL',                                                                emoji: '🏦' },
      bancontact:         { label: 'Bancontact',                                                           emoji: '💳' },
      creditcard:         { label: 'Credit card',                                                          emoji: '💳' },
      applepay:           { label: 'Apple Pay',                                                            emoji: '🍎' },
      googlepay:          { label: 'Google Pay',                                                           emoji: '🅖' },
      paypal:             { label: 'PayPal',                                                               emoji: '🅿️' },
      bancontact_at_door: { label: t('checkout.payment.bancontact_at_door', 'Bancontact at door'),         emoji: '💳' },
      pin_at_pickup:      { label: t('checkout.payment.pin_at_pickup', 'PIN at pickup'),                   emoji: '💳' },
    };
    // Channel-restricted offline methods. Bancontact-aan-deur only makes
    // sense for delivery (driver brings the terminal); PIN-bij-afhalen
    // only for pickup (counter terminal at the restaurant).
    const onlyOn: Record<string, 'delivery' | 'pickup'> = {
      bancontact_at_door: 'delivery',
      pin_at_pickup:      'pickup',
    };
    const seen = new Set<string>(['cash']);
    for (const m of paymentMethods) {
      const slug = (m.slug || '').toLowerCase();
      if (seen.has(slug)) continue;
      if (onlyOn[slug] && onlyOn[slug] !== orderType) continue;
      seen.add(slug);
      const meta = map[slug] || { label: m.slug.replace(/_/g, ' '), emoji: '💳' };
      list.push({ slug: m.slug, label: meta.label, emoji: meta.emoji });
    }
    return list;
  }, [paymentMethods, orderType, t]);

  const requiredFilled =
    details.name.trim() &&
    details.phone.trim() &&
    details.email.trim() &&
    (!isDelivery || (details.street.trim() && details.streetNumber.trim() && details.postalCode.trim() && details.city.trim()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!requiredFilled || belowMin) return;
    // When the store is closed for this channel, force a slot pick — submitting
    // would otherwise hit the backend "currently_closed" reject. The button is
    // also disabled, this is the belt-and-braces guard.
    if (mustPickSlot) return;

    persist(details);
    setLoading(true);

    try {
      const extra: Record<string, any> = {
        order_type: orderType,
        email: details.email,
        info: { name: details.name, phone_number: details.phone, phone_country: 1 },
        payment_method: paymentMethod !== 'cash' ? paymentMethod : undefined,
        redirect_url: `${window.location.origin}/company/${storeId}/order/track/`,
      };

      if (isDelivery) {
        extra.location = {
          street_name: details.street,
          street_number: details.streetNumber,
          city: details.city,
          postal_code: details.postalCode,
          country: 1,
        };
      }

      const result = await submitOrder(extra);

      if (result?.checkout_url) {
        submittedRef.current = true;
        resetCart();
        window.location.href = result.checkout_url;
      } else if (result?.order?.secret_key) {
        submittedRef.current = true;
        navigate(COMPANY_ORDER_TRACK(storeId!, result.order.secret_key), { replace: true });
        resetCart();
      }
    } catch (err: any) {
      // The backend returns 400 + `{ detail, paused_until }` when the order
      // is rejected for a paused channel. Surface `detail` directly (already
      // translated by the server) and append a "try again after {time}" hint
      // when `paused_until` is present.
      const paused = extractPauseFromError(err);
      if (paused) {
        const until = formatPauseUntil(paused.pausedUntil, i18n.language);
        setError(
          until
            ? `${paused.detail} — ${t('pause.banner.try_again_after', 'Try again after {{time}}.', { time: until })}`
            : paused.detail,
        );
      } else {
        // formatApiError handles all DRF error shapes: { detail: "str" },
        // { detail: ["a", "b"] }, and field-keyed { location: ..., payment_method: ... }.
        // We prefer the concrete server message over a generic toast — the
        // customer needs to know exactly what to fix.
        setError(formatApiError(err, t('common.common_error', 'Something went wrong')));
      }
    } finally {
      setLoading(false);
    }
  };

  // Scroll the inline error Alert into view whenever a new error message
  // appears. Without this, the customer just sees the submit button "do
  // nothing" — the message is rendered above the form but out of viewport.
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [error]);

  const hasSavedDetails = !!(details.name || details.phone || details.email);
  const onlyCash = enabledMethods.length === 1;
  const logo = getBranding(company).logo;

  return (
    <div className="min-h-dvh">
      {/* Header — mirrors the order page so the brand stays consistent */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md border-b border-[var(--color-border)]"
        style={{ background: `${headerBg}f2`, color: headerText }}
      >
        <div className="max-w-5xl mx-auto h-16 px-4 flex items-center justify-between gap-3">
          {/* Brand: explicit back to the menu (not browser history) — this way
              we never accidentally bounce the customer to the LandingPage. */}
          <button
            type="button"
            onClick={() => navigate(COMPANY_ORDER(storeId!) + `?type=${orderType}`)}
            className={`flex items-center gap-3 -ml-1.5 px-1.5 py-1 rounded-lg min-w-0 ${
              themeMode === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'
            }`}
            aria-label={t('checkout.back_to_menu', 'Back to menu')}
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            {logo ? (
              <img
                src={logo}
                alt={company?.name}
                className="max-h-10 w-auto max-w-[60vw] sm:max-w-[40vw] object-contain"
              />
            ) : (
              <span className="font-extrabold text-base truncate capitalize">
                {company?.name || ''}
              </span>
            )}
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                themeMode === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'
              }`}
              aria-label="Toggle theme"
              title={themeMode === 'dark' ? t('common.light_mode', 'Light mode') : t('common.dark_mode', 'Dark mode')}
            >
              {themeMode === 'dark' ? '☀️' : '🌙'}
            </button>
            <LanguageSelector
              languages={company?.languages || []}
              defaultLang={company?.default_lang}
              variant={themeMode === 'dark' ? 'dark' : 'light'}
            />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-44 grid lg:grid-cols-[1fr_360px] gap-6">
        {/* Form column */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Page title + mode badge */}
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-[var(--color-accent)]/60 bg-[var(--color-accent)]/15">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" aria-hidden />
              <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-[var(--color-text)]">
                {isDelivery ? t('common.delivery', 'Delivery') : t('common.pickup', 'Pickup')}
              </span>
              {isDelivery && ds && (
                <span className="text-[13px] font-semibold text-[var(--color-text)]/80">
                  · {ds.duration_min || 20}-{ds.duration_max || 45} min
                </span>
              )}
              {isPickup && ps && (
                <span className="text-[13px] font-semibold text-[var(--color-text)]/80">
                  · ±{ps.duration || 20} min
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] leading-tight">
              {t('checkout.title', 'Checkout')}
            </h1>
            <p className="text-sm text-[var(--color-muted)] mt-1">
              {t('checkout.subtitle', 'Almost there — just a few details and you\'re done.')}
            </p>
          </div>

          {/* Pause banner — appears only when the selected channel is paused.
              Sits above the form so it's the first thing customers see. */}
          <PauseBanner
            orderType={orderType}
            deliverySettings={ds}
            pickupSettings={ps}
          />

          {/* Pre-order time slot. No inline picker — the modal owns the UX.
              - Channel closed + no slot → empty "Schedule your order" state
                with a single "Pick a time" CTA that opens the modal in
                required mode. Submit stays disabled until a slot is picked.
              - Channel closed + slot picked → show the chosen slot + a
                "Change time" link that reopens the modal.
              - Channel open  → small "Order for later?" link that opens the
                modal in optional mode. */}
          {channelClosed ? (
            <Section
              title={t('preorder.required_title', 'Schedule your order')}
              subtitle={t(
                'preorder.required_subtitle',
                'The restaurant is currently closed. Pick a time within opening hours.',
              )}
            >
              {desiredTime ? (
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30">
                  <div className="min-w-0">
                    <p className="text-xs uppercase font-semibold tracking-wider text-[var(--color-muted)]">
                      {isDelivery
                        ? t('preorder.delivery_at_label', 'Delivery at')
                        : t('preorder.pickup_at_label', 'Pickup at')}
                    </p>
                    <p className="font-bold text-[var(--color-text)] mt-0.5">
                      {formatSlotInline(desiredTime, i18n.language, t)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="shrink-0 text-sm font-semibold text-[var(--color-text)] underline underline-offset-2 hover:no-underline"
                  >
                    {t('preorder.change', 'Change time')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="w-full h-12 rounded-xl font-bold text-sm bg-[var(--color-text)] text-[var(--color-bg)] hover:opacity-90 transition-opacity"
                >
                  {t('preorder.cta_pick_time', 'Pick a time to continue')}
                </button>
              )}
            </Section>
          ) : (
            <Section
              title={t('preorder.optional_title', 'Order time')}
              subtitle={
                desiredTime
                  ? t('preorder.optional_scheduled_sub', 'Your order is scheduled.')
                  : t('preorder.optional_subtitle', 'We will start your order right away unless you schedule it for later.')
              }
            >
              {desiredTime ? (
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30">
                  <div className="min-w-0">
                    <p className="text-xs uppercase font-semibold tracking-wider text-[var(--color-muted)]">
                      {isDelivery
                        ? t('preorder.delivery_at_label', 'Delivery at')
                        : t('preorder.pickup_at_label', 'Pickup at')}
                    </p>
                    <p className="font-bold text-[var(--color-text)] mt-0.5">
                      {formatSlotInline(desiredTime, i18n.language, t)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="text-sm font-semibold text-[var(--color-text)] underline underline-offset-2 hover:no-underline"
                    >
                      {t('preorder.change', 'Change time')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDesiredTime(null)}
                      className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] underline"
                    >
                      {t('preorder.cancel_later', 'Cancel — order ASAP instead')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-[var(--color-text)]">
                    {t('preorder.asap_inline', 'As soon as possible')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="text-sm font-semibold text-[var(--color-text)] underline underline-offset-2 hover:no-underline"
                  >
                    {t('preorder.order_for_later', 'Order for later?')}
                  </button>
                </div>
              )}
            </Section>
          )}

          {/* Persistent inline error Alert. Source of truth for any 400 the
              server returns (or any client-side rejection). Stays visible
              until either the customer fixes the issue and re-submits or
              navigates away — we deliberately don't auto-dismiss. */}
          {error && (
            <div
              ref={errorRef}
              role="alert"
              aria-live="assertive"
              className="p-4 rounded-xl bg-red-500/10 text-red-600 dark:text-red-300 text-sm border border-red-500/30 flex items-start gap-3 scroll-mt-24"
            >
              <svg className="w-5 h-5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div className="flex-1 whitespace-pre-line font-medium">{error}</div>
            </div>
          )}
          {belowMin && (
            <div className="p-4 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-300 text-sm border border-orange-500/30">
              {t('checkout.min_order.short', {
                min: `${EURO}${(minOrder / 100).toFixed(2)}`,
                missing: `${EURO}${((minOrder - subtotal) / 100).toFixed(2)}`,
                defaultValue: `Minimum order value is ${EURO}${(minOrder / 100).toFixed(2)} — add ${EURO}${((minOrder - subtotal) / 100).toFixed(2)} more.`,
              })}
            </div>
          )}

          {/* Contact */}
          <Section
            title={t('checkout.contact', 'Contact details')}
            subtitle={t('checkout.contact_sub', 'We\'ll send updates to your phone and email')}
          >
            <Field label={t('common.your_name', 'Your name')} required>
              <input
                type="text" required value={details.name}
                onChange={e => update('name', e.target.value)}
                className={inputCls}
                autoComplete="name"
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t('checkout.phone', 'Phone number')} required>
                <input
                  type="tel" required value={details.phone}
                  onChange={e => update('phone', e.target.value)}
                  className={inputCls}
                  autoComplete="tel"
                />
              </Field>
              <Field label={t('checkout.email', 'Email')} required>
                <input
                  type="email" required value={details.email}
                  onChange={e => update('email', e.target.value)}
                  className={inputCls}
                  autoComplete="email"
                />
              </Field>
            </div>
          </Section>

          {/* Delivery address */}
          {isDelivery && (
            <Section
              title={t('checkout.address', 'Delivery address')}
              subtitle={t('checkout.address_sub', 'Where should we deliver your order?')}
            >
              <div className="grid grid-cols-[1fr_90px] gap-3">
                <Field label={t('checkout.street', 'Street')} required>
                  <input
                    type="text" required value={details.street}
                    onChange={e => update('street', e.target.value)}
                    className={inputCls}
                    autoComplete="street-address"
                  />
                </Field>
                <Field label={t('checkout.number', 'Nr.')} required>
                  <input
                    type="text" required value={details.streetNumber}
                    onChange={e => update('streetNumber', e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <Field label={t('checkout.postal_code', 'Postal code')} required>
                  <input
                    type="text" required value={details.postalCode}
                    onChange={e => update('postalCode', e.target.value)}
                    className={inputCls}
                    autoComplete="postal-code"
                  />
                </Field>
                <Field label={t('checkout.city', 'City')} required>
                  <input
                    type="text" required value={details.city}
                    onChange={e => update('city', e.target.value)}
                    className={inputCls}
                    autoComplete="address-level2"
                  />
                </Field>
              </div>
            </Section>
          )}

          {/* Payment */}
          <Section
            title={t('checkout.payment.title', 'Payment method')}
            subtitle={onlyCash
              ? (isDelivery
                  ? t('checkout.payment.cash_on_delivery', 'You\'ll pay cash on delivery.')
                  : t('checkout.payment.cash_on_pickup', 'You\'ll pay cash when you pick up your order.'))
              : t('checkout.payment.sub', 'How would you like to pay?')}
          >
            {onlyCash ? (
              <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/5">
                <span className="w-10 h-10 rounded-full bg-[var(--color-accent)]/15 flex items-center justify-center text-xl">💶</span>
                <span className="font-bold text-[var(--color-text)]">
                  {t('checkout.payment.cash', 'Cash')}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {enabledMethods.map(m => (
                  <button
                    key={m.slug}
                    type="button"
                    onClick={() => setPaymentMethod(m.slug)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === m.slug
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/40'
                    }`}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    <span className="text-sm font-semibold text-[var(--color-text)]">
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Section>

          {hasSavedDetails && (
            <button
              type="button"
              onClick={() => setDetails({ name: '', phone: '', email: '', street: '', streetNumber: '', postalCode: '', city: '' })}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] underline"
            >
              {t('checkout.clear_saved', 'Clear saved details')}
            </button>
          )}
        </form>

        {/* Order summary (sticky on desktop) */}
        <aside className="lg:sticky lg:top-20 lg:self-start space-y-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-[var(--color-border)] flex items-baseline justify-between">
              <h2 className="font-bold text-base text-[var(--color-text)]">
                {t('checkout.summary', 'Order summary')}
              </h2>
              <span className="text-xs text-[var(--color-muted)]">
                {itemCount} {itemCount === 1 ? t('common.item', 'item') : t('common.items', 'items')}
              </span>
            </div>
            <div className="p-5 max-h-[40vh] overflow-y-auto space-y-3">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between text-sm gap-3">
                  <span className="flex-1 capitalize">
                    <span className="font-bold text-[var(--color-text)] mr-1.5">{item.quantity}×</span>
                    <span className="text-[var(--color-text)]">{item.product_data?.name}</span>
                  </span>
                  <span className="font-semibold text-[var(--color-text)] whitespace-nowrap">
                    {EURO}{(getItemPrice(item, menu) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
              {note && (
                <p className="text-xs text-[var(--color-muted)] italic border-t border-[var(--color-border)] pt-3 mt-3">
                  "{note}"
                </p>
              )}
            </div>
            <div className="p-5 bg-[var(--color-surface-2)] border-t border-[var(--color-border)] space-y-2">
              <Row label={t('restaurants.cart.subtotal', 'Subtotal')} value={`${EURO}${(subtotal / 100).toFixed(2)}`} />
              {isDelivery && deliveryFee > 0 && (
                <Row label={t('restaurants.cart.delivery_fee', 'Delivery fee')} value={`${EURO}${(deliveryFee / 100).toFixed(2)}`} />
              )}
              <div className="pt-2 border-t border-[var(--color-border)] flex justify-between font-extrabold text-lg text-[var(--color-text)]">
                <span>{t('restaurants.cart.total', 'Total')}</span>
                <span>{EURO}{(total / 100).toFixed(2)}</span>
              </div>
              {/* Scheduled-slot chip — shown in the summary so the customer
                  sees their chosen time alongside the totals before they
                  commit. */}
              {desiredTime && (
                <div className="pt-2 border-t border-[var(--color-border)] text-sm">
                  <p className="text-[var(--color-muted)] text-xs uppercase font-semibold tracking-wider mb-1">
                    {isDelivery
                      ? t('preorder.delivery_at_label', 'Delivery at')
                      : t('preorder.pickup_at_label', 'Pickup at')}
                  </p>
                  <p className="font-bold text-[var(--color-text)]">
                    {formatSlotInline(desiredTime, i18n.language, t)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {isPickup && company?.location && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 text-sm">
              <h3 className="font-bold text-[var(--color-text)] mb-2">
                📍 {t('checkout.pickup_address', 'Pickup at')}
              </h3>
              <p className="text-[var(--color-text)] capitalize">
                {company.location.street_name} {company.location.street_number}
              </p>
              <p className="text-[var(--color-muted)] capitalize">
                {company.location.postal_code} {company.location.city}
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* Sticky bottom submit */}
      <div
        className="fixed bottom-0 left-0 right-0 border-t border-[var(--color-border)] p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] z-30"
        style={{ background: `${headerBg}f2`, backdropFilter: 'blur(12px)' }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-[var(--color-muted)] leading-none">
              {t('restaurants.cart.total', 'Total')}
            </p>
            <p className="font-extrabold text-2xl text-[var(--color-text)] mt-1">
              {EURO}{(total / 100).toFixed(2)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !requiredFilled || belowMin || cart.length === 0 || channelPaused || mustPickSlot}
            className="flex-1 max-w-md h-14 rounded-xl font-extrabold bg-[var(--color-text)] text-[var(--color-bg)] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {t('checkout.placing', 'Placing order…')}
              </span>
            ) : channelPaused ? (
              t('pause.unavailable_short', 'Tijdelijk niet beschikbaar')
            ) : mustPickSlot ? (
              t('preorder.cta_pick_time', 'Pick a time to continue')
            ) : paymentMethod === 'cash' ? (
              t('checkout.place_order', 'Place order')
            ) : (
              t('checkout.continue_to_payment', 'Continue to payment')
            )}
          </button>
        </div>
      </div>

      {/* Slot picker modal — single point of truth for slot selection on the
          checkout page. `required` is bound to channelClosed so the closed
          flow blocks both the close X and backdrop-dismiss. */}
      <PreOrderSlotModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        orderType={orderType as 'delivery' | 'pickup'}
        storeSlug={storeId!}
        required={channelClosed && !desiredTime}
        value={desiredTime}
        onChange={iso => setDesiredTime(iso)}
      />
    </div>
  );
}

const inputCls = "w-full px-4 py-3 rounded-xl border-2 border-[var(--color-border)] focus:border-[var(--color-accent)] focus:outline-none text-base bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-muted)] transition-colors";

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-[var(--color-surface)] rounded-2xl p-5 sm:p-6 border border-[var(--color-border)]">
      <h2 className="font-bold text-lg text-[var(--color-text)]">{title}</h2>
      {subtitle && <p className="text-sm text-[var(--color-muted)] mt-0.5 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-[var(--color-muted)] mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
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

// Human-friendly representation of a scheduled-slot ISO. Mirrors the helper
// used by OrderCartPanel so both pages display the same "Today HH:MM" or
// "DD Mon HH:MM" string.
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

export default function CheckoutPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [searchParams] = useSearchParams();
  const orderType = searchParams.get('type') === 'pickup' ? PICKUP : DELIVERY;
  if (!storeId) return null;

  return (
    <StoreConfigProvider storeId={storeId}>
      <CartProvider storeId={storeId} orderType={orderType}>
        <CheckoutContent orderType={orderType} />
      </CartProvider>
    </StoreConfigProvider>
  );
}
