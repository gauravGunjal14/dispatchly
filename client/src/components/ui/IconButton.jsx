'use client';

import React from 'react';

export function IconButton({
  icon: Icon,
  label,
  size = 'md',
  variant = 'ghost',
  disabled = false,
  onClick,
  className = '',
  ...props
}) {
  const sizeStyles = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-10 h-10 p-2',
    lg: 'w-12 h-12 p-2.5',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const variantStyles = {
    ghost: 'bg-transparent hover:bg-concrete text-ink border border-transparent',
    outline: 'bg-white hover:bg-concrete border border-line text-ink',
    secondary: 'bg-ink hover:bg-ink/90 text-white',
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-control transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.ghost} ${className}`}
      {...props}
    >
      <Icon className={iconSizes[size] || iconSizes.md} strokeWidth={1.75} />
    </button>
  );
}

export function Tooltip({ text, children, position = 'top' }) {
  const [visible, setVisible] = React.useState(false);

  const posStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`absolute z-50 whitespace-nowrap px-2.5 py-1 text-xs text-white bg-ink rounded-control shadow-floating pointer-events-none ${posStyles[position] || posStyles.top}`}
        >
          {text}
        </div>
      )}
    </div>
  );
}
