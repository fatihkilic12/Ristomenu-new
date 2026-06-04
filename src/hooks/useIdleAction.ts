import { useEffect, useRef } from 'react';

// Generic idle-timer hook. Calls `action()` after `idleMs` of no
// real user input. The MenuOnlyPage uses this with a short window
// (~60s) to gently scroll back to the first category between customers
// — much less disruptive than the 5-minute full-page useIdleReload
// fallback. Both can coexist (soft reset first, hard reload later).
//
// Triggers only on real user-input events (touch / pointer / wheel /
// scroll / key). Background work (Pusher pushes, react-query refetches,
// the IntersectionObserver firing on its own) does NOT count, otherwise
// a busy tablet would never reach idle.
const ACTIVITY_EVENTS = ['touchstart', 'mousedown', 'wheel', 'scroll', 'keydown'] as const;

export function useIdleAction(enabled: boolean, idleMs: number, action: () => void) {
    // Keep a ref to the latest action so the effect doesn't have to
    // re-arm timers + re-bind listeners every render — even when the
    // caller passes a new inline function each pass.
    const actionRef = useRef(action);
    useEffect(() => { actionRef.current = action; }, [action]);

    useEffect(() => {
        if (!enabled) return;
        let timer: number | null = null;
        const reset = () => {
            if (timer != null) window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                actionRef.current();
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
