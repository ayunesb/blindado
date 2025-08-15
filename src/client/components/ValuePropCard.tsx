// src/client/components/ValuePropCard.tsx
import React from 'react';

export default function ValuePropCard({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 h-[92px] rounded-2xl bg-white/5 border border-white/8 px-4">
      <div className="w-[56px] h-[56px] rounded-xl bg-white/5 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-white text-[18px] font-medium">{title}</div>
        <div className="text-white/70 text-[15px] leading-5 line-clamp-2">{subtitle}</div>
      </div>
    </div>
  );
}
