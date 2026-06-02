import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StoreConfigProvider, useStoreConfig } from '@/context/StoreConfigContext';
import { COMPANY_ORDER, COMPANY_KIOSK, COMPANY_TABLE, COMPANY_MENU_ONLY } from '@/config/paths';
import { EURO } from '@/config/constants';
import { getBranding } from '@/lib/branding';
import { isChannelPaused } from '@/lib/pause';
import StoreFooter from '@/components/shared/StoreFooter';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function LandingContent() {
  const { storeId } = useParams<{ storeId: string }>();
  const { company, loading } = useStoreConfig();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#fafafa]">
        <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#fafafa]">
        <div className="text-center px-6">
          <h1 className="text-lg font-semibold text-gray-800">Restaurant not found</h1>
          <p className="text-gray-500 text-sm mt-2">This page may no longer be available.</p>
        </div>
      </div>
    );
  }

  const branding = getBranding(company);
  const bannerImage = branding.banner_image;
  const logo = branding.logo;
  const supportsDelivery = company.supports_delivery;
  const supportsPickup = company.supports_pickup;
  const supportsKiosk = company.supports_kiosk;
  const hours = company.hours || [];
  const ds = company.delivery_settings;
  const ps = company.pickup_settings;
  const isOpen = company.is_open;

  // SEO — assembled once per render from branding + store fields so each
  // restaurant's QR-code landing page shows its own title and meta when
  // shared in WhatsApp / Facebook / Twitter. Pure dynamic <title>/<meta>
  // elements; React 19 hoists them into <head> automatically (no
  // react-helmet needed). Note: this is client-rendered, so the static
  // <title> in index.html is what Googlebot sees on first crawl until JS
  // executes — fine for modern bots but worth keeping in mind if we ever
  // add SSR / prerendering.
  const storeName = company.name || storeId || 'Restaurant';
  const cityPart = company.location?.city ? ` in ${company.location.city}` : '';
  const seoTitle = `${storeName} — Bestel online${cityPart}`;
  const seoDescription =
    (branding.welcome_message?.trim()) ||
    `Bekijk het menu van ${storeName}${cityPart} en bestel direct. ` +
    [supportsDelivery && 'levering', supportsPickup && 'afhaal', 'dine-in']
      .filter(Boolean)
      .join(', ') + '.';
  // OG image priority: banner > logo > none. Banners are wider and read
  // better in WhatsApp / Twitter cards; logos work fine as a fallback.
  const seoImage = bannerImage || logo || undefined;
  // Theme color drives the browser chrome (Chrome address bar on Android,
  // PWA tab strip). Falls back to the storefront primary so each store
  // chrome matches its brand. Skip if the store hasn't set a primary.
  const seoThemeColor = branding.primary_color || undefined;

  const hoursByDay: Record<number, { start: number; end: number }[]> = {};
  hours.forEach((h: any) => {
    if (!hoursByDay[h.day_of_week]) hoursByDay[h.day_of_week] = [];
    hoursByDay[h.day_of_week].push({ start: h.start_time, end: h.end_time });
  });

  return (
    <div className="min-h-dvh bg-[#fafafa]">
      {/* SEO — React 19 hoists these into <head>. */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      {seoThemeColor && <meta name="theme-color" content={seoThemeColor} />}
      {logo && <link rel="icon" type="image/png" href={logo} />}
      {/* Open Graph — WhatsApp / Facebook / LinkedIn previews. */}
      <meta property="og:type" content="restaurant.restaurant" />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:site_name" content={storeName} />
      {seoImage && <meta property="og:image" content={seoImage} />}
      {/* Twitter / X — summary_large_image renders the banner big. */}
      <meta name="twitter:card" content={seoImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      {seoImage && <meta name="twitter:image" content={seoImage} />}

      {/* Hero */}
      <div className="relative h-56 sm:h-64 bg-gradient-to-b from-black/80 to-black/40 overflow-hidden">
        {bannerImage ? (
          <img src={bannerImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[var(--color-header)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        <div className="relative h-full flex flex-col items-center justify-end pb-6 px-4">
          {logo && (
            <img
              src={logo}
              alt={company.name}
              className="w-18 h-18 rounded-2xl object-cover shadow-2xl border-[3px] border-white/90 mb-3"
              style={{ width: 72, height: 72 }}
            />
          )}
          <h1 className="text-white text-2xl font-bold tracking-tight text-center">{company.name}</h1>
          {company.slogan && (
            <p className="text-white/70 text-sm mt-0.5">{company.slogan}</p>
          )}
          <div className="mt-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
              isOpen ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30' : 'bg-red-500/20 text-red-200 border border-red-400/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              {isOpen ? 'Open' : 'Closed'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 -mt-3 relative z-10 pb-10">

        {/* Order options */}
        <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] overflow-hidden mb-3">
          <div className="p-5">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-gray-400 mb-4">Order</h2>
            <div className="space-y-2.5">
              {/* All options use `replace: true` so the back button on an
                  inner page never lands back on this picker. Once a mode is
                  chosen, the only way back is the store's own website (if
                  configured) or typing /company/:storeId/ directly. */}
              {supportsDelivery && (
                <OrderOption
                  onClick={() => navigate(COMPANY_ORDER(storeId!) + '?type=delivery', { replace: true })}
                  icon="🚴‍♂️"
                  title="Delivery"
                  subtitle={`${ds?.duration_min || 20}–${ds?.duration_max || 45} min${ds?.default_delivery_fee > 0 ? ` · ${EURO}${(ds.default_delivery_fee / 100).toFixed(2)}` : ''}`}
                  disabled={isChannelPaused(ds)}
                  disabledReason={
                    isChannelPaused(ds)
                      ? formatDisabledReason(t, ds?.pause_reason)
                      : undefined
                  }
                />
              )}
              {supportsPickup && (
                <OrderOption
                  onClick={() => navigate(COMPANY_ORDER(storeId!) + '?type=pickup', { replace: true })}
                  icon="🛍️"
                  title="Takeaway"
                  subtitle={`±${ps?.duration || 20} min · Free`}
                  disabled={isChannelPaused(ps)}
                  disabledReason={
                    isChannelPaused(ps)
                      ? formatDisabledReason(t, ps?.pause_reason)
                      : undefined
                  }
                />
              )}
              {supportsKiosk && (
                <OrderOption
                  onClick={() => navigate(COMPANY_KIOSK(storeId!), { replace: true })}
                  icon="🖥️"
                  title="Kiosk"
                  subtitle="Self-service"
                />
              )}
              <OrderOption
                onClick={() => navigate(COMPANY_TABLE(storeId!), { replace: true })}
                icon="🍽️"
                title="Dine in"
                subtitle="Order at your table"
              />
              <OrderOption
                onClick={() => navigate(COMPANY_MENU_ONLY(storeId!), { replace: true })}
                icon="📖"
                title="View menu"
                subtitle="Browse without ordering"
              />
            </div>
          </div>
        </div>

        {/* Hours */}
        {hours.length > 0 && (
          <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] overflow-hidden mb-3">
            <div className="p-5">
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-gray-400 mb-4">Hours</h2>
              <div className="grid grid-cols-7 gap-1 text-center">
                {DAYS.map((day, i) => {
                  const dayHours = hoursByDay[i + 1];
                  const today = new Date().getDay();
                  const isToday = (today === 0 ? 7 : today) === i + 1;
                  const isClosed = !dayHours || dayHours.length === 0;
                  return (
                    <div
                      key={day}
                      className={`py-2 px-1 rounded-lg ${isToday ? 'bg-[var(--color-primary)]/8 ring-1 ring-[var(--color-primary)]/20' : ''}`}
                    >
                      <span className={`text-[11px] font-semibold block ${isToday ? 'text-[var(--color-primary)]' : 'text-gray-400'}`}>
                        {day}
                      </span>
                      {isClosed ? (
                        <span className="text-[10px] text-gray-300 block mt-1">—</span>
                      ) : (
                        dayHours.map((h, j) => (
                          <span key={j} className="text-[10px] text-gray-600 block mt-1 leading-tight">
                            {formatTime(h.start)}<br/>{formatTime(h.end)}
                          </span>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Location */}
        {company.location && (
          <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="p-5">
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Location</h2>
              <p className="text-sm text-gray-700">
                {company.location.street_name} {company.location.street_number}
              </p>
              {company.location.city && (
                <p className="text-sm text-gray-500">
                  {company.location.postal_code} {company.location.city}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Powered by */}
        <p className="text-center text-[11px] text-gray-300 mt-6">
          Powered by <span className="font-medium">MenuWela</span>
        </p>
      </div>

      <StoreFooter />
    </div>
  );
}

function OrderOption({ onClick, icon, title, subtitle, disabled, disabledReason }: {
  onClick: () => void;
  icon: string;
  title: string;
  subtitle: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl border text-left group transition-all ${
        disabled
          ? 'border-gray-100 bg-gray-50/60 cursor-not-allowed opacity-60'
          : 'border-gray-100 hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/[0.02] active:scale-[0.98]'
      }`}
    >
      <span className={`text-xl w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
        disabled ? 'bg-gray-100 grayscale' : 'bg-gray-50 group-hover:bg-[var(--color-primary)]/5'
      }`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-[15px] text-gray-800 block">{title}</span>
        {disabled && disabledReason ? (
          <span className="text-[12px] text-orange-600 block leading-tight mt-0.5">{disabledReason}</span>
        ) : (
          <span className="text-[13px] text-gray-400">{subtitle}</span>
        )}
      </div>
      {!disabled && (
        <svg className="w-4 h-4 text-gray-300 group-hover:text-[var(--color-primary)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}

// "Tijdelijk niet beschikbaar — {reason}" with graceful fallback when the
// operator didn't enter a reason. Kept inline to LandingPage since this is
// the only place that needs the exact compact phrasing.
function formatDisabledReason(
  t: (key: string, defaultValue: string) => string,
  reason?: string | null,
): string {
  const base = t('pause.unavailable_short', 'Tijdelijk niet beschikbaar');
  const trimmed = (reason || '').trim();
  return trimmed ? `${base} — ${trimmed}` : base;
}

export default function LandingPage() {
  const { storeId } = useParams<{ storeId: string }>();
  if (!storeId) return null;
  return (
    <StoreConfigProvider storeId={storeId}>
      <LandingContent />
    </StoreConfigProvider>
  );
}
