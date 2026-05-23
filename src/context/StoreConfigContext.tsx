import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getCompanyInfo } from '@/actions/store';
import { getBranding } from '@/lib/branding';

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
  const [company, setCompany] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCompanyInfo(storeId).then(data => {
      setCompany(data);
      if (!data) return;

      const b = getBranding(data);
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
    }).finally(() => setLoading(false));

    return () => {
      const root = document.documentElement;
      MANAGED_PROPS.forEach(p => root.style.removeProperty(p));
    };
  }, [storeId]);

  return (
    <StoreConfigContext.Provider value={{ company, loading }}>
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
