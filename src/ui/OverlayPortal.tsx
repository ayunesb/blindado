import React from 'react';
import { createPortal } from 'react-dom';

export default function OverlayPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null;
  const host = document.getElementById('overlays') || document.body;
  return createPortal(children, host);
}
