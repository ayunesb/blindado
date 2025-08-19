// src/client/components/ProfileCard.tsx
import React from 'react';
import type { Protector } from '../data/profiles';
import { useHashRoute } from '../router';

export default function ProfileCard({ p }: { p: Protector }) {
  const { navigate } = useHashRoute();
  return (
    <button
      onClick={() => navigate('profile', { id: p.id })}
      className="relative w-[82%] min-w-[320px] max-w-[340px] aspect-[4/5] rounded-3xl overflow-hidden snap-center shrink-0"
      aria-label={`Open profile for ${p.name}`}
    >
      <img src={p.imageUrl} alt={p.name} className="absolute inset-0 w-full h-full object-cover object-top" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/0" />
      {/* Badge */}
      <img
        src="/brand/icons/shield.svg"
        aria-hidden
        className="absolute left-4 top-4 w-5 h-5 opacity-90"
      />
      {/* Copy */}
      <div className="absolute left-5 right-5 bottom-5">
        <h3 className="text-white text-[22px] font-semibold">{p.name}</h3>
        <p className="text-white/80 text-[14px] leading-5 max-w-[85%]">{p.subtitle}</p>
      </div>
    </button>
  );
}
