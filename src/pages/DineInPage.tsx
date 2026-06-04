import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getCompanyMenu } from '@/actions/store';
import { useMenuRefresh } from '@/hooks/useMenuRefresh';
import { useIsTabletMode } from '@/hooks/useIsTabletMode';
import { useModalBackClose } from '@/hooks/useModalBackClose';
import { CartProvider, useCart } from '@/context/CartContext';
import { StoreConfigProvider, useStoreConfig } from '@/context/StoreConfigContext';
import { DINE_IN } from '@/config/constants';
import { collectMenuImageUrls, precacheImages } from '@/lib/imageCache';
import { getBranding } from '@/lib/branding';
import MenuView from '@/components/menu/MenuView';
import LanguageSelector from '@/components/shared/LanguageSelector';
import OrderResultModal from '@/components/shared/OrderResultModal';

function DineInContent() {
  const { storeId, table } = useParams<{ storeId: string; table: string }>();
  const { company, loading: configLoading } = useStoreConfig();
  const { t, i18n } = useTranslation();
  const { submitOrder, resetCart } = useCart();
  const [result, setResult] = useState<'success' | 'error' | 'closed' | null>(null);

  // Tablets get push-driven refresh via Pusher (see useMenuRefresh).
  // Customer QR phones get a single fetch — they leave the page within
  // minutes, no realtime needed.
  useMenuRefresh(storeId);

  // Swallow Android hardware back on tablets — the only sanctioned exit
  // from a seated table is the operator's 5-second long-press gesture in
  // the TabletMenuApp shell. Without this, history.back() takes the
  // guest back to TablePage and lets them re-pick a table mid-order.
  // Modal handlers push later, so option/result modals still close on
  // back via the LIFO stack in useModalBackClose.
  const isTablet = useIsTabletMode();
  useModalBackClose(isTablet, () => {});
  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ['menu', storeId, table, i18n.language],
    queryFn: () => getCompanyMenu(storeId!, table!),
    enabled: !!storeId && !!table,
  });

  // Pre-cache product images as soon as the menu lands so the table can keep
  // browsing if the restaurant's Wi-Fi blips out.
  useEffect(() => {
    if (menu) precacheImages(collectMenuImageUrls(menu));
  }, [menu]);

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
