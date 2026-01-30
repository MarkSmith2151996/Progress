'use client';

import { ReactNode, useEffect } from 'react';

interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Popup({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 'md',
}: PopupProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div
        className={`popup-content w-full ${widthClasses[width]} mx-4`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div>
            <h2
              className="text-lg font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-tertiary"
            style={{ color: 'var(--text-muted)' }}
          >
            X
          </button>
        </div>

        {/* Content */}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
