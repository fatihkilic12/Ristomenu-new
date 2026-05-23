import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getCompanyMenu } from '@/actions/store';
import { CartProvider, useCart } from '@/context/CartContext';
import { StoreConfigProvider, useStoreConfig } from '@/context/StoreConfigContext';
import { DINE_IN } from '@/config/constants';
import { collectMenuImageUrls, precacheImages } from '@/lib/imageCache';
import MenuView from '@/components/menu/MenuView';
import LanguageSelector from '@/components/shared/LanguageSelector';
import OrderResultModal from '@/components/shared/OrderResultModal';

function DineInContent() {
  const { storeId, table } = useParams<{ storeId: string; table: string }>();
  const { company, loading: configLoading } = useStoreConfig();
  const { t, i18n } = useTranslation();
  const { submitOrder, resetCart } = useCart();
  const [result, setResult] = useState<'success' | 'error' | 'closed' | null>(null);

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

  return (
    <div className="min-h-dvh bg-[#fafafa]">
      <header className="sticky top-0 z-50 bg-[var(--color-header)] text-[var(--color-header-text)] px-3 sm:px-4 h-20 grid grid-cols-3 items-center shadow-sm">
        {/* Left: table number */}
        <div className="justify-self-start">
          <span className="inline-flex items-center bg-white/10 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap">
            {t('common.table', 'Table {{number}}', { number: table })}
          </span>
        </div>
        {/* Middle: logo only — branding speaks for itself */}
        <div className="justify-self-center">
          {company?.img ? (
            <img
              src={company.img}
              alt={company.name}
              className="w-12 h-12 rounded-xl object-cover ring-white/15"
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
