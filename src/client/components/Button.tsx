// src/client/components/Button.tsx
import React from 'react';
import clsx from 'clsx';

type Common = {
  variant?: 'primary' | 'secondary' | 'ghost';
  height?: 'lg' | 'md' | 'sm';
  rounded?: 'full' | 'lg' | 'md';
};
type ButtonProps = Common & React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AnchorProps = Common & React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
type Props = ButtonProps | AnchorProps;

export default function Button(props: Props) {
  const { variant = 'primary', height = 'lg', rounded = 'full', className } = props;
  const base = 'inline-flex items-center justify-center w-full font-medium transition active:scale-[0.99] appearance-none focus:outline-none';
  const h = height === 'lg' ? 'h-16 text-[18px]' : height === 'md' ? 'h-12 text-[16px]' : 'h-10 text-[14px]';
  const r = rounded === 'full' ? 'rounded-[32px]' : rounded === 'lg' ? 'rounded-[28px]' : 'rounded-[20px]';
  const variants = {
    primary: 'bg-white text-black shadow-lg',
    secondary: 'bg-white/10 text-white',
    ghost: 'bg-transparent text-white border border-white/10',
  }[variant];

  const classes = clsx(base, h, r, variants, className);
  if ('href' in props && props.href) {
    const { href, children, ...rest } = props as AnchorProps;
    return (
      <a href={href} role="button" className={classes} {...rest}>
        {children}
      </a>
    );
  }
  const { children, ...rest } = props as ButtonProps;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
