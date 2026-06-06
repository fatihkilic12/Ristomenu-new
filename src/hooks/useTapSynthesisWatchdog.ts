import {useEffect} from 'react';
import {API_SERVER_ADDRESS} from '@/config/constants';
import {saveBeforeReload} from '@/lib/tabletReloadState';
import {useIsTabletMode} from './useIsTabletMode';

// Definitive fix for the "scroll works but taps don't" stuck state on
// Android tablets. We tried multiple upstream guesses (post-standby
// reload, FlickerOverlay teardown, Pusher cleanup hardening) and the
// state still recurs — sometimes after short screen-offs, sometimes
// after long ones, sometimes apparently without standby at all. The
// common factor is always: Chrome WebView's gesture engine stops
// synthesising the click event from a touchstart→touchend pair.
//
// Rather than guess at the cause, we detect the SYMPTOM directly:
//
//   1. A user taps the screen (touchstart → touchend, small movement,
//      short duration — i.e. clearly a tap, not a scroll/swipe).
//   2. A click event SHOULD bubble through `document` within ~400ms.
//      Click bubbles from any tapped element regardless of whether the
//      target has an onclick handler, so empty-space taps still fire a
//      click event — the only way no click fires is if synthesis itself
//      broke.
//   3. If we see THRESHOLD consecutive tap-like touch ends with no
//      matching click event, the WebView's gesture engine is broken.
//      We reload, which gives the WebView a fresh JS context + clean
//      gesture state. Customer waits ~2 sec instead of staring at a
//      dead tablet until staff power-cycles it.
//
// Mounted at App level, gated on tablet mode so customer phones can
// never accidentally reload themselves.
// More lenient than the original 12px — Android Chrome WebView doesn't
// always deliver fine-grained touchmove events on slow scrolls, so a
// real scroll could end with `movedTooFar=false` if the only delivered
// touchmoves landed within 12px of the start. 22px gives more headroom
// without making a real "fat finger that wobbled" tap miss.
const TAP_MAX_MOVEMENT_PX = 22;
const TAP_MAX_DURATION_MS = 350;
const CLICK_AFTER_TAP_TIMEOUT_MS = 400;
// Three consecutive failed taps before reload (was two). The watchdog
// also now bails on touchend if the page scrolled at all during the
// gesture, so the residual false-positive shape was "rapid taps in
// empty space that the WebView genuinely couldn't synthesise clicks
// for" — a third confirmation costs the customer ~400ms of extra
// latency on a real stuck state but eliminates entire classes of
// "I just scrolled and the page reloaded" complaints.
const STUCK_THRESHOLD = 3;

export function useTapSynthesisWatchdog() {
    const isTablet = useIsTabletMode();

    useEffect(() => {
        if (!isTablet) return;

        let touchStartTime = 0;
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartScrollY = 0;
        let movedTooFar = false;
        let scrolledDuringTouch = false;
        let pendingTapCheckTimer: number | null = null;
        let failedTapCount = 0;
        let waitingForClick = false;

        const cancelPendingCheck = () => {
            if (pendingTapCheckTimer != null) {
                window.clearTimeout(pendingTapCheckTimer);
                pendingTapCheckTimer = null;
            }
        };

        const onTouchStart = (e: TouchEvent) => {
            // Only single-finger taps are candidates. Multi-touch is
            // pinch/two-finger pan/etc — never synthesises click.
            if (e.touches.length !== 1) {
                movedTooFar = true;
                return;
            }
            touchStartTime = Date.now();
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartScrollY = window.scrollY;
            movedTooFar = false;
            scrolledDuringTouch = false;
        };

        // Strongest possible "this was a scroll, not a tap" signal: the
        // page actually scrolled while the finger was down. Watching the
        // scroll event directly catches cases where Android WebView
        // didn't deliver enough granular touchmoves for the movement
        // detector to trip — fast-flick scrolls in particular.
        const onScroll = () => {
            // Only matters if a touch is in progress; otherwise this is
            // either programmatic scroll or post-touch inertial scroll,
            // neither of which should affect tap detection.
            if (touchStartTime !== 0) {
                scrolledDuringTouch = true;
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (movedTooFar) return;
            if (e.touches.length !== 1) {
                movedTooFar = true;
                return;
            }
            const dx = Math.abs(e.touches[0].clientX - touchStartX);
            const dy = Math.abs(e.touches[0].clientY - touchStartY);
            if (dx > TAP_MAX_MOVEMENT_PX || dy > TAP_MAX_MOVEMENT_PX) {
                movedTooFar = true;
            }
        };

        const onTouchEnd = () => {
            // Mark the gesture as done — onScroll's "touch in progress?"
            // check uses this to ignore inertial scroll after release.
            const endTime = Date.now();
            const elapsed = endTime - touchStartTime;
            const startTimeForCheck = touchStartTime;
            touchStartTime = 0;

            // Filter out scrolls/swipes (moved too far, OR page actually
            // scrolled, OR window.scrollY shifted from where it was at
            // touchstart) and long-presses (held too long). Each of
            // these legitimately doesn't synthesise a click event and
            // would otherwise create false positives. The scrollY-delta
            // check is the most reliable on Android Chrome WebView —
            // touchmove granularity isn't guaranteed but a real scroll
            // always moves the scrollY value.
            if (movedTooFar) return;
            if (scrolledDuringTouch) return;
            if (window.scrollY !== touchStartScrollY) return;
            if (startTimeForCheck === 0) return;
            if (elapsed > TAP_MAX_DURATION_MS) return;

            // Genuine tap candidate. Set a watchdog: if no click event
            // bubbles through document within the timeout, count this as
            // a failed synthesis.
            waitingForClick = true;
            cancelPendingCheck();
            pendingTapCheckTimer = window.setTimeout(() => {
                if (!waitingForClick) return;
                waitingForClick = false;
                failedTapCount++;
                if (failedTapCount >= STUCK_THRESHOLD) {
                    // Log + beacon so adb logcat AND Cloud Run logs
                    // both show why we bounced. sendBeacon is critical:
                    // the page reloads on the next line, and a normal
                    // fetch would be canceled before the request leaves
                    // the device. The browser guarantees a beacon's
                    // delivery across the unload/navigation boundary.
                    const reason = `[tap-watchdog] ${failedTapCount} tap(s) without click — WebView gesture engine stuck, reloading`;
                    console.warn(reason);
                    try {
                        // Derive the store slug from the current path so
                        // the operator can filter logs per restaurant.
                        // Pages on this storefront are all rooted at
                        // /company/<slug>/... — fall back to '' if the
                        // shape doesn't match (e.g. the landing page).
                        const m = window.location.pathname.match(/^\/company\/([^/]+)/);
                        const storeSlug = m ? m[1] : '';
                        const payload = JSON.stringify({
                            url: window.location.href,
                            store_slug: storeSlug,
                            consecutive_failed_taps: failedTapCount,
                            reason,
                            // Server stamps received_at itself, but ours
                            // helps if there's clock skew worth seeing.
                            client_timestamp: new Date().toISOString(),
                        });
                        // text/plain side-steps a CORS preflight that
                        // application/json would force on cross-origin
                        // beacons (Cloud Run is a different origin than
                        // menu.menuwela.com). Django's DRF JSONParser
                        // still parses the body — it sniffs JSON.
                        const blob = new Blob([payload], {type: 'text/plain;charset=utf-8'});
                        navigator.sendBeacon?.(
                            `${API_SERVER_ADDRESS}/tablets/stuck-event/`,
                            blob,
                        );
                    } catch {
                        // Beacon is best-effort observability — never
                        // let a failure here delay the reload that
                        // actually fixes the user's stuck tablet.
                    }
                    // Stash where the customer was so they don't land
                    // back at the top of the menu after the recovery
                    // reload — TabletStuckGuard reads this and scrolls
                    // back to roughly the same spot once data lands.
                    saveBeforeReload();
                    window.location.reload();
                }
            }, CLICK_AFTER_TAP_TIMEOUT_MS);
        };

        const onClick = () => {
            // A click made it through synthesis — WebView is healthy.
            // Reset the streak so an unrelated future tap doesn't carry
            // a stale failure count into a reload.
            waitingForClick = false;
            failedTapCount = 0;
            cancelPendingCheck();
        };

        // Capture phase so we observe events before page-level handlers
        // call stopPropagation. Passive: nothing in here calls
        // preventDefault, and passive listeners are cheaper on Android.
        document.addEventListener('touchstart', onTouchStart, {passive: true, capture: true});
        document.addEventListener('touchmove', onTouchMove, {passive: true, capture: true});
        document.addEventListener('touchend', onTouchEnd, {passive: true, capture: true});
        document.addEventListener('click', onClick, {passive: true, capture: true});
        window.addEventListener('scroll', onScroll, {passive: true, capture: true});

        return () => {
            cancelPendingCheck();
            document.removeEventListener('touchstart', onTouchStart, {capture: true} as any);
            document.removeEventListener('touchmove', onTouchMove, {capture: true} as any);
            document.removeEventListener('touchend', onTouchEnd, {capture: true} as any);
            document.removeEventListener('click', onClick, {capture: true} as any);
            window.removeEventListener('scroll', onScroll, {capture: true} as any);
        };
    }, [isTablet]);
}
