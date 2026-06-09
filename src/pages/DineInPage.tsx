import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getCompanyMenu } from '@/actions/store';
import { useMenuRefresh } from '@/hooks/useMenuRefresh';
import { useIsTabletMode } from '@/hooks/useIsTabletMode';
import { useModalBackClose } from '@/hooks/useModalBackClose';
import { CartProvider, useCart } from '@/context/CartContext';
import { StoreConfigProvider, useStoreConfig } from '@/context/StoreConfigContext';
import { DINE_IN } from '@/config/constants';
import { getBranding } from '@/lib/branding';
import MenuView from '@/components/menu/MenuView';
import LanguageSelector from '@/components/shared/LanguageSelector';
import OrderResultModal from '@/components/shared/OrderResultModal';

function DineInContent() {
  const { storeId, table } = useParams<{ storeId: string; table: string }>();
  const navigate = useNavigate();
  const { company, loading: configLoading } = useStoreConfig();
  const { t, i18n } = useTranslation();
  const { submitOrder, resetCart } = useCart();
  const [result, setResult] = useState<'success' | 'error' | 'closed' | null>(null);

  // Tablets get push-driven refresh via Pusher (see useMenuRefresh).
  // Customer QR phones get a single fetch — they leave the page within
  // minutes, no realtime needed.
  useMenuRefresh(storeId);

  // Swallow Android hardware back on tablets — the only sanctioned exit
  // from a seated table is the 5-finger tap gesture wired below.
  // Without this, history.back() takes the guest back to TablePage and
  // lets them re-pick a table mid-order. Modal handlers push later, so
  // option/result modals still close on back via the LIFO stack in
  // useModalBackClose.
  const isTablet = useIsTabletMode();
  useModalBackClose(isTablet, () => {});

  // Browser-level fallback: park a sentinel history entry with the same
  // URL on top of the current one and re-push it whenever popstate fires.
  // The URL never changes, so react-router treats popstate as a no-op
  // (no remount, no modal flash). Catches Chrome-on-tablet and the QR
  // phone case, which the tablet:back event channel above doesn't cover.
  useEffect(() => {
    if (!storeId || !table) return;
    const url = window.location.href;
    window.history.pushState({ dineInTrap: true }, '', url);
    const onPop = () => {
      window.history.pushState({ dineInTrap: true }, '', url);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [storeId, table]);

  // 5-finger tap → bounce back to /table (the slug-picker / table-number
  // entry). Replaces the older long-press-corner gesture which staff
  // kept missing on the floor. Only armed in tablet mode so a customer
  // on their phone can't accidentally jump back.
  //
  // Single-tap kept firing accidentally — a customer setting the tablet
  // down, a hand resting across the screen — and dumped the current
  // session straight back to the slug picker. The 5-finger touch must
  // repeat TWICE within a 5-second window before the reset fires.
  //
  // What counts as one "tap" is intentionally strict, because operators
  // reported the menu getting stuck after a half-started gesture (5
  // fingers down, never lifted) — Android sometimes keeps phantom
  // touches around, so every subsequent single-finger press registered
  // as length≥5 and completed the streak. Now a tap requires BOTH:
  //   1. touchstart at peak ≥5 fingers
  //   2. touchend with the touches list back to empty within 1.5s
  // Incomplete gestures (palm leaning, dragging across the screen
  // without lifting) never reach step 2, so they can't poison the
  // streak. touchcancel resets too — covers the "Android killed the
  // gesture" case the same way.
  useEffect(() => {
    if (!isTablet || !storeId) return;
    let tapCount = 0;
    let firstTapAt = 0;
    // Per-gesture state (resets every time fingers fully lift)
    let maxTouchesInGesture = 0;
    let gestureStartedAt = 0;
    const WINDOW_MS = 5000;
    const REQUIRED_TAPS = 2;
    const TAP_MAX_DURATION_MS = 1500;

    const resetGesture = () => {
      maxTouchesInGesture = 0;
      gestureStartedAt = 0;
    };

    const onTouchStart = (e: TouchEvent) => {
      const len = e.touches?.length ?? 0;
      if (len > maxTouchesInGesture) {
        maxTouchesInGesture = len;
        if (gestureStartedAt === 0) gestureStartedAt = Date.now();
      }
      // Still suppress propagation for ≥5-finger touchstart so a swipe
      // doesn't open product cards underneath while the operator is
      // mid-reset gesture.
      if (len >= 5) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      // Only score the gesture when EVERY finger has been lifted.
      // A partial lift (5 → 3 → 5 again) keeps the gesture open and
      // can't complete a tap on its own.
      if ((e.touches?.length ?? 0) > 0) return;

      const wasFiveFingerTap =
        maxTouchesInGesture >= 5 &&
        gestureStartedAt > 0 &&
        Date.now() - gestureStartedAt <= TAP_MAX_DURATION_MS;
      resetGesture();
      if (!wasFiveFingerTap) return;

      const now = Date.now();
      if (now - firstTapAt > WINDOW_MS) {
        tapCount = 1;
        firstTapAt = now;
      } else {
        tapCount += 1;
      }
      if (tapCount >= REQUIRED_TAPS) {
        tapCount = 0;
        firstTapAt = 0;
        try {
          resetCart();
          localStorage.removeItem(`cart-${storeId}`);
        } catch {/* noop */}
        navigate(`/company/${storeId}/table`);
      }
    };

    const onTouchCancel = () => {
      // Android often fires touchcancel instead of touchend when the
      // OS reclaims the gesture (system notification, accidental swipe
      // off the screen edge). Treat it as a discarded gesture so a
      // half-completed 5-finger touch doesn't carry into the next.
      resetGesture();
    };

    window.addEventListener('touchstart', onTouchStart, { passive: false, capture: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
    window.addEventListener('touchcancel', onTouchCancel, { passive: true, capture: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart, { capture: true } as any);
      window.removeEventListener('touchend', onTouchEnd, { capture: true } as any);
      window.removeEventListener('touchcancel', onTouchCancel, { capture: true } as any);
    };
  }, [isTablet, storeId, navigate, resetCart]);
  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ['menu', storeId, table, i18n.language],
    queryFn: () => getCompanyMenu(storeId!, table!),
    enabled: !!storeId && !!table,
  });

  const handleConfirm = async () => {
    try {
      await submitOrder();
      setResult('success');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const isClosed = Array.isArray(detail)
        ? detail.some((d: string) => d.toLowerCase().includes('closed'))
        : typeof detail === 'string' && detail.toLowerCase().includes('closed');
      setResult(isClosed ? 'closed' : 'error');
    }
  };

  const handleResultClose = () => {
    if (result === 'success') resetCart();
    setResult(null);
  };

  if (configLoading) {
    return <div className="flex items-center justify-center h-screen bg-[#fafafa]">
      <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  const logo = getBranding(company).logo;

  return (
    <div className="min-h-dvh bg-[#fafafa]">
      <header className="sticky top-0 z-50 bg-[var(--color-header)] text-[var(--color-header-text)] px-3 sm:px-4 h-20 grid grid-cols-3 items-center shadow-sm">
        {/* Left: table number */}
        <div className="justify-self-start">
          <span className="inline-flex items-center bg-white/10 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap">
            {t('common.table', 'Table {{number}}', { number: table })}
          </span>
        </div>
        {/* Middle: logo only — branding speaks for itself.
            Logos can be square or wide word-marks; lock the height so the
            header stays compact and let the width follow the natural aspect
            ratio. object-contain prevents cropping. */}
        <div className="justify-self-center min-w-0">
          {logo ? (
            <img
              src={logo}
              alt={company?.name}
              className="max-h-10 w-auto max-w-[40vw] object-contain"
            />
          ) : (
            <span className="font-bold text-lg capitalize">{company?.name}</span>
          )}
        </div>
        {/* Right: language */}
        <div className="justify-self-end">
          <LanguageSelector languages={company?.languages || []} defaultLang={company?.default_lang} variant="dark" />
        </div>
      </header>
      <MenuView menu={menu} menuLoading={menuLoading} onOrderConfirm={handleConfirm} />
      <OrderResultModal result={result} onClose={handleResultClose} />
    </div>
  );
}

export default function DineInPage() {
  const { storeId, table } = useParams<{ storeId: string; table: string }>();
  if (!storeId || !table) return null;
  return (
    <StoreConfigProvider storeId={storeId}>
      <CartProvider storeId={storeId} table={table} orderType={DINE_IN}>
        <DineInContent />
      </CartProvider>
    </StoreConfigProvider>
  );
}
