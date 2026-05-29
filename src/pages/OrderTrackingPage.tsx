import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { fetchGuestOrder } from '@/actions/order';
import { StoreConfigProvider, useStoreConfig } from '@/context/StoreConfigContext';
import { EURO } from '@/config/constants';
import { COMPANY_ORDER } from '@/config/paths';
import { getBranding } from '@/lib/branding';
import LanguageSelector from '@/components/shared/LanguageSelector';
import StoreFooter from '@/components/shared/StoreFooter';

function safeHostname(url: string): string | null {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch { return null; }
}

type OrderStatus =
  | 'PENDING' | 'AWAITING_CONFIRMATION' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'READY_FOR_PICKUP'
  | 'DELIVERED' | 'PICKED_UP' | 'CANCELLED' | 'FAILED'
  | 'AWAITING_PAYMENT' | 'SCHEDULED' | 'HANDLED' | 'SEND';

const TERMINAL = new Set<OrderStatus>(['DELIVERED', 'PICKED_UP', 'CANCELLED', 'FAILED']);

// AWAITING_CONFIRMATION shares the "received" timeline step — visually they
// both mean "with us, kitchen hasn't started yet". The hero copy + ETA block
// surface the distinction explicitly.
function normalizeStatusForTimeline(s: OrderStatus): OrderStatus {
  return s === 'AWAITING_CONFIRMATION' ? 'PENDING' : s;
}

function pickupSteps(status: OrderStatus, t: TFunction): { key: OrderStatus; label: string; passed: boolean; current: boolean }[] {
  const order: OrderStatus[] = ['PENDING', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP'];
  const effective = normalizeStatusForTimeline(status);
  const idx = order.indexOf(effective);
  return [
    { key: 'PENDING',          label: t('tracking.steps.received', 'Order received'),      passed: idx >= 0, current: effective === 'PENDING' },
    { key: 'PREPARING',        label: t('tracking.steps.preparing', 'Being prepared'),     passed: idx >= 1, current: effective === 'PREPARING' },
    { key: 'READY_FOR_PICKUP', label: t('tracking.steps.ready_pickup', 'Ready for pickup'), passed: idx >= 2, current: effective === 'READY_FOR_PICKUP' },
    { key: 'PICKED_UP',        label: t('tracking.steps.picked_up', 'Picked up'),          passed: idx >= 3, current: effective === 'PICKED_UP' },
  ];
}

function deliverySteps(status: OrderStatus, t: TFunction): { key: OrderStatus; label: string; passed: boolean; current: boolean }[] {
  const order: OrderStatus[] = ['PENDING', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  const effective = normalizeStatusForTimeline(status);
  const idx = order.indexOf(effective);
  return [
    { key: 'PENDING',          label: t('tracking.steps.received', 'Order received'),   passed: idx >= 0, current: effective === 'PENDING' },
    { key: 'PREPARING',        label: t('tracking.steps.preparing', 'Being prepared'),  passed: idx >= 1, current: effective === 'PREPARING' },
    { key: 'OUT_FOR_DELIVERY', label: t('tracking.steps.on_its_way', 'On its way'),     passed: idx >= 2, current: status === 'OUT_FOR_DELIVERY' },
    { key: 'DELIVERED',        label: t('tracking.steps.delivered', 'Delivered'),       passed: idx >= 3, current: status === 'DELIVERED' },
  ];
}

function timeAgo(timestamp: string | number, t: TFunction): string {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  if (!ts) return '';
  const ms = ts > 1e12 ? ts : ts * 1000;
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return t('tracking.time.just_now', 'just now');
  const min = Math.floor(diffSec / 60);
  if (min < 60) return t('tracking.time.minutes_ago', '{{count}} min ago', { count: min });
  const h = Math.floor(min / 60);
  return t('tracking.time.hours_ago', '{{count}}h ago', { count: h });
}

function TrackingContent() {
  const { storeId, secretKey } = useParams<{ storeId: string; secretKey: string }>();
  const { company } = useStoreConfig();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const branding = getBranding(company);
  const logo = branding.logo;
  const websiteUrl: string | undefined = branding.website_url || undefined;
  const websiteHostname = websiteUrl ? safeHostname(websiteUrl) : null;
  const goToWebsite = () => { if (websiteUrl) window.location.href = websiteUrl; };
  const goToMenu = () => navigate(COMPANY_ORDER(storeId!));

  // Theme — shares the order-page preference. Default light; opt-in dark
  // via the toggle (we don't read prefers-color-scheme).
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

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-track', secretKey],
    queryFn: () => fetchGuestOrder(secretKey!),
    refetchInterval: 10_000,
    enabled: !!secretKey,
  });

  // Tick once a minute so the "X min ago" label stays fresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-4 bg-[var(--color-bg)] text-[var(--color-text)]">
        <span className="text-6xl">🔍</span>
        <h1 className="text-2xl font-extrabold">{t('tracking.not_found_title', 'Order not found')}</h1>
        <p className="text-[var(--color-muted)] text-center max-w-md">
          {t('tracking.not_found_sub', 'This tracking link may have expired or is invalid.')}
        </p>
      </div>
    );
  }

  const isDelivery = order.order_type === 'delivery';
  const isCancelled = order.status === 'CANCELLED' || order.status === 'FAILED';
  const isAwaitingPayment = order.status === 'AWAITING_PAYMENT';
  const isAwaitingConfirmation = order.status === 'AWAITING_CONFIRMATION';
  const isComplete = TERMINAL.has(order.status);
  const declineReason: string | undefined = (order as any).decline_reason || undefined;
  const etaMin: number | null = (order as any).eta_min_minutes ?? null;
  const etaMax: number | null = (order as any).eta_max_minutes ?? null;

  const steps = isDelivery ? deliverySteps(order.status, t) : pickupSteps(order.status, t);

  // ETA copy is driven entirely by the backend's eta_min_minutes / eta_max_minutes
  // pair. The customer storefront never touches confirmed_time directly — once the
  // operator accepts, the numbers below already reflect "minutes from now".
  // Returns null when there's nothing to render (dine-in/kiosk, cancelled, etc.).
  const etaLabel: string | null = (() => {
    if (isCancelled) return null;
    if (etaMin == null || etaMax == null) return null;
    const base = etaMin === etaMax
      ? t('tracking.eta.ready_in', 'Ready in ~{{n}} min', { n: etaMin })
      : isDelivery
        ? t('tracking.eta.delivery_between', 'Delivery between {{min}}-{{max}} min', { min: etaMin, max: etaMax })
        : t('tracking.eta.between', 'Ready in {{min}}-{{max}} min', { min: etaMin, max: etaMax });
    if (isAwaitingConfirmation) {
      return t('tracking.eta.estimated_prefix', 'Estimated: {{value}}', { value: base });
    }
    return base;
  })();

  const placedAt = timeAgo(order.created_on, t);

  // Hero copy adapts to status
  const heroTitle = isCancelled
    ? t('tracking.cancelled_title', 'Order cancelled')
    : isAwaitingPayment
      ? t('tracking.awaiting_payment_title', 'Waiting for payment')
      : isAwaitingConfirmation
        ? t('tracking.awaiting_confirmation_title', 'Waiting for the restaurant to accept')
        : order.status === 'DELIVERED' || order.status === 'PICKED_UP'
          ? t('tracking.complete_title', 'Enjoy your meal!')
          : t('tracking.received_title', 'Order received');
  const heroEmoji = isCancelled ? '⚠️' : isAwaitingPayment ? '⏳' : isAwaitingConfirmation ? '👀' : isComplete ? '🎉' : '🍽️';

  return (
    <div className="min-h-dvh">
      {/* Header — consistent with order/checkout pages */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md border-b border-[var(--color-border)]"
        style={{ background: `${headerBg}f2`, color: headerText }}
      >
        <div className="max-w-3xl mx-auto h-16 px-4 flex items-center justify-between gap-3">
          {/* Brand button — back to website if configured, otherwise the menu */}
          <button
            type="button"
            onClick={websiteUrl ? goToWebsite : goToMenu}
            className={`flex items-center gap-3 -ml-1.5 px-1.5 py-1 rounded-lg min-w-0 ${
              themeMode === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'
            }`}
            aria-label={websiteUrl ? t('common.back_to_website', 'Back to website') : t('tracking.back_to_menu', 'Back to menu')}
          >
            {logo && (
              <img src={logo} alt="" className="w-9 h-9 rounded-lg object-cover ring-1 ring-black/10" />
            )}
            <span className="font-extrabold text-base truncate capitalize">{company?.name || ''}</span>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            {websiteUrl && (
              <button
                type="button"
                onClick={goToWebsite}
                className={`hidden sm:inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-sm font-semibold ${
                  themeMode === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'
                }`}
                title={websiteUrl}
              >
                <span aria-hidden>←</span>
                <span>{t('common.back_to_website', 'Back to website')}</span>
                {websiteHostname && (
                  <span className="opacity-60 hidden md:inline">· {websiteHostname}</span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                themeMode === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'
              }`}
              aria-label="Toggle theme"
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-12 space-y-5">
        {/* Hero card with status */}
        <section className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 sm:p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--color-accent)]/15 mb-4">
            <span className="text-4xl" aria-hidden>{heroEmoji}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text)] leading-tight">
            {heroTitle}
          </h1>
          <p className="text-[var(--color-muted)] mt-2">
            {isCancelled
              ? (declineReason
                  ? t('tracking.cancelled_with_reason', 'The restaurant declined: {{reason}}', { reason: declineReason })
                  : t('tracking.cancelled_sub', 'Please contact the restaurant for details.'))
              : isAwaitingPayment
                ? t('tracking.awaiting_payment_sub', 'Complete your payment to confirm the order.')
                : isAwaitingConfirmation
                  ? t('tracking.awaiting_confirmation_sub', 'We\'ve sent your order to the restaurant. You\'ll see a confirmation as soon as they accept it.')
                  : isComplete
                    ? t('tracking.complete_sub', 'Thanks for ordering — see you next time!')
                    : isDelivery
                      ? t('tracking.delivery_sub', 'We\'ll keep you posted as we prepare and dispatch your order.')
                      : t('tracking.pickup_sub', 'We\'ll let you know when your order is ready to pick up.')}
          </p>

          {/* Order number + meta */}
          <div className="mt-5 inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[var(--color-surface-2)] text-sm">
            <span className="text-[var(--color-muted)]">{t('tracking.order_number', 'Order')}</span>
            <span className="font-extrabold text-[var(--color-text)] tracking-wider">#{order.name}</span>
            {placedAt && (
              <>
                <span className="text-[var(--color-muted)]">·</span>
                <span className="text-[var(--color-muted)]">{placedAt}</span>
              </>
            )}
          </div>

          {/* Scheduled-for chip — surfaces the committed time when this is a
              pre-order. We show it most prominently while AWAITING_CONFIRMATION
              (customer is anxiously checking) but keep it visible through
              PREPARING too as a reminder. Once the order is OUT_FOR_DELIVERY
              / READY_FOR_PICKUP the ETA pill takes over. Prefer
              `confirmed_time` so that operator counter-offers (e.g. customer
              asked 23:45, operator pushed it +15 min) are reflected here. */}
          {(() => {
            const scheduledTime = (order as any).confirmed_time ?? (order as any).desired_time;
            if (isComplete || isCancelled || isAwaitingPayment || !scheduledTime) return null;
            return (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-sm">
                <span aria-hidden>📅</span>
                <span className="font-semibold text-[var(--color-text)]">
                  {isDelivery
                    ? t('preorder.tracking.delivery_scheduled', 'Scheduled for delivery at {{time}}', {
                        time: formatScheduledTime(scheduledTime, t),
                      })
                    : t('preorder.tracking.pickup_scheduled', 'Scheduled for pickup at {{time}}', {
                        time: formatScheduledTime(scheduledTime, t),
                      })}
                </span>
              </div>
            );
          })()}

          {/* ETA — driven by backend eta_min_minutes / eta_max_minutes. Hidden
              for dine-in/kiosk (nulls), cancelled, or payment-pending orders.
              Also hidden when the customer scheduled a specific desired_time
              (the "Scheduled for HH:MM" chip above is more useful than a
              rough "Estimated: 10-45 min" window).
              While AWAITING_CONFIRMATION without a schedule, copy gets the
              "Estimated:" prefix to make clear it's not a commitment yet. */}
          {!isComplete && !isCancelled && !isAwaitingPayment && etaLabel && !(order as any).desired_time && (
            <div className="mt-5 flex items-center justify-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" aria-hidden />
              <span className="text-[var(--color-muted)]">{etaLabel}</span>
            </div>
          )}

          {/* Cancellation reason — small red note when the restaurant declined */}
          {isCancelled && declineReason && (
            <div className="mt-5 inline-block px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-600 dark:text-red-400">
              {t('tracking.cancelled_note', 'Cancelled: {{reason}}', { reason: declineReason })}
            </div>
          )}
        </section>

        {/* Status timeline — hidden while we're still waiting for the restaurant
            to accept; the hero copy carries the message until then. */}
        {!isCancelled && !isAwaitingPayment && !isAwaitingConfirmation && (
          <section className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6 sm:p-7">
            <h2 className="font-bold text-base text-[var(--color-text)] mb-5">
              {t('tracking.progress', 'Progress')}
            </h2>
            <ol className="grid grid-cols-4 gap-2 sm:gap-4">
              {steps.map((step, i) => {
                const isLast = i === steps.length - 1;
                return (
                  <li key={step.key} className="relative flex flex-col items-center text-center">
                    {/* Connecting line to next step */}
                    {!isLast && (
                      <span
                        aria-hidden
                        className={`absolute top-4 left-[60%] right-[-40%] h-0.5 ${
                          step.passed && steps[i + 1].passed
                            ? 'bg-[var(--color-accent)]'
                            : step.passed && steps[i + 1].current
                              ? 'bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-border)]'
                              : 'bg-[var(--color-border)]'
                        }`}
                      />
                    )}
                    {/* Dot */}
                    <span
                      className={`relative z-[1] w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        step.current
                          ? 'bg-[var(--color-accent)] text-white ring-4 ring-[var(--color-accent)]/20 scale-110'
                          : step.passed
                            ? 'bg-[var(--color-accent)] text-white'
                            : 'bg-[var(--color-surface-2)] text-[var(--color-muted)] border-2 border-[var(--color-border)]'
                      }`}
                      aria-hidden
                    >
                      {step.passed && !step.current ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className={`text-[11px] sm:text-xs font-semibold mt-2 leading-tight ${
                      step.current ? 'text-[var(--color-text)]' : 'text-[var(--color-muted)]'
                    }`}>
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Order details */}
        <section className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-[var(--color-border)] flex items-baseline justify-between">
            <h2 className="font-bold text-base text-[var(--color-text)]">
              {t('tracking.your_order', 'Your order')}
            </h2>
            <span className="text-xs uppercase tracking-wider font-bold text-[var(--color-accent)]">
              {isDelivery ? t('common.delivery', 'Delivery') : t('common.pickup', 'Pickup')}
            </span>
          </div>
          <div className="p-5 sm:p-6 space-y-3">
            {order.items?.map((item: any, i: number) => (
              <div key={i} className="flex justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm capitalize">
                    <span className="font-bold text-[var(--color-accent)] mr-1.5">{item.quantity}×</span>
                    <span className="text-[var(--color-text)]">{item.name}</span>
                  </p>
                  {item.options?.length > 0 && (
                    <ul className="mt-0.5 ml-5 space-y-0.5">
                      {item.options.map((opt: any, j: number) => (
                        <li key={j} className="text-xs text-[var(--color-muted)] capitalize">+ {opt.name}</li>
                      ))}
                    </ul>
                  )}
                  {item.note && (
                    <p className="text-xs text-[var(--color-muted)] italic ml-5 mt-0.5">"{item.note}"</p>
                  )}
                </div>
                <span className="text-sm font-semibold text-[var(--color-text)] whitespace-nowrap">
                  {EURO}{(item.total / 100).toFixed(2)}
                </span>
              </div>
            ))}
            {order.note && (
              <div className="border-t border-[var(--color-border)] pt-3 mt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1">
                  {t('restaurants.note', 'Note')}
                </p>
                <p className="text-sm text-[var(--color-text)] italic">"{order.note}"</p>
              </div>
            )}
          </div>
          <div className="p-5 sm:p-6 bg-[var(--color-surface-2)] border-t border-[var(--color-border)] space-y-1.5">
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-muted)]">{t('restaurants.cart.delivery_fee', 'Delivery fee')}</span>
                <span className="font-semibold text-[var(--color-text)]">{EURO}{(order.delivery_fee / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-lg text-[var(--color-text)] pt-1">
              <span>{t('restaurants.cart.total', 'Total')}</span>
              <span>{EURO}{(order.total / 100).toFixed(2)}</span>
            </div>
          </div>
        </section>

        <div className="grid sm:grid-cols-2 gap-5">
          {/* Customer info */}
          {order.client_info && (
            <section className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-5 sm:p-6">
              <h2 className="font-bold text-base text-[var(--color-text)] mb-3">
                {t('tracking.customer', 'Customer')}
              </h2>
              <dl className="space-y-2.5 text-sm">
                <Row k={t('common.your_name', 'Name')} v={order.client_info.name} capitalize />
                {order.client_info.phone_number && (
                  <Row
                    k={t('checkout.phone', 'Phone')}
                    v={
                      <a href={`tel:${order.client_info.phone_number}`} className="text-[var(--color-accent)] hover:underline">
                        {order.client_info.phone_number}
                      </a>
                    }
                  />
                )}
                {order.email && (
                  <Row
                    k={t('checkout.email', 'Email')}
                    v={
                      <a href={`mailto:${order.email}`} className="text-[var(--color-accent)] hover:underline truncate inline-block max-w-full align-middle">
                        {order.email}
                      </a>
                    }
                  />
                )}
              </dl>
            </section>
          )}

          {/* Address — delivery destination OR pickup location */}
          <section className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-5 sm:p-6">
            <h2 className="font-bold text-base text-[var(--color-text)] mb-3">
              📍 {isDelivery ? t('tracking.delivery_to', 'Delivery to') : t('tracking.pickup_at', 'Pickup at')}
            </h2>
            {isDelivery && order.location ? (
              <div className="text-sm space-y-1">
                <p className="text-[var(--color-text)] capitalize">
                  {order.location.street_name} {order.location.street_number}
                </p>
                <p className="text-[var(--color-muted)] capitalize">
                  {order.location.postal_code} {order.location.city}
                </p>
              </div>
            ) : company?.location ? (
              <div className="text-sm space-y-1">
                <p className="text-[var(--color-text)] capitalize">
                  {company.location.street_name} {company.location.street_number}
                </p>
                <p className="text-[var(--color-muted)] capitalize">
                  {company.location.postal_code} {company.location.city}
                </p>
                {company?.phone && (
                  <p className="mt-2 pt-2 border-t border-[var(--color-border)]">
                    <a href={`tel:${company.phone}`} className="text-[var(--color-accent)] hover:underline text-sm font-semibold">
                      📞 {company.phone}
                    </a>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted)]">—</p>
            )}
          </section>
        </div>

        {/* Live update indicator */}
        {!isComplete && !isCancelled && (
          <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-muted)] pt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
            <span>{t('tracking.live', 'Live updates · refreshing every 10s')}</span>
          </div>
        )}

        {/* Bottom CTAs — most useful when the order is finished, but always available
            so a shared link doesn't feel like a dead-end. */}
        <section className="pt-2">
          {isComplete ? (
            <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-5 sm:p-6 text-center">
              <p className="text-base font-bold text-[var(--color-text)]">
                {t('tracking.cta_complete_title', 'Hungry again?')}
              </p>
              <p className="text-sm text-[var(--color-muted)] mt-1">
                {t('tracking.cta_complete_sub', 'Place a new order at {{name}}.', { name: company?.name || '' })}
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-center">
                <button
                  type="button"
                  onClick={goToMenu}
                  className="h-12 px-6 rounded-xl font-bold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-colors"
                >
                  {t('tracking.order_again', 'Order again')}
                </button>
                {websiteUrl && (
                  <button
                    type="button"
                    onClick={goToWebsite}
                    className="h-12 px-6 rounded-xl font-bold text-[var(--color-text)] bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/50 transition-colors"
                  >
                    {t('common.back_to_website', 'Back to website')}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
              <button
                type="button"
                onClick={goToMenu}
                className="text-[var(--color-accent)] hover:underline font-semibold inline-flex items-center gap-1"
              >
                <span aria-hidden>←</span>
                <span>{t('tracking.back_to_menu', 'Back to menu')}</span>
              </button>
              {websiteUrl && (
                <>
                  <span className="hidden sm:inline text-[var(--color-muted)]" aria-hidden>·</span>
                  <button
                    type="button"
                    onClick={goToWebsite}
                    className="text-[var(--color-muted)] hover:text-[var(--color-text)] inline-flex items-center gap-1"
                  >
                    <span>{t('common.back_to_website', 'Back to website')}</span>
                    {websiteHostname && <span className="opacity-60">· {websiteHostname}</span>}
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      </main>

      <StoreFooter />
    </div>
  );
}

// "Today HH:MM" or "DD Mon HH:MM" representation of desired_time. The Django
// REST framework serialises DateTime as a unix-seconds string (DATETIME_FORMAT
// = '%s'), so a numeric value needs unix→Date conversion; ISO strings still
// go through new Date() directly for forward compat if the server config flips.
function formatScheduledTime(value: string | number, t: (k: string, def: string) => string): string {
  let d: Date;
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    d = new Date(Number(value) * 1000);
  } else {
    d = new Date(value);
  }
  if (Number.isNaN(d.getTime())) return String(value);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  try {
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    if (sameDay) return `${t('preorder.today', 'Today')} ${time}`;
    const day = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
    return `${day} ${time}`;
  } catch {
    return String(value);
  }
}

function Row({ k, v, capitalize }: { k: string; v: React.ReactNode; capitalize?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-3">
      <dt className="text-[var(--color-muted)] shrink-0">{k}</dt>
      <dd className={`font-semibold text-[var(--color-text)] text-right min-w-0 truncate ${capitalize ? 'capitalize' : ''}`}>{v}</dd>
    </div>
  );
}

export default function OrderTrackingPage() {
  const { storeId } = useParams<{ storeId: string }>();
  if (!storeId) return null;

  return (
    <StoreConfigProvider storeId={storeId}>
      <TrackingContent />
    </StoreConfigProvider>
  );
}
