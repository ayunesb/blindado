// src/client/components/fields/DurationField.tsx
import React, { useState } from 'react';
import clsx from 'clsx';

export default function DurationField({
  valueHours,
  onChange,
  min = 2,
  max = 24,
  presets = [2, 4, 8, 'Custom'],
  label = 'Duration of Protection',
  error,
  testId,
}: {
  valueHours: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  presets?: (number | 'Custom')[];
  label?: string;
  error?: string;
  testId?: string;
}) {
  const [custom, setCustom] = useState(false);

  return (
    <div>
      <label className="block text-white text-[18px] font-medium mb-2">{label}</label>
      <div className={`rounded-2xl border px-5 py-5 ${error ? 'border-red-500/70 bg-red-500/5' : 'bg-white/6 border-white/8'}`}>
        <div className="flex gap-2 flex-wrap">
          {presets.map((p) => {
            const isCustom = p === 'Custom';
            const selected = !isCustom && valueHours === p;
            return (
              <button
                key={String(p)}
                type="button"
                className={clsx(
                  'h-10 px-4 rounded-2xl border text-[14px] appearance-none focus:outline-none',
                  selected ? 'bg-white text-black border-transparent' : 'text-white/80 border-white/15'
                )}
                onClick={() => {
                  if (isCustom) setCustom(true);
                  else {
                    setCustom(false);
                    onChange(p as number);
                  }
                }}
                data-testid={typeof p === 'number' ? `duration-${p}` : 'duration-custom'}
              >
                {isCustom ? 'Custom' : `${p}h`}
              </button>
            );
          })}
        </div>
        {custom && (
          <div className="mt-4 flex items-center gap-3">
            <input
              type="number"
              min={min}
              max={max}
              value={valueHours}
              onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value || min))))}
              className="w-24 h-12 rounded-xl bg-white/10 border border-white/15 text-white text-[16px] px-3 outline-none input-dark appearance-none"
                data-testid={testId ? `${testId}-custom-input` : undefined}
            />
            <span className="text-white/70">hours</span>
          </div>
        )}
      </div>
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
}
