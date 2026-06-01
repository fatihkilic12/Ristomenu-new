import { useEffect, useRef } from 'react';

// Custom DOM event the TabletMenuApp shell dispatches when the operator
// presses Android's hardware back / edge-swipe back gesture. The shell
// used to call `window.history.back()` instead, but that fought
// react-router's own popstate listener and caused modals to flash open
// and immediately close (see commits e3368cf / 10b56bb). The event
// channel lets the storefront intercept "back" without touching the
// router's history stack.
//
// Pages that want to handle back themselves (close a modal, dismiss a
// sheet) push a handler onto the stack via this hook. When no handler
// is registered, the shell's fallback path (history.back()) takes over
// so plain in-page navigation still works.
const BACK_EVENT = 'tablet:back';

type BackHandler = () => void;

const stack: BackHandler[] = [];

function dispatchToStack(e: Event) {
    // LIFO — the most recently opened modal wins. preventDefault tells
    // the TabletMenuApp shell that the back press was consumed by a
    // modal, so it should NOT fall through to window.history.back().
    const top = stack[stack.length - 1];
    if (!top) return;
    e.preventDefault();
    top();
}

let installed = false;
function ensureInstalled() {
    if (installed || typeof window === 'undefined') return;
    window.addEventListener(BACK_EVENT, dispatchToStack);
    installed = true;
}

/**
 * Wire a modal's open/close to the TabletMenuApp hardware-back gesture.
 *
 * The TabletMenuApp WebView dispatches a `tablet:back` CustomEvent on
 * hardware back; while `isOpen` is true this hook pushes a handler that
 * calls `onClose` on that event. When the stack is empty the shell
 * falls back to ordinary `history.back()` so navigation outside modals
 * still works.
 *
 * Does NOT use `history.pushState` — that approach was reverted
 * because react-router-dom's own history listener treated the pushed
 * state as a route change and remounted the modal closed.
 *
 * On desktop browsers the event never fires (no native shell), so the
 * hook is a no-op there; desktop users can close via the X button,
 * Escape, or backdrop click like before.
 */
export function useModalBackClose(isOpen: boolean, onClose: () => void) {
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;
        ensureInstalled();
        const handler: BackHandler = () => onCloseRef.current();
        stack.push(handler);
        return () => {
            const idx = stack.lastIndexOf(handler);
            if (idx !== -1) stack.splice(idx, 1);
        };
    }, [isOpen]);
}
