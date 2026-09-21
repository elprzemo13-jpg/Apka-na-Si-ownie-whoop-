import { useEffect, type ReactNode } from "react";
import { t } from "../../lib/i18n/pl";

type Props = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

/** Bottom sheet. Closes on backdrop tap; locks page scroll while open. */
export function Sheet({ title, open, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-end bg-black/70"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="mx-auto max-h-[92vh] w-full max-w-app overflow-y-auto rounded-t-[20px] border-t border-line bg-sheet px-4 pb-[calc(120px+env(safe-area-inset-bottom))]"
      >
        <div className="sticky top-0 z-3 mb-3.5 flex items-center justify-between border-b border-line bg-sheet pt-4 pb-3.5">
          <span className="font-head text-[22px] font-bold tracking-[0.8px] uppercase">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-tap w-tap items-center justify-center text-[22px] text-dim"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
