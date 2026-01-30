'use client';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const baseClasses = 'skeleton';
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-sm',
  };
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const style: React.CSSProperties = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1em' : undefined),
    backgroundColor: 'var(--bg-tertiary)',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
}

// Pre-built skeleton layouts
export function CalendarSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton width={150} height={24} />
        <div className="flex gap-2">
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="circular" width={32} height={32} />
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} height={20} />
        ))}
      </div>

      {/* Week rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, j) => (
            <Skeleton key={j} variant="rectangular" height={48} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CoachSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <Skeleton width={120} height={20} />

      {/* Summary box */}
      <div
        className="p-3 rounded space-y-2"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <Skeleton width="80%" height={16} />
        <Skeleton width="60%" height={16} />
        <Skeleton width="70%" height={16} />
        <Skeleton width="50%" height={16} />
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Skeleton height={14} />
        <Skeleton width="80%" height={14} />
      </div>
    </div>
  );
}

export function PopupSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <Skeleton width={180} height={24} />

      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton width={100} height={32} />
        <Skeleton width={80} height={32} />
        <Skeleton width={60} height={32} />
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Skeleton height={40} />
        <Skeleton height={40} />
        <Skeleton height={40} />
      </div>
    </div>
  );
}
