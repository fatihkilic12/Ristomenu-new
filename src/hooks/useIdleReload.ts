import { useEffect } from 'react';

// Wall-mounted tablets running the MenuOnlyPage (order-disabled mode) get
// left scrolled deep into the menu by one customer and the next walks up
// to a half-open category mid-list. Reloading the page on idle resets:
// scroll position, active-category state, any open product modal, and
// also gives long-lived WebViews a fresh JS heap.
//
// Triggers only on real user-input events (touch / pointer / wheel / key
// / scroll). Background activity — Pusher pushes, react-query refetches,
// the IntersectionObserver firing on its own — does NOT count, otherwise
// a busy tablet would never reach idle.
const ACTIVITY_EVENTS = ['touchstart', 'mousedown', 'wheel', 'scroll', 'keydown'] as const;

export function useIdleReload(enabled: boolean, idleMs: number) {
    useEffect(() => {
        if (!enabled) return;
        let timer: number | null = null;
        const reset = () => {
            if (timer != null) window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                window.location.reload();
            }, idleMs);
        };
        reset();
        for (const evt of ACTIVITY_EVENTS) {
            window.addEventListener(evt, reset, { passive: true, capture: true });
        }
        return () => {
            if (timer != null) window.clearTimeout(timer);
            for (const evt of ACTIVITY_EVENTS) {
                window.removeEventListener(evt, reset, { capture: true } as any);
            }
        };
    }, [enabled, idleMs]);
}
