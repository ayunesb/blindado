// src/client/screens/ProfileScreen.tsx
import React from 'react';
import { PROTECTORS } from '../data/profiles';
import Button from '../components/Button';
import { navigate } from '../router';

export default function ProfileScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const p = PROTECTORS.find((x) => x.id === id);
  if (!p)
    return (
      <div className="p-6 text-white">
        <p>Profile not found.</p>
        <div className="mt-4">
          <Button variant="secondary" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>
    );

  return (
    <div className="fixed inset-0 z-50 bg-black text-white overflow-y-auto">
      <header className="sticky top-0 z-10 bg-black/60 backdrop-blur px-6 py-4 flex items-center gap-3">
        <button aria-label="Back" onClick={onBack} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/80 hover:text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
            <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <h1 className="text-[24px] font-semibold">{p.name}</h1>
      </header>

  <div className="app-wrap pb-28">
        <div className="mt-4 overflow-hidden rounded-3xl aspect-[4/5]">
          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
        </div>

        <p className="mt-4 text-white/80">{p.subtitle}</p>

        <div className="h-20" />
        <div className="sticky bottom-0 py-3 bg-gradient-to-t from-black to-transparent">
          <Button className="w-full h-14 rounded-[28px] text-black bg-white" onClick={() => navigate('book', { pid: p.id })}>Book this Protector</Button>
          <div className="pb-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </div>
  );
}
