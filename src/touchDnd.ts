import { useEffect, useMemo, useRef } from 'react';

// Touch-friendly drag-and-drop that runs alongside HTML5 DnD.
// HTML5 drag events (`draggable`, `ondragstart`, `ondrop`, ...) do not fire on
// iOS/iPadOS Safari, so we synthesize the same behavior from touch events.
// Long-press (350ms) starts the drag so taps and scroll gestures still work.

export type TouchDropHandlers = {
  onDrop: (payload: string) => void;
  onEnter?: () => void;
  onLeave?: () => void;
};

interface Zone {
  el: HTMLElement;
  handlersRef: { current: TouchDropHandlers };
}

const zones = new Set<Zone>();

/**
 * Registers the returned ref callback's element as a touch-drop target.
 * `handlers` may be a fresh object each render — the latest is always used.
 */
export function useTouchDropZone(handlers: TouchDropHandlers) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  // Currently-attached zone lives in a ref so mutation happens outside render.
  const zoneRef = useRef<Zone | null>(null);

  // Stable ref-callback. React invokes it with `null` on unmount so the zone
  // is removed from the registry.
  return useMemo<(el: HTMLElement | null) => void>(
    () => (el: HTMLElement | null) => {
      const existing = zoneRef.current;
      if (existing && existing.el === el) return;
      if (existing) {
        zones.delete(existing);
        zoneRef.current = null;
      }
      if (el) {
        const next: Zone = { el, handlersRef };
        zoneRef.current = next;
        zones.add(next);
      }
    },
    [],
  );
}

interface DragState {
  payload: string;
  clone: HTMLElement;
  offsetX: number;
  offsetY: number;
  currentZone: Zone | null;
  sourceEl: HTMLElement;
}

let dragState: DragState | null = null;

const LONG_PRESS_MS = 350;
const PRE_DRAG_CANCEL_PX = 8; // movement before long-press → user is scrolling, abort

function findZoneAt(x: number, y: number): Zone | null {
  // Take the clone out of the hit-test. `pointer-events: none` is not enough
  // on iPad Safari — `elementFromPoint` can still return the clone, which
  // makes the drop look like it "missed" and snap back to the source.
  // `display: none` removes it from layout entirely, which is reliable.
  const clone = dragState?.clone;
  let prevDisplay: string | undefined;
  if (clone) {
    prevDisplay = clone.style.display;
    clone.style.display = 'none';
  }
  // Use elementsFromPoint (plural) so we can see through overlays that sit
  // on top of buckets — e.g. the inbox backdrop (`inset: 0`, z-index 998)
  // covers the dashboard while the inbox panel is open, and would otherwise
  // intercept every drop. Walk the stack top-down until we hit a zone.
  const targets = document.elementsFromPoint(x, y);
  if (clone) {
    clone.style.display = prevDisplay ?? '';
  }
  for (const target of targets) {
    for (const z of zones) {
      if (z.el.contains(target)) return z;
    }
  }
  return null;
}

/**
 * Wire up a touch-driven drag for a source element. Call from `onTouchStart`.
 * - `payload` mirrors what `dataTransfer.setData('text/plain', ...)` would carry.
 * - Drag is gated by a long press; small movements within 350ms abort it so
 *   scrolling and taps still work normally.
 */
export function attachTouchDrag(
  payload: string,
  sourceEl: HTMLElement,
  startTouch: { clientX: number; clientY: number },
) {
  let started = false;
  const startX = startTouch.clientX;
  const startY = startTouch.clientY;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;

  const startActualDrag = () => {
    longPressTimer = null;
    started = true;

    const rect = sourceEl.getBoundingClientRect();
    const clone = sourceEl.cloneNode(true) as HTMLElement;
    clone.classList.add('touch-drag-clone');
    clone.removeAttribute('draggable');
    clone.style.position = 'fixed';
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.margin = '0';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '99999';
    clone.style.opacity = '0.92';
    clone.style.transform = 'scale(1.05)';
    clone.style.transition = 'none';
    document.body.appendChild(clone);

    dragState = {
      payload,
      clone,
      offsetX: startX - rect.left,
      offsetY: startY - rect.top,
      currentZone: null,
      sourceEl,
    };
    sourceEl.classList.add('touch-drag-source');

    try {
      navigator.vibrate?.(15);
    } catch {
      /* haptic not supported */
    }
  };

  const teardown = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onEnd);
    document.removeEventListener('touchcancel', onCancel);
    sourceEl.classList.remove('touch-drag-source');
    if (dragState) {
      dragState.currentZone?.handlersRef.current.onLeave?.();
      dragState.clone.remove();
      dragState = null;
    }
  };

  const onMove = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;

    if (!started) {
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (dx * dx + dy * dy > PRE_DRAG_CANCEL_PX * PRE_DRAG_CANCEL_PX) {
        // User started scrolling/swiping before long-press fired → abort.
        teardown();
      }
      return;
    }

    e.preventDefault(); // block native scroll once dragging
    if (!dragState) return;

    dragState.clone.style.left = `${t.clientX - dragState.offsetX}px`;
    dragState.clone.style.top = `${t.clientY - dragState.offsetY}px`;

    const newZone = findZoneAt(t.clientX, t.clientY);
    if (newZone !== dragState.currentZone) {
      dragState.currentZone?.handlersRef.current.onLeave?.();
      newZone?.handlersRef.current.onEnter?.();
      dragState.currentZone = newZone;
    }
  };

  const onEnd = (e: TouchEvent) => {
    if (started && dragState) {
      const t = e.changedTouches[0];
      // Prefer fresh hit-test, but fall back to the zone tracked during the
      // last touchmove — touchmove already proved the finger was over it
      // (visual highlight fired), so it's reliable when the final hit-test
      // misses for any reason.
      const hit = t ? findZoneAt(t.clientX, t.clientY) : null;
      const dropZone = hit ?? dragState.currentZone;
      // Clear hover state on whatever zone the cursor was last over.
      if (dragState.currentZone && dragState.currentZone !== dropZone) {
        dragState.currentZone.handlersRef.current.onLeave?.();
      }
      if (dropZone) {
        dropZone.handlersRef.current.onLeave?.();
        dropZone.handlersRef.current.onDrop(dragState.payload);
      }
      dragState.currentZone = null; // suppress duplicate leave in teardown
    }
    teardown();
  };

  const onCancel = () => teardown();

  longPressTimer = setTimeout(startActualDrag, LONG_PRESS_MS);

  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onEnd);
  document.addEventListener('touchcancel', onCancel);
}
