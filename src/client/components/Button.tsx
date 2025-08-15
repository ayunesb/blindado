// src/client/components/Button.tsx
import React from 'react';
import clsx from 'clsx';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  height?: 'lg' | 'md' | 'sm';
  rounded?: 'full' | 'lg' | 'md';
};

export default function Button({
  variant = 'primary',
  height = 'lg',
  rounded = 'full',
  className,
  ...rest
}: Props) {
  const base = 'inline-flex items-center justify-center w-full font-medium transition active:scale-[0.99]';
  const h = height === 'lg' ? 'h-16 text-[18px]' : height === 'md' ? 'h-12 text-[16px]' : 'h-10 text-[14px]';
  const r = rounded === 'full' ? 'rounded-[32px]' : rounded === 'lg' ? 'rounded-[28px]' : 'rounded-[20px]';
  const variants = {
    primary: 'bg-white text-black shadow-lg',
    secondary: 'bg-white/10 text-white',
    ghost: 'bg-transparent text-white border border-white/10',
  }[variant];

  return <button className={clsx(base, h, r, variants, className)} {...rest} />;
}
