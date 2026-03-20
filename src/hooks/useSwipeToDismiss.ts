import { useRef, useCallback } from 'react';

export interface SwipeToDismissHandlers {
  /** Attach to the scrollable bottom-sheet element */
  sheetRef: React.RefObject<HTMLDivElement>;
  /** Attach to the backdrop element — drives opacity fade during drag */
  backdropRef: React.RefObject<HTMLDivElement>;
  onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchEnd: () => void;
}

/**
 * Swipe-to-dismiss for bottom sheets and modals.
 *
 * Behaviour:
 * - Drag starts only when the sheet's scrollTop === 0 (avoids hijacking
 *   normal content scrolling).
 * - The sheet follows the finger with a resistance curve so it feels physical.
 * - Release past `threshold` px  OR  a fast fling → dismiss with slide-out.
 * - Release before threshold → snap back with spring easing.
 * - Backdrop opacity fades proportionally to the drag distance.
 *
 * Usage:
 *   const { sheetRef, backdropRef, onTouchStart, onTouchMove, onTouchEnd } =
 *     useSwipeToDismiss({ onDismiss });
 *
 *   <div ref={backdropRef} className="fixed inset-0 bg-black/40" onClick={onClose}>
 *     <div ref={sheetRef} onTouchStart={onTouchStart}
 *          onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
 *       ...
 *     </div>
 *   </div>
 */
export function useSwipeToDismiss({
  onDismiss,
  threshold = 120,
  velocityThreshold = 0.5,
}: {
  onDismiss: () => void;
  /** Minimum drag distance in px to trigger dismiss. Default: 120 */
  threshold?: number;
  /** Velocity in px/ms to trigger dismiss on fast fling. Default: 0.5 */
  velocityThreshold?: number;
}): SwipeToDismissHandlers {
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Stable ref so handlers never go stale
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const drag = useRef({ active: false, startY: 0, startTime: 0, dy: 0 });

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    drag.current = {
      // Only allow dismiss gesture when content is scrolled all the way up
      active: sheet.scrollTop === 0,
      startY: e.touches[0].clientY,
      startTime: Date.now(),
      dy: 0,
    };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const sheet = sheetRef.current;
    if (!sheet || !drag.current.active) return;

    const dy = e.touches[0].clientY - drag.current.startY;
    if (dy <= 0) return; // Ignore upward moves; let the sheet scroll normally

    drag.current.dy = dy;

    // Resistance: free movement up to 80 px, then 40 % rate beyond that
    const visual = dy <= 80 ? dy : 80 + (dy - 80) * 0.4;
    sheet.style.transform = `translateY(${visual}px)`;
    sheet.style.transition = 'none';

    if (backdropRef.current) {
      // Fade backdrop from 0.4 opacity down to 0 as the sheet leaves
      const opacity = Math.max(0, 1 - dy / (window.innerHeight * 0.55));
      backdropRef.current.style.backgroundColor = `rgba(0,0,0,${(0.4 * opacity).toFixed(3)})`;
      backdropRef.current.style.transition = 'none';
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet || !drag.current.active) return;

    drag.current.active = false;
    const { dy, startTime } = drag.current;
    const elapsed = Math.max(1, Date.now() - startTime);
    const velocity = dy / elapsed; // px/ms

    if (dy >= threshold || velocity >= velocityThreshold) {
      // ── Dismiss ──────────────────────────────────────────────────────────
      sheet.style.transition = 'transform 0.28s ease-in';
      sheet.style.transform = 'translateY(100%)';
      if (backdropRef.current) {
        backdropRef.current.style.transition = 'background-color 0.28s ease-in';
        backdropRef.current.style.backgroundColor = 'rgba(0,0,0,0)';
      }
      // Call onDismiss slightly before the animation finishes so React
      // unmounts the element just as it disappears off screen
      setTimeout(() => onDismissRef.current(), 260);
    } else {
      // ── Snap back ────────────────────────────────────────────────────────
      sheet.style.transition = 'transform 0.35s cubic-bezier(0.22,1,0.36,1)';
      sheet.style.transform = 'translateY(0)';
      if (backdropRef.current) {
        backdropRef.current.style.transition = 'background-color 0.35s ease';
        backdropRef.current.style.backgroundColor = 'rgba(0,0,0,0.4)';
      }
    }
  }, [threshold, velocityThreshold]);

  return { sheetRef, backdropRef, onTouchStart, onTouchMove, onTouchEnd };
}
