import { useCallback } from 'react';

interface UseDragResizeOptions {
  /** Which axis the drag moves along */
  axis: 'x' | 'y';
  /** Flip the sign of the delta (e.g. dragging up should increase panel height) */
  invert?: boolean;
  /** Read the value at the moment the drag starts */
  getValue: () => number;
  /** Apply the new value on every move */
  setValue: (value: number) => void;
}

/**
 * Unified mouse + touch + pen resize handler using the Pointer Events API.
 *
 * Why this matters on mobile: a plain `onMouseDown` handler never fires for
 * touch at all, and even a naive touch handler loses the drag the instant a
 * finger moves off a thin (e.g. 4px) handle. `setPointerCapture` keeps every
 * subsequent move/up event routed to the handle regardless of where the
 * finger physically wanders, so a touch-drag feels as reliable as a mouse-drag.
 */
export function useDragResize({ axis, invert = false, getValue, setValue }: UseDragResizeOptions) {
  return useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      // Only primary button/touch/pen contact starts a drag
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();

      const target = e.currentTarget;
      const startPos = axis === 'x' ? e.clientX : e.clientY;
      const startValue = getValue();

      target.setPointerCapture(e.pointerId);
      target.classList.add('resize-handle-active');
      document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
      document.body.style.touchAction = 'none';

      function handleMove(ev: PointerEvent) {
        const pos = axis === 'x' ? ev.clientX : ev.clientY;
        let delta = pos - startPos;
        if (invert) delta = -delta;
        setValue(startValue + delta);
      }

      function handleUp(ev: PointerEvent) {
        try {
          target.releasePointerCapture(ev.pointerId);
        } catch {
          // capture may already be released; safe to ignore
        }
        target.classList.remove('resize-handle-active');
        target.removeEventListener('pointermove', handleMove);
        target.removeEventListener('pointerup', handleUp);
        target.removeEventListener('pointercancel', handleUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.style.touchAction = '';
      }

      target.addEventListener('pointermove', handleMove);
      target.addEventListener('pointerup', handleUp);
      target.addEventListener('pointercancel', handleUp);
    },
    [axis, invert, getValue, setValue]
  );
}
