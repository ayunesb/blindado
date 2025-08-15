// src/client/components/fields/DateField.tsx
import React from 'react';

export default function DateField({
  label,
  value,
  onChange,
  min,
  error,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  error?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-white text-[18px] font-medium mb-2">{label}</label>
      <div className={`h-[84px] rounded-2xl border px-5 flex items-center ${error ? 'border-red-500/70 bg-red-500/5' : 'bg-white/6 border-white/8 focus-within:ring-2 focus-within:ring-white/20'}`}>
        {icon && <div className="text-white/80 mr-3">{icon}</div>}
        <input
          type="date"
          className="w-full bg-transparent outline-none text-white placeholder:text-white/60 text-[16px]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
        />
      </div>
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
}
