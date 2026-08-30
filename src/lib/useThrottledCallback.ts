import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

// The counterpart to useDebouncedCallback: a debounce waits for the caller to
// stop, a throttle keeps a steady rate while it carries on. A caret dragged
// across a file has to keep moving on the other screens, so waiting for a
// pause is the wrong shape — this fires straight away and then at most once
// per interval, with a trailing call so the position it settles on isn't the
// one that got dropped.
export function useThrottledCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  intervalMs: number,
) {
  // Same reasoning as the debounce: keep the latest callback without making it
  // a dependency, and write the ref in an effect rather than during render.
  const callbackRef = useRef(callback);
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  const lastRunRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Args | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    (...args: Args) => {
      const waited = Date.now() - lastRunRef.current;

      if (waited >= intervalMs) {
        lastRunRef.current = Date.now();
        callbackRef.current(...args);
        return;
      }

      // inside the interval: remember the newest args and let the timer
      // already in flight deliver them
      pendingRef.current = args;
      if (timeoutRef.current) return;

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        lastRunRef.current = Date.now();
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (pending) callbackRef.current(...pending);
      }, intervalMs - waited);
    },
    [intervalMs],
  );
}
