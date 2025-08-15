// src/client/components/Modal.tsx
import React, { useEffect } from 'react';
import clsx from 'clsx';

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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity z-50',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={clsx(
          'fixed inset-0 z-50 flex items-center justify-center p-6',
          open ? 'pointer-events-auto' : 'pointer-events-none'
        )}
      >
        <div
          className={clsx(
            'w-[92%] max-w-[360px] rounded-3xl bg-[#0E0E0E] border border-white/10 p-6 shadow-2xl transform transition duration-200',
            open ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          )}
        >
          {children}
        </div>
      </div>
    </>
  );
}
