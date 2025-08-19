// src/client/components/Modal.tsx
import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import Portal from './Portal';

export default function Modal({
  open,
  onClose,
  children,
  ariaLabel = 'Dialog',
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <Portal>
      {/* Scrim */}
      <div
        className={clsx('fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity z-50 opacity-100')}
        style={{ zIndex: 2147483647 }}
        onClick={onClose}
        aria-hidden
        data-testid="modal-scrim"
      />
      {/* Dialog container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        data-testid="modal"
        className={clsx('fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-auto')}
        style={{ zIndex: 2147483647 }}
      >
        <div
          ref={ref}
          tabIndex={-1}
          className={clsx(
            'w-[92%] max-w-[360px] rounded-3xl bg-[#0E0E0E] border border-white/10 p-6 shadow-2xl'
          )}
        >
          {children}
        </div>
      </div>
    </Portal>
  );
}
