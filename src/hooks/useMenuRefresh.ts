import {useEffect} from 'react';
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

export function useMenuRefresh(_storeSlug: string | undefined) {
    const isTablet = useIsTabletMode();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!isTablet) return;

        window.__refetchMenu = () => {
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

        return () => {
            delete window.__refetchMenu;
        };
    }, [isTablet, queryClient]);
}
