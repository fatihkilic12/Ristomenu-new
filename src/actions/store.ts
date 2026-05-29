import api from './api';
import i18n from '@/locales';

// All store/menu data goes through cachedGet: network-first with a localStorage
// fallback. This lets users open the menu offline once they've visited it at
// least once (think: someone scans a QR-code in the restaurant, then loses
// signal — they still see the menu).

const CACHE_PREFIX = 'menu-cache:';

function cacheKey(url: string): string {
  return `${CACHE_PREFIX}${i18n.language || 'en'}:${url}`;
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Quota exceeded — prune oldest entries and try once more.
    pruneCache();
    try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* give up */ }
  }
}

// When the quota fills up, drop the menu-cache keys that haven't been touched
// recently. Cheap heuristic: remove half of them, picked by stable iteration
// order. Browsers don't expose access timestamps for localStorage entries.
function pruneCache(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(CACHE_PREFIX)) keys.push(k);
    }
    keys.slice(0, Math.ceil(keys.length / 2)).forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

async function cachedGet<T>(url: string): Promise<T | null> {
  const key = cacheKey(url);
  try {
    const res = await api.get(url);
    writeCache(key, res.data);
    return res.data as T;
  } catch {
    // Network/server error — serve from cache when we have one.
    return readCache<T>(key);
  }
}

export const getCompanyInfo = (id: string) =>
  cachedGet<any>(`/api/v2/store/${id}/`);

export const getCompanyMenu = (id: string, table: string) =>
  cachedGet<any>(`/api/v2/store/${id}/${table}/menu/`);

export const getDeliveryMenu = (id: string, type = 'delivery') =>
  cachedGet<any>(`/api/v2/store/${id}/menu/?type=${type}`);

export const getKioskMenu = (id: string) =>
  cachedGet<any>(`/api/v2/store/${id}/kiosk/menu/`);

export const getStoreConfig = (id: string) =>
  cachedGet<any>(`/api/v2/store/${id}/config/`);

// Pre-order slots — fetched fresh every time the picker mounts. We deliberately
// skip the cachedGet helper here because slot availability changes minute-by-minute
// (lead time, opening-hour rollover, operator pausing pre-orders) and a stale
// cached value would surface times the customer can't actually book.
export type PreOrderSlot = { start: string; label: string };
export type PreOrderSlotsResponse = {
  order_type: 'delivery' | 'pickup';
  currently_open: boolean;
  next_open_at: string | null;
  min_lead_minutes: number;
  slot_minutes: number;
  slots: PreOrderSlot[];
  detail?: string;
};

export const getPreOrderSlots = (
  id: string,
  orderType: 'delivery' | 'pickup',
  days = 7,
): Promise<PreOrderSlotsResponse> =>
  api
    .get(`/api/v2/store/${id}/preorder-slots/?order_type=${orderType}&days=${days}`)
    .then(r => r.data as PreOrderSlotsResponse);
