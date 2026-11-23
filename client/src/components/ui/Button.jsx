'use client';

import React from 'react';

/**
 * Universal Button component
 * Radii: exactly 6px (control radius)
 * Focus: 2px ink with 2px offset
 * Strictly sentence case
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  className = '',
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-colors select-none rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 h-8',
    md: 'text-sm px-4 py-2 gap-2 h-10',
    lg: 'text-base px-5 py-2.5 gap-2.5 h-12',
  };

  const variantStyles = {
    // Primary: Signal amber fill + ink text
    primary: 'bg-amber hover:bg-amber-hover active:bg-amber-active text-ink font-semibold',
    // Secondary: Ink fill + white text
    secondary: 'bg-ink hover:bg-ink/90 active:bg-black text-white font-semibold',
    // Outline: White fill + line border + ink text
    outline: 'bg-white hover:bg-concrete border border-line text-ink font-medium',
    // Ghost: Transparent + hover concrete
    ghost: 'bg-transparent hover:bg-concrete text-ink font-medium',
    // Danger: Danger tint/border + danger text
    danger: 'bg-status-danger-tint hover:bg-status-danger/20 border border-status-danger text-status-danger-text font-semibold',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : LeftIcon ? (
        <LeftIcon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
      ) : null}
      <span>{children}</span>
      {RightIcon && !loading ? <RightIcon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} /> : null}
    </button>
  );
}
