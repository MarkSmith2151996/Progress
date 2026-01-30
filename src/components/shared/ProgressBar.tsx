'use client';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'accent' | 'success' | 'warning' | 'error';
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  size = 'md',
  color = 'accent',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6',
  };

  const colorClasses = {
    accent: 'bg-accent-primary',
    success: 'bg-accent-success',
    warning: 'bg-accent-warning',
    error: 'bg-accent-error',
  };

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-secondary">{label}</span>
          {showPercentage && (
            <span className="text-sm text-muted">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div
        className={`w-full bg-tertiary rounded-theme overflow-hidden ${sizeClasses[size]}`}
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <div
          className={`${sizeClasses[size]} transition-all duration-300 ease-out`}
          style={{
            width: `${percentage}%`,
            backgroundColor: `var(--${color === 'accent' ? 'accent-primary' : `accent-${color}`})`,
          }}
        />
      </div>
    </div>
  );
}
