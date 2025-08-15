// src/client/components/BottomSheet.tsx
import React, { useEffect } from 'react';
import clsx from 'clsx';

export default function BottomSheet({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Scrim */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity z-40',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden
      />
      {/* Sheet */}
      <section
        role="dialog"
        aria-modal="true"
        className={clsx(
          'fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] bg-[#0B0B0B] border-t border-white/8 shadow-2xl transition-transform duration-300',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="w-full h-6 flex items-center justify-center">
          <div className="w-12 h-1.5 rounded-full bg-white/20 mt-2" />
        </div>
        <div className="max-h-[calc(88vh-24px)] overflow-y-auto pb-[calc(16px+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </section>
    </>
  );
}
