import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/locales';

import HomePage from '@/pages/HomePage';
import LandingPage from '@/pages/LandingPage';
import TablePage from '@/pages/TablePage';
import DineInPage from '@/pages/DineInPage';
import KioskPage from '@/pages/KioskPage';
import OrderPage from '@/pages/OrderPage';
import CheckoutPage from '@/pages/CheckoutPage';
import OrderTrackingPage from '@/pages/OrderTrackingPage';
import MenuOnlyPage from '@/pages/MenuOnlyPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 5 * 60 * 1000,
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/company/:storeId" element={<LandingPage />} />
          <Route path="/company/:storeId/table" element={<TablePage />} />
          <Route path="/company/:storeId/kiosk" element={<KioskPage />} />
          <Route path="/company/:storeId/order" element={<OrderPage />} />
          <Route path="/company/:storeId/order/checkout" element={<CheckoutPage />} />
          <Route path="/company/:storeId/order/track/:secretKey" element={<OrderTrackingPage />} />
          {/* Static `menu` route must come before the dynamic `:table` catch-all */}
          <Route path="/company/:storeId/menu" element={<MenuOnlyPage />} />
          <Route path="/company/:storeId/:table" element={<DineInPage />} />
          <Route path="*" element={<div className="flex items-center justify-center h-screen text-xl text-gray-400">Not Found</div>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
    </I18nextProvider>
  );
}
