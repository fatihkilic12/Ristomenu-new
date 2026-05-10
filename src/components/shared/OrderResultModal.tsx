import { useTranslation } from 'react-i18next';

type Props = {
  result: 'success' | 'error' | 'closed' | null;
  onClose: () => void;
};

export default function OrderResultModal({ result, onClose }: Props) {
  const { t } = useTranslation();
  if (!result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/50" />
      <div className="relative z-10 bg-white rounded-2xl w-full max-w-xs p-6 text-center">
        {result === 'success' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-3xl">✓</span>
            </div>
            <h2 className="text-lg font-bold mb-1">{t('restaurants.placed.title', 'Order placed')}</h2>
            <p className="text-sm text-gray-500 mb-6">{t('restaurants.placed.description', 'Your order has been successfully placed')}</p>
            <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors">
              {t('restaurants.cart.ok', 'OK')}
            </button>
          </>
        ) : result === 'closed' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔒</span>
            </div>
            <h2 className="text-lg font-bold mb-1">{t('restaurants.currently_closed', 'Currently closed')}</h2>
            <p className="text-sm text-gray-500 mb-6">{t('restaurants.cart.closed_for_order', 'The restaurant is currently closed for online orders')}</p>
            <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-colors">
              {t('restaurants.cart.ok', 'OK')}
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✋</span>
            </div>
            <h2 className="text-lg font-bold mb-1">{t('restaurants.waiter.title', 'Call a waiter')}</h2>
            <p className="text-sm text-gray-500 mb-6">{t('restaurants.waiter.description', 'Something went wrong. Please call a waiter.')}</p>
            <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-colors">
              {t('restaurants.cart.ok', 'OK')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
