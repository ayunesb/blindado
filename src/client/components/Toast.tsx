// src/client/components/Toast.tsx
import React, { useEffect } from 'react';
import clsx from 'clsx';

export default function Toast({
  open,
  message,
  onClose,
  duration = 2500,
}: {
  open: boolean;
  message: string;
  onClose: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [open, onClose, duration]);

  return (
    <div
      className={clsx(
        'fixed left-1/2 -translate-x-1/2 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[60] transition-all',
        open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}
      role="status"
      aria-live="polite"
    >
      <div className="rounded-2xl bg-white text-black px-4 py-3 shadow-xl text-[14px]">{message}</div>
    </div>
  );
}
