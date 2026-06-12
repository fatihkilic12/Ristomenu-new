import {useEffect, useRef} from 'react';
import {useQueryClient} from '@tanstack/react-query';

import {useIsTabletMode} from './useIsTabletMode';

// Menu refresh hook for in-restaurant tablets.
//
// IMPORTANT: this hook does NOT open a Pusher connection. The native
// TabletMenuApp shell already holds a Pusher connection for
// tablet_flicker + tablet_battery_request — at 1000 tablets that's
// already 1000 connections, and opening a second one from inside the
// WebView would double the count for no functional gain.
//
// Instead we expose a `window.__refetchMenu()` callback. The native
// shell subscribes to menu_updated on its single connection; on
// receipt it calls `webView.injectJavaScript('window.__refetchMenu &&
// window.__refetchMenu()')`, which hits this function and triggers
// the same react-query invalidations the old Pusher subscription did.
//
// Customer phones (not in tablet mode) skip everything — they don't
// stay on the menu page long enough to care about realtime updates.
declare global {
    interface Window {
        __refetchMenu?: () => void;
    }
}

// Coalesce bursts of `menu_updated` pushes into one refetch. The
// trigger for this: after the Python 3.13 GC fix on the server every
// cache-bump signal actually fires (previously only the last for-loop
// iteration survived), so a single operator edit-session can fan out
// dozens of pushes per minute — name change, price tweak, sold-out
// toggle, option-link save, …  Without debouncing, the tablet
// invalidates + refetches + re-renders for each one, and a customer
// who taps mid-render finds the click event fires on a component
// that's already been unmounted ("products show, taps do nothing").
//
// Trailing-edge schedule: every call resets the timer to `delay` ms in
// the future. Once `delay` of quiet passes, we invalidate ONCE with
// the latest server state. Customer sees one brief refetch instead of
// fifty. 1200 ms is the sweet spot — short enough that a single
// "hide this product" edit still feels live on the floor, long enough
// to absorb a typical 5-second flurry of bulk edits.
const REFRESH_DEBOUNCE_MS = 1200;

export function useMenuRefresh(_storeSlug: string | undefined) {
    const isTablet = useIsTabletMode();
    const queryClient = useQueryClient();
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isTablet) return;

        const runInvalidation = () => {
            timerRef.current = null;
            // Invalidate every menu-flavoured cache key. React-query
            // dedupes the actual refetch across keys that share an
            // in-flight fetcher, so this is cheap even on a page that
            // doesn't currently render the matching component.
            queryClient.invalidateQueries({queryKey: ['menu']});
            queryClient.invalidateQueries({queryKey: ['menu-only']});
            queryClient.invalidateQueries({queryKey: ['delivery-menu']});
            queryClient.invalidateQueries({queryKey: ['kiosk-menu']});
            // Branding / hours / settings can also change in the
            // Portal — invalidate the store config cache too so the
            // tablet picks up colour or hours edits.
            queryClient.invalidateQueries({queryKey: ['store-config']});
        };

        window.__refetchMenu = () => {
            if (timerRef.current != null) {
                window.clearTimeout(timerRef.current);
            }
            timerRef.current = window.setTimeout(runInvalidation, REFRESH_DEBOUNCE_MS);
        };

        return () => {
            if (timerRef.current != null) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            delete window.__refetchMenu;
        };
    }, [isTablet, queryClient]);
}
