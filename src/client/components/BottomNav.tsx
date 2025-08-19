// src/client/components/BottomNav.tsx
import React from 'react';
import clsx from 'clsx';
import type { Route } from '../router';

type Tab = { key: Route | 'protector'; label: string; icon: React.ReactNode };

const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden className="shrink-0">
    <path d="M12 2l7 3v6c0 5-3.2 9.2-7 11-3.8-1.8-7-6-7-11V5l7-3z" fill="currentColor" />
  </svg>
);
const BookingsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
    <path d="M6 2h9a3 3 0 013 3v15l-7.5-3L3 20V5a3 3 0 013-3z" fill="currentColor" />
  </svg>
);
const AccountIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
    <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5C21 16.5 17 14 12 14z" fill="currentColor" />
  </svg>
);

export default function BottomNav({
  active,
  onChange,
}: {
  active: Route;
  onChange: (r: Route) => void;
}) {
  const tabs: Tab[] = [
    { key: 'protector', label: 'Protector', icon: <ShieldIcon /> },
    { key: 'bookings', label: 'Bookings', icon: <BookingsIcon /> },
    { key: 'account', label: 'Account', icon: <AccountIcon /> },
  ];

  return (
    <nav
      className="fixed z-40 left-1/2 -translate-x-1/2 bottom-[max(12px,env(safe-area-inset-bottom))] w-[92%] max-w-[420px] h-16 px-2 rounded-[28px] bg-white/10 backdrop-blur-md border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,.5)]"
      role="navigation"
      aria-label="Primary"
    >
      <ul className="flex items-center justify-between gap-2 h-full">
        {tabs.map((t) => {
          const isActive = (t.key === 'protector' && active === 'home') || t.key === active;
          return (
            <li key={t.key}>
              <button
                className={clsx(
                  'min-w-[72px] h-12 px-3 rounded-2xl flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/30',
                  isActive ? 'text-white bg-white/10' : 'text-white/50'
                )}
                onClick={() => onChange(t.key === 'protector' ? 'home' : (t.key as Route))}
              >
                {t.icon}
                <span className="text-[11px] mt-0.5">{t.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
