import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  type: 'success' | 'error' | 'closed';
  onReset: () => void;
};

export default function KioskOrderConfirmation({ type, onReset }: Props) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (type !== 'success') return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onReset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [type, onReset]);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center">
      {type === 'success' ? (
        <>
          <div className="w-44 h-44 rounded-full bg-green-100 flex items-center justify-center mb-8">
            <span className="text-green-600 text-8xl">✓</span>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            {t('restaurants.placed.title', 'Order placed')}
          </h1>
          <p className="text-2xl text-gray-500 mb-10">
            {t('restaurants.placed.description', 'Your order has been successfully placed')}
          </p>
          <div className="text-xl text-gray-400">
            {countdown}s
          </div>
        </>
      ) : type === 'closed' ? (
        <>
          <div className="w-44 h-44 rounded-full bg-orange-100 flex items-center justify-center mb-8">
            <span className="text-orange-600 text-8xl">🔒</span>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            {t('restaurants.currently_closed', 'Currently closed')}
          </h1>
          <p className="text-2xl text-gray-500 mb-12">
            {t('restaurants.cart.closed_for_order', 'The restaurant is currently closed for online orders')}
          </p>
          <button
            type="button"
            onClick={onReset}
            className="px-14 py-6 rounded-2xl font-bold text-2xl text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            OK
          </button>
        </>
      ) : (
        <>
          <div className="w-44 h-44 rounded-full bg-red-100 flex items-center justify-center mb-8">
            <span className="text-red-600 text-8xl">!</span>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            {t('common.common_error', 'Something went wrong')}
          </h1>
          <p className="text-2xl text-gray-500 mb-12">
            {t('restaurants.waiter.description', 'Please ask a staff member for help.')}
          </p>
          <button
            type="button"
            onClick={onReset}
            className="px-14 py-6 rounded-2xl font-bold text-2xl text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            OK
          </button>
        </>
      )}
    </div>
  );
}
