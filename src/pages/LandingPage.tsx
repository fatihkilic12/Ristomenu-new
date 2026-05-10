import { useParams, useNavigate } from 'react-router-dom';
import { StoreConfigProvider, useStoreConfig } from '@/context/StoreConfigContext';
import { COMPANY_ORDER, COMPANY_KIOSK, COMPANY_TABLE, COMPANY_MENU_ONLY } from '@/config/paths';
import { EURO } from '@/config/constants';

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

  const supportsDelivery = company.supports_delivery;
  const supportsPickup = company.supports_pickup;
  const supportsKiosk = company.supports_kiosk;
  const hours = company.hours || [];
  const ds = company.delivery_settings;
  const ps = company.pickup_settings;
  const isOpen = company.is_open;

  const hoursByDay: Record<number, { start: number; end: number }[]> = {};
  hours.forEach((h: any) => {
    if (!hoursByDay[h.day_of_week]) hoursByDay[h.day_of_week] = [];
    hoursByDay[h.day_of_week].push({ start: h.start_time, end: h.end_time });
  });

  return (
    <div className="min-h-dvh bg-[#fafafa]">
      {/* Hero */}
      <div className="relative h-56 sm:h-64 bg-gradient-to-b from-black/80 to-black/40 overflow-hidden">
        {company.header_img ? (
          <img src={company.header_img} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[var(--color-header)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        <div className="relative h-full flex flex-col items-center justify-end pb-6 px-4">
          {company.img && (
            <img
              src={company.img}
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
              {supportsDelivery && (
                <OrderOption
                  onClick={() => navigate(COMPANY_ORDER(storeId!) + '?type=delivery')}
                  icon="🚴‍♂️"
                  title="Delivery"
                  subtitle={`${ds?.duration_min || 20}–${ds?.duration_max || 45} min${ds?.default_delivery_fee > 0 ? ` · ${EURO}${(ds.default_delivery_fee / 100).toFixed(2)}` : ''}`}
                />
              )}
              {supportsPickup && (
                <OrderOption
                  onClick={() => navigate(COMPANY_ORDER(storeId!) + '?type=pickup')}
                  icon="🛍️"
                  title="Takeaway"
                  subtitle={`±${ps?.duration || 20} min · Free`}
                />
              )}
              {supportsKiosk && (
                <OrderOption
                  onClick={() => navigate(COMPANY_KIOSK(storeId!))}
                  icon="🖥️"
                  title="Kiosk"
                  subtitle="Self-service"
                />
              )}
              <OrderOption
                onClick={() => navigate(COMPANY_TABLE(storeId!))}
                icon="🍽️"
                title="Dine in"
                subtitle="Order at your table"
              />
              <OrderOption
                onClick={() => navigate(COMPANY_MENU_ONLY(storeId!))}
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
          Powered by <span className="font-medium">RistoMenu</span>
        </p>
      </div>
    </div>
  );
}

function OrderOption({ onClick, icon, title, subtitle }: {
  onClick: () => void; icon: string; title: string; subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-gray-100 hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/[0.02] active:scale-[0.98] transition-all text-left group"
    >
      <span className="text-xl w-9 h-9 flex items-center justify-center bg-gray-50 rounded-lg group-hover:bg-[var(--color-primary)]/5 transition-colors">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-[15px] text-gray-800 block">{title}</span>
        <span className="text-[13px] text-gray-400">{subtitle}</span>
      </div>
      <svg className="w-4 h-4 text-gray-300 group-hover:text-[var(--color-primary)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
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
