import {useEffect} from 'react';
import {useQueryClient} from '@tanstack/react-query';

import {useIsTabletMode} from './useIsTabletMode';

// Pusher-driven menu refresh for in-restaurant tablets.
//
// The server emits `menu_updated` on the public channel `menu-<slug>`
// every time a Product / Category / OptionGroup is saved or deleted in
// the Portal. When this hook is mounted on a tablet, we subscribe to
// that channel and invalidate the menu-related query caches so the next
// frame refetches.
//
// Gated on `useIsTabletMode()`. Customer phones (QR scan) never
// subscribe — they fetch once on page load and that's the end of it,
// matching their actual usage pattern.
//
// pusher-js is pulled in via dynamic import so the ~30KB bundle only
// ships on tablets, not in the customer-phone path.
export function useMenuRefresh(storeSlug: string | undefined) {
    const isTablet = useIsTabletMode();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!isTablet || !storeSlug) return;

        const key = import.meta.env.VITE_PUSHER_KEY as string | undefined;
        const cluster = (import.meta.env.VITE_PUSHER_CLUSTER as string | undefined) || 'eu';
        if (!key) {
            // Pusher key not configured — fall back to no realtime refresh.
            // Customers don't care, tablets will need a manual reload until
            // VITE_PUSHER_KEY is set in the storefront's env.
            return;
        }

        let cancelled = false;
        let cleanup: (() => void) | null = null;

        (async () => {
            const {default: Pusher} = await import('pusher-js');
            if (cancelled) return;

            const client = new Pusher(key, {cluster});
            const channel = client.subscribe(`menu-${storeSlug}`);
            const handler = () => {
                // Invalidate every menu-flavoured cache key. React-query
                // dedupes the actual refetch when multiple keys share an
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
            channel.bind('menu_updated', handler);

            cleanup = () => {
                channel.unbind('menu_updated', handler);
                client.unsubscribe(`menu-${storeSlug}`);
                client.disconnect();
            };
        })();

        return () => {
            cancelled = true;
            if (cleanup) cleanup();
        };
    }, [isTablet, storeSlug, queryClient]);
}
