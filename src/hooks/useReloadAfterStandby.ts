import {useEffect, useRef} from 'react';
import {useIsTabletMode} from './useIsTabletMode';

// After Android tablets come out of standby, Chrome WebView's gesture
// engine can land in a state where touch events still fire (so scroll
// works) but the tap → click synthesis path is broken (so nothing
// clickable responds). The customer-facing storefront on the OLD
// menuwela.com host doesn't show this because it has none of the
// realtime/IntersectionObserver/idle-timer machinery RistoMenu-new
// runs — so when the WebView resumes, all the gathered setTimeouts
// fire in a thundering herd alongside a Pusher reconnect, and the
// gesture engine never recovers cleanly.
//
// We can't fix the WebView state from JS. What we CAN do: detect the
// "tablet woke from a long sleep" transition and reload the page,
// which gives the WebView a fresh JS context + a clean gesture engine.
//
// Quick screen-off/on (operator glanced at the time, customer leaned
// on the power button) does NOT reload — only sleeps long enough that
// the WebView is likely corrupted. Default threshold 10 minutes is the
// sweet spot per the operator: shorter would annoy busy staff, longer
// would let a tablet stay stuck through a coffee break.
//
// Mount once at App level — duplicate listeners would race to reload.
const DEFAULT_THRESHOLD_MS = 10 * 60 * 1000;

export function useReloadAfterStandby(thresholdMs: number = DEFAULT_THRESHOLD_MS) {
    const isTablet = useIsTabletMode();
    const hiddenAtRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isTablet) return;

        const onVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // Stamp the moment the WebView went to background. We use
                // performance.now()-style timing via Date.now() — both go
                // forward across pauses, unlike monotonic clocks that
                // some platforms freeze during system sleep.
                hiddenAtRef.current = Date.now();
                return;
            }

            if (document.visibilityState === 'visible' && hiddenAtRef.current != null) {
                const sleptFor = Date.now() - hiddenAtRef.current;
                hiddenAtRef.current = null;

                if (sleptFor >= thresholdMs) {
                    // Hard reload — bypass the React render path and give
                    // the WebView a brand-new JS context. The brief blank
                    // screen is preferable to staff staring at a tablet
                    // that responds to scroll but not to taps.
                    window.location.reload();
                }
            }
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, [isTablet, thresholdMs]);
}
