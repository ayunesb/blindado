// src/client/components/BottomSheet.tsx
import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';

export default function BottomSheet({
  isOpen,
  onClose,
  children,
  ariaLabel = 'Bottom Sheet',
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);
  useEffect(() => { if (isOpen) ref.current?.focus(); }, [isOpen]);

  return isOpen ? (
    <div className={clsx('fixed inset-0 z-[70]')}> {/* above nav */}
      {/* Scrim */}
      <div className="absolute inset-0 z-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      {/* Sheet */}
      <section
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={clsx(
      'fixed z-10 left-1/2 bottom-0 -translate-x-1/2 w-full max-w-[540px] rounded-t-[28px] bg-[#0B0B0B]/95 text-white border-t border-white/20 shadow-2xl transition-transform duration-300 relative min-h-[40vh]',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        ref={ref}
        tabIndex={-1}
      >
        <div className="px-6 pt-3 pb-2">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-white/20" />
        </div>
        <div className="px-6 pb-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </section>
    </div>
  ) : null;
}
