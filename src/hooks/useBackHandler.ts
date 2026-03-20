import { useEffect, useRef } from 'react';

/**
 * Intercepts the system back gesture/button in PWA context.
 *
 * Behaviour:
 * - When isOpen becomes true  → pushState to absorb the next back press.
 * - System back (popstate)    → calls onClose() instead of leaving the app.
 * - Manual close (X / overlay)→ pops the history entry we pushed via history.back().
 * - Component unmounts        → cleans up the history entry if still pushed.
 *
 * Platform support:
 * - Android: hardware back button + gesture-back (Chrome/WebView)
 * - iOS PWA (standalone): swipe-back gesture (iOS 13+, improved in iOS 16.4+)
 * - iOS Safari (browser): swipe-back triggers popstate correctly
 */
export function useBackHandler(isOpen: boolean, onClose: () => void): void {
  const pushedRef = useRef(false);

  // Keep a ref to onClose so the popstate handler never becomes stale
  // without needing to re-register the event listener.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Sync history state with isOpen
  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ backHandler: true }, '');
      pushedRef.current = true;
    } else if (pushedRef.current) {
      // Closed manually — pop the entry we pushed
      pushedRef.current = false;
      window.history.back();
    }
  }, [isOpen]);

  // Register popstate listener once; clean up on unmount
  useEffect(() => {
    const handlePopState = () => {
      if (pushedRef.current) {
        pushedRef.current = false;
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Unmount while open → clean up the dangling history entry
      if (pushedRef.current) {
        pushedRef.current = false;
        window.history.back();
      }
    };
  }, []);
}
