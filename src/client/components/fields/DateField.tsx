// src/client/components/fields/DateField.tsx
import React from 'react';

export default function DateField({
  label,
  value,
  onChange,
  min,
  error,
  icon,
  id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  error?: string;
  icon?: React.ReactNode;
  id?: string;
}) {
  const autoId = React.useId();
  const inputId = id || `date-${autoId}`;
  return (
    <div>
      <label htmlFor={inputId} className="block text-white text-[18px] font-medium mb-2">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 icon-dark">{icon}</span>}
        <input
          type="date"
          className={`input-dark appearance-none ${icon ? 'pl-10' : ''} ${error ? 'border-red-500/70 bg-red-500/5' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          id={inputId}
          min={min}
        />
      </div>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}
