import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getCompanyInfo } from '@/actions/store';

type StoreConfig = {
  company: Record<string, any> | null;
  loading: boolean;
};

const StoreConfigContext = createContext<StoreConfig>({ company: null, loading: true });

export function StoreConfigProvider({ storeId, children }: { storeId: string; children: ReactNode }) {
  const [company, setCompany] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCompanyInfo(storeId).then(data => {
      setCompany(data);
      // Apply store theme via CSS custom properties
      if (data?.menu_settings) {
        const root = document.documentElement;
        const s = data.menu_settings;
        if (s.button_color) {
          root.style.setProperty('--color-primary', s.button_color);
          root.style.setProperty('--color-primary-hover', adjustColor(s.button_color, -20));
        }
        if (s.header_color) {
          root.style.setProperty('--color-header', s.header_color);
          root.style.setProperty('--color-header-text', getContrastText(s.header_color));
        }
      }
    }).finally(() => setLoading(false));

    return () => {
      // Reset theme on unmount
      const root = document.documentElement;
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-primary-hover');
      root.style.removeProperty('--color-header');
      root.style.removeProperty('--color-header-text');
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
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Return 'white' or 'black' for contrast text
function getContrastText(hex: string): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = num >> 16;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}
