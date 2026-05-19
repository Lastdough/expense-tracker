import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface BottomSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}

/**
 * Mobile bottom-dock sheet. Backdrop scrim + slide-up panel. No animation — the
 * `motion/react` adoption pass is tracked separately in design-todos.
 */
export function BottomSheet({ open, onClose, title, children, footer }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-ink/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-paper rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="pt-2.5 pb-1 flex justify-center">
          <div className="w-9 h-1 rounded-full bg-line" />
        </div>
        {title && (
          <div className="px-4 pt-1 pb-3 flex items-center justify-between border-b border-line">
            <div className="text-[13px] font-semibold">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="text-[12px] text-ink-3 hover:text-ink"
            >
              Close
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-line">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * `(max-width: 767px)` matchMedia hook. Returns true on phone-width viewports.
 * SSR-safe: defaults to false, then syncs on mount.
 */
export function useIsMobile(): boolean {
  const [matches, setMatches] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(max-width: 767px)');
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  return matches;
}
