// src/client/components/BottomSheet.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import Portal from './Portal';

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

  // Prevent background scroll and iOS fixed-position quirks while open
  useEffect(() => {
    if (!isOpen) return;
    const { body } = document;
    const scrollY = window.scrollY;
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      touchAction: (body.style as CSSStyleDeclaration & { touchAction?: string }).touchAction || '',
    };
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    (body.style as CSSStyleDeclaration & { touchAction?: string }).touchAction = 'none';
    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      (body.style as CSSStyleDeclaration & { touchAction?: string }).touchAction = prev.touchAction;
      // Restore scroll
      window.scrollTo(0, Math.abs(parseInt(prev.top || '0', 10)) || scrollY);
    };
  }, [isOpen]);
  // Auto-detect portal rendering issues and fall back to inline if needed
  const [forceInline, setForceInline] = useState(false);
  const qpNoPortal = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('noportal');
  }, []);
  useEffect(() => {
    if (!isOpen) return;
    const host = typeof document !== 'undefined' ? document.getElementById('overlays') : null;
    // If no host, force inline
    if (!host) {
      setForceInline(true);
      return;
    }
    // After a tick, check size/visibility; if hidden, force inline
    const id = window.setTimeout(() => {
      const el = ref.current?.closest('#overlays') as HTMLElement | null;
      const target = el || host;
      if (target) {
        const rect = target.getBoundingClientRect();
        const cs = getComputedStyle(target);
        if (
          rect.width === 0 ||
          rect.height === 0 ||
          cs.display === 'none' ||
          cs.visibility === 'hidden'
        ) {
          setForceInline(true);
        }
      }
    }, 50);
    return () => window.clearTimeout(id);
  }, [isOpen]);
  const noPortal = qpNoPortal || forceInline;

  const sheet = (
    <div className={clsx('fixed inset-0 z-[999] flex items-end justify-center')} style={{ zIndex: 2147483647 }}>
      {/* Scrim */}
      <div
        className="absolute inset-0 z-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
        data-testid="bottom-sheet-scrim"
      />
      {/* Sheet */}
  <section
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        data-testid="bottom-sheet"
        className={clsx(
      'relative z-10 w-full max-w-[540px] rounded-t-[28px] bg-[#121212] text-white border border-white/25 shadow-2xl min-h-[40vh]')}
        ref={ref}
        tabIndex={-1}
      >
  <div className="px-6 pt-3 pb-2">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-white/20" />
        </div>
  <div className="px-6 pb-4 space-y-4 max-h-[70vh] overflow-y-auto w-full">
          {children}
        </div>
      </section>
    </div>
  );

  if (!isOpen) return null;
  return noPortal ? sheet : (<Portal>{sheet}</Portal>);
}
