import {useEffect} from 'react';
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
const TAP_MAX_MOVEMENT_PX = 12;
const TAP_MAX_DURATION_MS = 350;
const CLICK_AFTER_TAP_TIMEOUT_MS = 400;
// Two consecutive failed taps before reload. One could be the customer
// tapping empty space below the page bounds (rare but possible). Two
// in a row is well past coincidence — that's the bug.
const STUCK_THRESHOLD = 2;

export function useTapSynthesisWatchdog() {
    const isTablet = useIsTabletMode();

    useEffect(() => {
        if (!isTablet) return;

        let touchStartTime = 0;
        let touchStartX = 0;
        let touchStartY = 0;
        let movedTooFar = false;
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
            movedTooFar = false;
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
            // Filter out scrolls/swipes (moved too far) and long-presses
            // (held too long) — those legitimately don't synthesise a
            // click event and would create false positives.
            if (movedTooFar) return;
            if (Date.now() - touchStartTime > TAP_MAX_DURATION_MS) return;

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
                    // Log so adb logcat shows why we bounced. Then bail.
                    console.warn(
                        `[tap-watchdog] ${failedTapCount} tap(s) without click — WebView gesture engine stuck, reloading`
                    );
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

        return () => {
            cancelPendingCheck();
            document.removeEventListener('touchstart', onTouchStart, {capture: true} as any);
            document.removeEventListener('touchmove', onTouchMove, {capture: true} as any);
            document.removeEventListener('touchend', onTouchEnd, {capture: true} as any);
            document.removeEventListener('click', onClick, {capture: true} as any);
        };
    }, [isTablet]);
}
