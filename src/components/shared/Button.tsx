'use client';

import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  className = '',
}: ButtonProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantStyles = {
    primary: {
      backgroundColor: 'var(--accent-primary)',
      color: 'var(--bg-primary)',
      border: '1px solid var(--accent-primary)',
    },
    secondary: {
      backgroundColor: 'var(--bg-tertiary)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-color)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid transparent',
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        rounded transition-all duration-200
        hover:opacity-80 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      style={variantStyles[variant]}
    >
      {children}
    </button>
  );
}
