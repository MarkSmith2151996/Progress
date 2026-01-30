'use client';

import { useRef, useState, useCallback } from 'react';

interface LoadingSliderProps {
  label: string;
  value: number;
  min?: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  showGradient?: boolean;
}

export function LoadingSlider({
  label,
  value,
  min = 0,
  max,
  step = 1,
  unit = '',
  onChange,
  showGradient = false,
}: LoadingSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const percentage = ((value - min) / (max - min)) * 100;

  const handleInteraction = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const rawValue = pct * (max - min) + min;
      const newValue = Math.round(rawValue / step) * step;

      onChange(Math.max(min, Math.min(max, newValue)));
    },
    [max, min, step, onChange]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleInteraction(e.clientX);

    const handleMouseMove = (e: MouseEvent) => {
      handleInteraction(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    handleInteraction(e.touches[0].clientX);

    const handleTouchMove = (e: TouchEvent) => {
      handleInteraction(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  };

  const gradientStyle = showGradient
    ? {
        background: `linear-gradient(to right,
          var(--accent-error) 0%,
          var(--accent-warning) 50%,
          var(--accent-success) 100%)`,
      }
    : {
        backgroundColor: 'var(--accent-primary)',
      };

  return (
    <div className="mb-4">
      <div className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </div>
      <div
        ref={sliderRef}
        className={`h-6 rounded cursor-pointer relative select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-pointer'
        }`}
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Fill */}
        <div
          className="h-full rounded-l transition-all duration-75"
          style={{
            width: `${percentage}%`,
            ...gradientStyle,
            clipPath: `inset(0 ${100 - percentage}% 0 0)`,
          }}
        />

        {/* Full gradient background for gradient mode */}
        {showGradient && (
          <div
            className="absolute inset-0 rounded opacity-30"
            style={gradientStyle}
          />
        )}

        {/* Handle */}
        <div
          className="absolute top-0 h-full w-1 rounded transition-all duration-75"
          style={{
            left: `calc(${percentage}% - 2px)`,
            backgroundColor: 'var(--text-primary)',
            boxShadow: 'var(--glow)',
          }}
        />
      </div>
      <div
        className="text-xs text-center mt-1"
        style={{ color: 'var(--text-muted)' }}
      >
        {value}
        {unit && ` ${unit}`}
      </div>
    </div>
  );
}
