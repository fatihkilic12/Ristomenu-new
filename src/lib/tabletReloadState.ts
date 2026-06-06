// Scroll-position preservation across the tap-watchdog / standby
// reloads. When the tablet bounces because the WebView gesture engine
// got stuck, the customer was likely halfway through browsing — without
// this they'd snap back to the top of the page on every recovery. With
// this they land roughly where they were within ~1 second of the reload.
//
// sessionStorage (not localStorage) so a fresh app launch doesn't try
// to restore a position from yesterday. The timestamp guard adds a
// second belt: even within a session, anything older than 30s is treated
// as stale (e.g. the operator put the tablet on the shelf for an hour
// then powered it back up — that's not a "recovery from stuck", that's
// a new visit and the customer expects to start at the top).
//
// Pathname is checked so a reload that ended up redirecting (router
// changed paths during the reload, or the URL was pruned by the
// storefront's slug-canonicalisation logic) doesn't dump a stale scroll
// position into an unrelated page.
const STORAGE_KEY = 'tablet-reload-state';
const STALE_MS = 30_000;

type SavedState = {
    pathname: string;
    scrollY: number;
    ts: number;
};

export function saveBeforeReload() {
    try {
        const state: SavedState = {
            pathname: window.location.pathname,
            scrollY: window.scrollY,
            ts: Date.now(),
        };
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // sessionStorage can throw in private-browsing edge cases.
        // The fallback is identical to never saving at all — page just
        // loads at scrollY=0 after the reload, customer scrolls down
        // by hand. No need to block the reload itself.
    }
}

export function tryRestoreAfterReload() {
    let saved: SavedState | null = null;
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        window.sessionStorage.removeItem(STORAGE_KEY);
        saved = JSON.parse(raw) as SavedState;
    } catch {
        return;
    }

    if (!saved || typeof saved.scrollY !== 'number') return;
    if (Date.now() - saved.ts > STALE_MS) return;
    if (saved.pathname !== window.location.pathname) return;

    // First paint happens before the route's data is fetched, so a
    // scrollTo on mount usually targets a near-empty document — the
    // browser caps the value at the current scrollHeight and the
    // customer still ends up at the top. Wait one event-loop tick AND
    // do it a second time on the next animation frame after data is
    // likely in. Cheap belt-and-braces; both calls hit the same
    // browser API.
    const restore = () => {
        if (window.scrollY === saved!.scrollY) return;
        window.scrollTo({top: saved!.scrollY, behavior: 'auto'});
    };
    window.setTimeout(restore, 50);
    window.setTimeout(restore, 250);
    window.setTimeout(restore, 800);
}
