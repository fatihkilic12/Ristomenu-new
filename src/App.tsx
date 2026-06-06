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
import PrivacyPage from '@/pages/PrivacyPage';
import TermsPage from '@/pages/TermsPage';
import {useReloadAfterStandby} from '@/hooks/useReloadAfterStandby';

// Reloads the storefront when an Android tablet wakes from a >10 min
// standby. After long sleep the Chrome WebView's gesture engine lands
// in a state where touch events fire but click synthesis is broken
// (scroll works, taps don't). Reloading gives it a fresh JS context.
// Customer phones / shorter screen-offs are unaffected — see the hook
// for the rationale. Must live inside <BrowserRouter> because
// useIsTabletMode reads the `?tablet=1` query param via useSearchParams.
function TabletStandbyGuard() {
  useReloadAfterStandby();
  return null;
}

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
        <TabletStandbyGuard />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/company/:storeId" element={<LandingPage />} />
          <Route path="/company/:storeId/table" element={<TablePage />} />
          <Route path="/company/:storeId/kiosk" element={<KioskPage />} />
          <Route path="/company/:storeId/order" element={<OrderPage />} />
          <Route path="/company/:storeId/order/checkout" element={<CheckoutPage />} />
          <Route path="/company/:storeId/order/track/:secretKey" element={<OrderTrackingPage />} />
          {/* Static `menu` route must come before the dynamic `:table` catch-all */}
          <Route path="/company/:storeId/menu" element={<MenuOnlyPage />} />
          {/* TabletMenuApp's "Disable Order" switch points at this path —
              treat it as the same browse-only surface as /menu so wall-
              mounted tablets and permanent-display devices both work
              without a separate page. */}
          <Route path="/company/:storeId/tablet" element={<MenuOnlyPage />} />
          <Route path="/company/:storeId/:table" element={<DineInPage />} />
          <Route path="*" element={<div className="flex items-center justify-center h-screen text-xl text-gray-400">Not Found</div>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
    </I18nextProvider>
  );
}
