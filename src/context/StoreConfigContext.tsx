import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCompanyInfo, getStoreConfig } from '@/actions/store';
import { getBranding, type Branding } from '@/lib/branding';

// Channel settings include pause fields populated by the server. `is_paused`
// is server-computed (paused_until > now) — trust it as the source of truth
// rather than recomputing on the client.
export type ChannelSettings = {
  open_for_order?: boolean;
  paused_until?: string | null;
  pause_reason?: string | null;
  is_paused?: boolean;
  [key: string]: unknown;
};

// Shape of the raw `branding` block as it arrives from /config/. All fields
// optional because the backend returns `{}` for stores without a configured
// StorefrontSettings row.
export type BrandingPayload = Partial<Branding>;

type StoreConfig = {
  company: Record<string, any> | null;
  loading: boolean;
};

const StoreConfigContext = createContext<StoreConfig>({ company: null, loading: true });

// CSS custom properties we manage from branding. Listed centrally so the
// unmount cleanup wipes exactly what we set.
const MANAGED_PROPS = [
  '--color-primary',
  '--color-primary-hover',
  '--color-secondary',
  '--color-background',
  '--color-bg',          // legacy alias kept in sync with --color-background
  '--color-text',
  '--color-header',
  '--color-header-text',
] as const;

export function StoreConfigProvider({ storeId, children }: { storeId: string; children: ReactNode }) {
  // Routed through react-query so:
  //   1. StrictMode's intentional double-mount in dev no longer fires
  //      two network calls — the second hits the in-flight dedupe.
  //   2. Page-to-page navigation (DineIn → Order → Checkout) reuses
  //      the same cached config instead of refetching on every mount.
  //   3. The cache key includes storeId, so switching restaurants
  //      still triggers a fresh fetch.
  // Long staleTime (5 min) because /store/<slug>/ contents are basically
  // static — branding/colors/opening_hours don't change mid-session.
  //
  // Endpoints in parallel:
  //   /store/{slug}/         — languages, hours, location, supports_*,
  //                            delivery_settings, pickup_settings, plus
  //                            menu_settings.disable_note (the only
  //                            non-branding menu toggle that lives here)
  //   /store/{slug}/config/  — full `branding` block (StorefrontSettings),
  //                            payment_methods, regions, opening_hours
  // cachedGet swallows errors → null on failure, so the page still renders
  // from whichever response succeeded.
  const {data: company, isLoading} = useQuery({
    queryKey: ['store-config', storeId],
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const [info, config] = await Promise.all([
        getCompanyInfo(storeId),
        getStoreConfig(storeId),
      ]);
      const merged: Record<string, any> = info ? {...info} : {};
      if (config?.store) Object.assign(merged, config.store);
      if (config?.branding) merged.branding = config.branding;
      if (config?.payment_methods) merged.payment_methods = config.payment_methods;
      if (config?.regions) merged.regions = config.regions;
      if (config?.opening_hours) merged.opening_hours = config.opening_hours;
      if (config?.active_modules) merged.active_modules = config.active_modules;
      if (config?.kiosk_settings) merged.kiosk_settings = config.kiosk_settings;
      return Object.keys(merged).length > 0 ? merged : null;
    },
  });

  // Apply branding to CSS variables when data arrives. Separate effect from
  // the fetch so it re-runs cleanly when the cache returns a fresh copy.
  useEffect(() => {
    if (!company) return;
    const b = getBranding(company);
    const root = document.documentElement;
    if (b.primary_color) {
      root.style.setProperty('--color-primary', b.primary_color);
      root.style.setProperty('--color-primary-hover', adjustColor(b.primary_color, -20));
    }
    if (b.secondary_color) {
      root.style.setProperty('--color-secondary', b.secondary_color);
    }
    if (b.background_color) {
      root.style.setProperty('--color-background', b.background_color);
      root.style.setProperty('--color-bg', b.background_color);
    }
    if (b.text_color) {
      root.style.setProperty('--color-text', b.text_color);
    }
    if (b.header_color) {
      root.style.setProperty('--color-header', b.header_color);
      root.style.setProperty('--color-header-text', getContrastText(b.header_color));
    }
  }, [company]);

  // Reset CSS variables on unmount so a logged-out / no-storeId state
  // doesn't keep the previous tenant's colours bleeding through.
  useEffect(() => {
    return () => {
      const root = document.documentElement;
      MANAGED_PROPS.forEach(p => root.style.removeProperty(p));
    };
  }, []);

  const value = useMemo(
    () => ({company: company ?? null, loading: isLoading}),
    [company, isLoading],
  );

  return (
    <StoreConfigContext.Provider value={value}>
      {children}
    </StoreConfigContext.Provider>
  );
}

export function useStoreConfig() {
  return useContext(StoreConfigContext);
}

// Darken/lighten a hex color by amount
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  if (Number.isNaN(num)) return hex;
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Return 'white' or 'black' for contrast text
function getContrastText(hex: string): string {
  const num = parseInt(hex.replace('#', ''), 16);
  if (Number.isNaN(num)) return '#000000';
  const r = num >> 16;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}
