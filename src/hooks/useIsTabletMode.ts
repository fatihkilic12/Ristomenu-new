import {useEffect, useState} from 'react';
import {useSearchParams} from 'react-router-dom';

const STORAGE_KEY = 'tablet-mode';

// Detects whether the storefront is being viewed inside the in-restaurant
// TabletMenuApp WebView. The native shell appends `?tablet=1` to the
// initial URL it loads — that's the discriminator from a customer's phone
// (QR code deep-link, no flag) versus a permanent kiosk tablet.
//
// The query param is only present on the very first navigation; once the
// SPA router pushes a new route the param is gone. We persist to
// sessionStorage on first detection so any subsequent page mount still
// knows it's a tablet.
//
// Use this to gate heavyweight "always-on" behaviour (periodic refetch,
// auto-reload, screensaver-style idle handling) that you don't want
// burning bandwidth on customer phones.
export function useIsTabletMode(): boolean {
    const [searchParams] = useSearchParams();
    const [isTablet, setIsTablet] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        try {
            return window.sessionStorage.getItem(STORAGE_KEY) === '1';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        if (searchParams.get('tablet') === '1' && !isTablet) {
            try {
                window.sessionStorage.setItem(STORAGE_KEY, '1');
            } catch {
                // sessionStorage can be blocked (third-party iframe, private
                // browsing on some browsers). Fall back to in-memory state —
                // good enough until the WebView is restarted.
            }
            setIsTablet(true);
        }
    }, [searchParams, isTablet]);

    return isTablet;
}
