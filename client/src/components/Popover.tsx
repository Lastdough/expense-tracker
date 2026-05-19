import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode, RefObject } from 'react';

interface PopoverProps {
  readonly open: boolean;
  readonly anchorRef: RefObject<HTMLElement | null>;
  readonly onClose: () => void;
  readonly placement?: 'bottom-start' | 'bottom-end';
  readonly children: ReactNode;
}

/**
 * Anchored floating panel. Renders into a portal at document.body so it can
 * escape any clipping ancestor, positioned with `position: fixed` against the
 * viewport. Flips above when it would clip the bottom.
 */
export function Popover({ open, anchorRef, onClose, placement = 'bottom-start', children }: PopoverProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const a = anchor.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const fitsBelow = a.bottom + p.height + 8 <= vh;
    const top = fitsBelow ? a.bottom + 6 : Math.max(8, a.top - p.height - 6);
    let left = placement === 'bottom-end' ? a.right - p.width : a.left;
    left = Math.max(8, Math.min(left, vw - p.width - 8));
    setPos({ top, left });
  }, [open, placement, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      const a = anchor.getBoundingClientRect();
      const p = panel.getBoundingClientRect();
      const vh = window.innerHeight;
      const fitsBelow = a.bottom + p.height + 8 <= vh;
      const top = fitsBelow ? a.bottom + 6 : Math.max(8, a.top - p.height - 6);
      let left = placement === 'bottom-end' ? a.right - p.width : a.left;
      left = Math.max(8, Math.min(left, window.innerWidth - p.width - 8));
      setPos({ top, left });
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, placement, anchorRef]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        zIndex: 60,
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
