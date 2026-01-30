'use client';

import { AlertLevel } from '@/types';

interface AlertProps {
  level: AlertLevel;
  message: string;
  onDismiss?: () => void;
}

export function Alert({ level, message, onDismiss }: AlertProps) {
  const levelStyles = {
    critical: {
      border: 'var(--accent-error)',
      bg: 'rgba(255, 68, 68, 0.1)',
      icon: '!',
    },
    warning: {
      border: 'var(--accent-warning)',
      bg: 'rgba(255, 170, 0, 0.1)',
      icon: '!',
    },
    info: {
      border: 'var(--accent-primary)',
      bg: 'rgba(0, 255, 0, 0.05)',
      icon: 'i',
    },
    positive: {
      border: 'var(--accent-success)',
      bg: 'rgba(0, 255, 0, 0.1)',
      icon: '+',
    },
  };

  const style = levelStyles[level];

  return (
    <div
      className="flex items-start gap-3 p-3 rounded mb-2 animate-fadeIn"
      style={{
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
      }}
    >
      <span
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold"
        style={{
          backgroundColor: style.border,
          color: 'var(--bg-primary)',
        }}
      >
        {style.icon}
      </span>
      <p className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {message}
      </p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-sm opacity-50 hover:opacity-100"
          style={{ color: 'var(--text-muted)' }}
        >
          x
        </button>
      )}
    </div>
  );
}
