import { useEffect, useRef, useCallback } from 'react';

export function useIdleTimer(onIdle: () => void, timeoutMs = 180_000) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const reset = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onIdle, timeoutMs);
  }, [onIdle, timeoutMs]);

  useEffect(() => {
    const events = ['touchstart', 'mousemove', 'keydown', 'scroll'] as const;
    events.forEach(e => document.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timerRef.current);
      events.forEach(e => document.removeEventListener(e, reset));
    };
  }, [reset]);

  return reset;
}
