import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { CartProvider, useCart } from '@/context/CartContext';
import { StoreConfigProvider, useStoreConfig } from '@/context/StoreConfigContext';
import { getDeliveryMenu } from '@/actions/store';
import { DELIVERY, PICKUP, EURO } from '@/config/constants';
import { COMPANY_ORDER, COMPANY_ORDER_TRACK } from '@/config/paths';
import { useCustomerDetails } from '@/hooks/useCustomerDetails';
import LanguageSelector from '@/components/shared/LanguageSelector';

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
  const { cart, note, submitOrder, resetCart, itemCount } = useCart();
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

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + getItemPrice(item, menu), 0),
    [cart, menu]
  );

  const ds = company?.delivery_settings;
  const ps = company?.pickup_settings;
  const deliveryFee = isDelivery ? (ds?.default_delivery_fee || 0) : 0;
  const minOrder = isDelivery ? (ds?.min_order_value || 0) : 0;
  const total = subtotal + deliveryFee;
  const belowMin = isDelivery && minOrder > 0 && subtotal < minOrder;

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
    const list: { slug: string; label: string; emoji: string }[] = [];
    list.push({ slug: 'cash', label: t('checkout.payment.cash', 'Cash'), emoji: '💶' });
    for (const m of paymentMethods) {
      const slug = (m.slug || '').toLowerCase();
      const map: Record<string, { label: string; emoji: string }> = {
        ideal:        { label: 'iDEAL',          emoji: '🏦' },
        bancontact:   { label: 'Bancontact',     emoji: '💳' },
        creditcard:   { label: 'Credit card',    emoji: '💳' },
        applepay:     { label: 'Apple Pay',      emoji: '🍎' },
        googlepay:    { label: 'Google Pay',     emoji: '🅖' },
        paypal:       { label: 'PayPal',         emoji: '🅿️' },
      };
      const meta = map[slug] || { label: m.slug, emoji: '💳' };
      list.push({ slug: m.slug, label: meta.label, emoji: meta.emoji });
    }
    return list;
  }, [paymentMethods, t]);

  const requiredFilled =
    details.name.trim() &&
    details.phone.trim() &&
    details.email.trim() &&
    (!isDelivery || (details.street.trim() && details.streetNumber.trim() && details.postalCode.trim() && details.city.trim()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!requiredFilled || belowMin) return;

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
      const detail = err?.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail.join(' ') : (detail || err?.message || t('common.common_error', 'Something went wrong'));
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const hasSavedDetails = !!(details.name || details.phone || details.email);
  const onlyCash = enabledMethods.length === 1;

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
            <span className="text-lg" aria-hidden>←</span>
            {company?.img && (
              <img
                src={company.img}
                alt=""
                className="w-9 h-9 rounded-lg object-cover ring-1 ring-black/10"
              />
            )}
            <span className="font-extrabold text-base truncate capitalize">
              {company?.name || ''}
            </span>
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
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" aria-hidden />
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text)]">
                {isDelivery ? t('common.delivery', 'Delivery') : t('common.pickup', 'Pickup')}
              </span>
              {isDelivery && ds && (
                <span className="text-xs font-medium text-[var(--color-muted)]">
                  · {ds.duration_min || 20}-{ds.duration_max || 45} min
                </span>
              )}
              {isPickup && ps && (
                <span className="text-xs font-medium text-[var(--color-muted)]">
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

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 text-red-500 text-sm border border-red-500/30">
              {error}
            </div>
          )}
          {belowMin && (
            <div className="p-4 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-300 text-sm border border-orange-500/30">
              {t('restaurants.cart.minimum_alert.text', {
                company: company?.name,
                price: `${EURO}${(minOrder / 100).toFixed(2)}`,
                rest: `${EURO}${((minOrder - subtotal) / 100).toFixed(2)}`,
                defaultValue: `Minimum order is ${EURO}${(minOrder / 100).toFixed(2)}.`,
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
                    <span className={`text-sm font-semibold ${
                      paymentMethod === m.slug ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'
                    }`}>
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
                    <span className="font-bold text-[var(--color-accent)] mr-1.5">{item.quantity}×</span>
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
            disabled={loading || !requiredFilled || belowMin || cart.length === 0}
            className="flex-1 max-w-md h-14 rounded-xl font-extrabold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {t('checkout.placing', 'Placing order…')}
              </span>
            ) : paymentMethod === 'cash' ? (
              t('checkout.place_order', 'Place order')
            ) : (
              t('checkout.continue_to_payment', 'Continue to payment')
            )}
          </button>
        </div>
      </div>
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
