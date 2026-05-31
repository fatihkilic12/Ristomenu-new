import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';

// Long-press handler: opens the product modal after a short hold (~450ms)
// so users who naturally rest a finger on a tile get the same result as a
// tap without having to release first. The normal click path still works
// unchanged; we just suppress the redundant click that fires after the
// long-press trigger.
//
// Also fires haptic feedback (Android only — iOS Safari ignores Vibration
// API silently, no harm). 10ms tick on touch-down, 35ms thunk on long-press
// trigger so the customer feels the modal "engage" before it visually
// opens.

type Options = {
  onLongPress: () => void;
  onClick?: () => void;
  onPointerDown?: () => void;
  disabled?: boolean;
  delay?: number;
};

function vibrate(ms: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(ms); } catch { /* ignored on browsers that gate this */ }
  }
}

export function useLongPress({ onLongPress, onClick, onPointerDown, disabled, delay = 450 }: Options) {
  const timer = useRef<number | null>(null);
  const triggered = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  return {
    onPointerDown: (e: ReactPointerEvent) => {
      if (disabled) return;
      // Only buzz on actual touch — clicking with a mouse shouldn't vibrate
      // the user's phone if they happen to be tabletted into a dock.
      if (e.pointerType === 'touch') vibrate(10);
      onPointerDown?.();
      triggered.current = false;
      cancel();
      timer.current = window.setTimeout(() => {
        triggered.current = true;
        timer.current = null;
        vibrate(35);
        onLongPress();
      }, delay);
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onClick: () => {
      if (disabled) return;
      if (triggered.current) {
        triggered.current = false;
        return;
      }
      onClick?.();
    },
  };
}
