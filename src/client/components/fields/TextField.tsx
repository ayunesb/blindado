// src/client/components/fields/TextField.tsx
import React from 'react';

export default function TextField({
  label,
  placeholder,
  value,
  onChange,
  error,
  icon,
  id,
  testId,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  icon?: React.ReactNode;
  id?: string;
  testId?: string;
}) {
  const autoId = React.useId();
  const inputId = id || `text-${autoId}`;
  return (
    <div>
      <label htmlFor={inputId} className="block text-white text-[18px] font-medium mb-2">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 icon-dark">{icon}</span>}
        <input
          type="text"
          inputMode="text"
          className={`input-dark ${icon ? 'pl-10' : ''} ${error ? 'border-red-500/70 bg-red-500/5' : ''}`}
          placeholder={placeholder}
          value={value}
          id={inputId}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testId}
        />
      </div>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}
