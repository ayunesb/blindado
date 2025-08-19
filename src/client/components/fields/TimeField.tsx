// src/client/components/fields/TimeField.tsx
import React from 'react';

export default function TimeField({
  label,
  value,
  onChange,
  step = 900,
  error,
  icon,
  id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: number;
  error?: string;
  icon?: React.ReactNode;
  id?: string;
}) {
  const autoId = React.useId();
  const inputId = id || `time-${autoId}`;
  return (
    <div>
      <label htmlFor={inputId} className="block text-white text-[18px] font-medium mb-2">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 icon-dark">{icon}</span>}
        <input
          type="time"
          className={`input-dark appearance-none ${icon ? 'pl-10' : ''} ${error ? 'border-red-500/70 bg-red-500/5' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          id={inputId}
          step={step}
        />
      </div>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}
