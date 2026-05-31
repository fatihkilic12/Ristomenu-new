import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getDeliveryMenu } from '@/actions/store';
import { useMenuRefresh } from '@/hooks/useMenuRefresh';
import { CartProvider, useCart } from '@/context/CartContext';
// (we use useCart below to clear desired_time when the channel toggles)
import { StoreConfigProvider, useStoreConfig } from '@/context/StoreConfigContext';
import { DELIVERY, PICKUP, EURO } from '@/config/constants';
import { COMPANY_CHECKOUT } from '@/config/paths';
import { collectMenuImageUrls, precacheImages } from '@/lib/imageCache';
import { getBranding } from '@/lib/branding';
import LanguageSelector from '@/components/shared/LanguageSelector';
import StoreFooter from '@/components/shared/StoreFooter';
import PauseBanner from '@/components/shared/PauseBanner';
import OrderMenuView, { triggerOrderEditItem } from '@/components/order/OrderMenuView';
import OrderCartPanel from '@/components/order/OrderCartPanel';

function OrderContent() {
  const { storeId } = useParams<{ storeId: string }>();
  const { company, loading: configLoading } = useStoreConfig();
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const supportsDelivery = !!company?.supports_delivery;
  const supportsPickup = !!company?.supports_pickup;
  const bothActive = supportsDelivery && supportsPickup;

  const urlType = searchParams.get('type');
  const initialType = urlType === 'pickup'
    ? PICKUP
    : urlType === 'delivery'
      ? DELIVERY
      : (supportsDelivery ? DELIVERY : PICKUP);
  const [orderType, setOrderType] = useState(initialType);

  // When the customer switches channel, any previously-picked desired_time
  // becomes invalid (slot windows differ per channel) — clear it so they
  // re-pick. We pull setDesiredTime via useCart so we don't have to thread
  // a prop through OrderCartPanel.
  const { setDesiredTime } = useCart();
  const handleChangeType = (next: string) => {
    if (next !== orderType) setDesiredTime(null);
    setOrderType(next);
  };

  // Theme mode (dark/light) — opt-in dark mode via the toggle button.
  // Default is light; we deliberately do NOT read prefers-color-scheme so
  // the customer experience is predictable and the brand colours stay
  // recognisable until someone actively switches.
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

  // Sync URL ?type with current order type
  useEffect(() => {
    if (configLoading) return;
    const effective = supportsDelivery ? orderType : PICKUP;
    if (searchParams.get('type') !== effective) {
      setSearchParams({ type: effective }, { replace: true });
    }
  }, [orderType, supportsDelivery, configLoading, searchParams, setSearchParams]);

  const effectiveType = supportsDelivery ? orderType : PICKUP;

  useMenuRefresh(storeId);
  const { data: menu, isLoading } = useQuery({
    queryKey: ['delivery-menu', storeId, effectiveType, i18n.language],
    queryFn: () => getDeliveryMenu(storeId!, effectiveType),
    enabled: !!storeId && !configLoading,
  });

  // Warm the image cache for offline resilience.
  useEffect(() => {
    if (menu) precacheImages(collectMenuImageUrls(menu));
  }, [menu]);

  if (configLoading) {
    return (
      <div className="theme-order min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const ds = company?.delivery_settings;
  const ps = company?.pickup_settings;
  const isOpen = company?.is_open;

  const handleConfirm = () => {
    navigate(COMPANY_CHECKOUT(storeId!) + `?type=${effectiveType}`);
  };

  const branding = getBranding(company);
  const bannerImage = branding.banner_image;
  const hasBanner = !!bannerImage;

  // Restaurant's main website URL — provided by branding.website_url with
  // legacy fallbacks. When unset, the back-to-website button is hidden.
  const websiteUrl: string | undefined = branding.website_url || undefined;
  const websiteHostname = websiteUrl ? safeHostname(websiteUrl) : null;
  const goToWebsite = () => { if (websiteUrl) window.location.href = websiteUrl; };

  return (
    <div className="min-h-dvh">
      {/* Top bar — designed to feel like an extension of the restaurant's own website */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md border-b border-[var(--color-border)]"
        style={{ background: `${headerBg}f2`, color: headerText }}
      >
        <div className="max-w-7xl mx-auto h-16 px-4 flex items-center justify-between gap-3">
          {/* Brand: logo + name. Clickable only when the store configured a
              website URL — otherwise it's a static label (we don't want users
              navigating back to the LandingPage from here). */}
          {websiteUrl ? (
            <button
              type="button"
              onClick={goToWebsite}
              className={`flex items-center gap-3 -ml-1.5 px-1.5 py-1 rounded-lg min-w-0 ${
                themeMode === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'
              }`}
              aria-label={t('common.back_to_website', 'Back to website')}
            >
              <BrandContent company={company} />
            </button>
          ) : (
            <div className="flex items-center gap-3 -ml-1.5 px-1.5 py-1 min-w-0">
              <BrandContent company={company} />
            </div>
          )}

          {/* Right cluster: back-to-website (if set), theme toggle, language */}
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
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
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
              aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={themeMode === 'dark' ? t('common.light_mode', 'Light mode') : t('common.dark_mode', 'Dark mode')}
            >
              {themeMode === 'dark' ? '☀️' : '🌙'}
            </button>
            <LanguageSelector languages={company?.languages || []} defaultLang={company?.default_lang} variant={themeMode === 'dark' ? 'dark' : 'light'} />
          </div>
        </div>
        {/* Mobile back-to-website is reachable by tapping the brand-button on the
            left, which is already the standard pattern. No separate strip needed
            (it threw off the sticky offset of the category pill nav). */}
      </header>

      <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_360px]">
        {/* Main column */}
        <div className="min-w-0">
          {/* Hero — only when the store actually has a banner image. Logo lives
              in the header already, so no overlap, no fallback decoration. */}
          {hasBanner && (
            <div className="relative aspect-[16/9] sm:aspect-[5/2] max-h-[360px] overflow-hidden">
              <img src={bannerImage!} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)]/30 via-transparent to-transparent" />
            </div>
          )}

          {/* Pause banner — only renders when the currently selected channel
              is paused server-side. Trust `is_paused` from the API; don't
              re-run the clock-compare on the client. */}
          <div className="px-4 sm:px-6 pt-4">
            <PauseBanner
              orderType={effectiveType}
              deliverySettings={ds}
              pickupSettings={ps}
            />
          </div>

          {/* Restaurant info */}
          <div className={`px-4 sm:px-6 pb-2 ${hasBanner ? 'pt-6' : 'pt-6'}`}>
            {/* Prominent order-mode label — always visible so users know if they're
                ordering for delivery or pickup, even when the store only offers one. */}
            {/*<div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 mb-3">*/}
            {/*  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" aria-hidden />*/}
            {/*  <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text)]">*/}
            {/*    {effectiveType === DELIVERY*/}
            {/*      ? t('common.delivery', 'Delivery')*/}
            {/*      : t('common.pickup', 'Pickup')}*/}
            {/*  </span>*/}
            {/*  {effectiveType === DELIVERY && ds && (*/}
            {/*    <span className="text-xs font-medium text-[var(--color-muted)]">*/}
            {/*      · {ds.duration_min || 20}-{ds.duration_max || 45} min*/}
            {/*    </span>*/}
            {/*  )}*/}
            {/*  {effectiveType === PICKUP && ps && (*/}
            {/*    <span className="text-xs font-medium text-[var(--color-muted)]">*/}
            {/*      · ±{ps.duration || 20} min*/}
            {/*    </span>*/}
            {/*  )}*/}
            {/*</div>*/}

            <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text)] leading-tight capitalize">
              {company?.name}
            </h1>
            {company?.slogan && (
              <p className="text-base text-[var(--color-muted)] mt-1">{company.slogan}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-4 text-sm">
              <Badge
                color={isOpen ? 'green' : 'red'}
                icon={<span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />}
              >
                {isOpen ? t('common.open', 'Open') : t('restaurants.closed', 'Closed')}
              </Badge>
              {effectiveType === DELIVERY && ds && (
                <>
                  {ds.default_delivery_fee > 0 ? (
                    <Badge>🚴 {EURO}{(ds.default_delivery_fee / 100).toFixed(2)}</Badge>
                  ) : (
                    <Badge color="green">{t('restaurants.single.free-shipping', 'Free shipping')}</Badge>
                  )}
                  {ds.min_order_value > 0 && (
                    <Badge color="orange">Min. {EURO}{(ds.min_order_value / 100).toFixed(2)}</Badge>
                  )}
                </>
              )}
              {company?.location?.city && (
                <Badge>📍 {company.location.city}</Badge>
              )}
            </div>
          </div>

          {/* Menu */}
          <OrderMenuView menu={menu} menuLoading={isLoading} />
        </div>

        {/* Cart sidebar (desktop) */}
        <div className="hidden lg:block sticky top-14 self-start h-[calc(100dvh-3.5rem)] p-4">
          <OrderCartPanel
            menu={menu}
            storeConfig={company}
            effectiveType={effectiveType}
            bothActive={bothActive}
            onChangeType={handleChangeType}
            onEdit={triggerOrderEditItem}
            onConfirm={handleConfirm}
            storeSlug={storeId}
          />
        </div>
      </div>

      {/* Mobile cart bar */}
      <MobileCartBar
        effectiveType={effectiveType}
        bothActive={bothActive}
        onChangeType={handleChangeType}
        onConfirm={handleConfirm}
        ds={ds}
        ps={ps}
        storeConfig={company}
        menu={menu}
        storeSlug={storeId}
      />

      <StoreFooter />
    </div>
  );
}

function BrandContent({ company }: { company: any }) {
  const logo = getBranding(company).logo;
  return (
    <>
      {logo ? (
        <img
          src={logo}
          alt=""
          className="w-9 h-9 rounded-lg object-cover ring-1 ring-black/10"
        />
      ) : (
        <span className="w-9 h-9 rounded-lg bg-[var(--color-accent)]/20 flex items-center justify-center text-base font-extrabold capitalize" aria-hidden>
          {(company?.name?.trim().charAt(0) || '?').toUpperCase()}
        </span>
      )}
      <span className="font-extrabold text-base truncate capitalize">
        {company?.name || ''}
      </span>
    </>
  );
}

function safeHostname(url: string): string | null {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch { return null; }
}

function Badge({ children, color, icon }: { children: React.ReactNode; color?: 'green' | 'orange' | 'red'; icon?: React.ReactNode }) {
  const cls = color === 'green'
    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
    : color === 'orange'
      ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30'
      : color === 'red'
        ? 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30'
        : 'bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)]';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      {icon}
      {children}
    </span>
  );
}

/* ─── Mobile cart bar ─────────────────────────────────────── */
function MobileCartBar({ effectiveType, bothActive, onChangeType, onConfirm, ds, ps, storeConfig, menu, storeSlug }: {
  effectiveType: string; bothActive: boolean; onChangeType: (t: string) => void; onConfirm: () => void;
  ds: any; ps: any; storeConfig: any; menu: any; storeSlug?: string;
}) {
  const { cart, itemCount } = useCart();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const subtotal = cart.reduce((sum, item) => {
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
    return sum + price * item.quantity;
  }, 0);

  if (cart.length === 0) return null;

  return (
    <>
      {/* Drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex items-end" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-full max-h-[80dvh] z-10" onClick={e => e.stopPropagation()}>
            <OrderCartPanel
              menu={menu}
              storeConfig={storeConfig}
              effectiveType={effectiveType}
              bothActive={bothActive}
              onChangeType={onChangeType}
              onEdit={triggerOrderEditItem}
              onConfirm={() => { setOpen(false); onConfirm(); }}
              storeSlug={storeSlug}
            />
          </div>
        </div>
      )}

      {/* Bar */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-4 left-4 right-4 z-30 bg-[var(--color-accent)] text-white h-14 rounded-2xl px-5 flex items-center justify-between font-bold shadow-2xl"
      >
        <span className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm">
            {itemCount}
          </span>
          <span>{t('common.view_order', 'View order')}</span>
        </span>
        <span className="text-base">{EURO}{(subtotal / 100).toFixed(2)}</span>
        {/* Suppress unused warnings for mobile-only props */}
        <span className="hidden">{ds?.duration_min}{ps?.duration}</span>
      </button>
    </>
  );
}

export default function OrderPage() {
  const { storeId } = useParams<{ storeId: string }>();
  if (!storeId) return null;

  return (
    <StoreConfigProvider storeId={storeId}>
      <CartProvider storeId={storeId} orderType={DELIVERY}>
        <OrderContent />
      </CartProvider>
    </StoreConfigProvider>
  );
}
