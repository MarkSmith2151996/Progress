'use client';

import { memo } from 'react';
import { format } from 'date-fns';

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasData: boolean;
  completionRate: number;
  onClick: () => void;
}

export const DayCell = memo(function DayCell({
  date,
  isCurrentMonth,
  isToday,
  hasData,
  completionRate,
  onClick,
}: DayCellProps) {
  return (
    <button
      className="day-cell relative w-full h-full flex flex-col items-center justify-center rounded-sm transition-all hover:brightness-110"
      style={{
        color: isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)',
        backgroundColor: isToday
          ? 'var(--bg-tertiary)'
          : isCurrentMonth
          ? 'var(--bg-primary)'
          : 'transparent',
        border: isToday
          ? '2px solid var(--accent-primary)'
          : '1px solid var(--border-color)',
        boxShadow: isToday ? 'var(--glow)' : 'none',
        opacity: isCurrentMonth ? 1 : 0.5,
        minHeight: '48px',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <span className={`font-medium ${isToday ? 'text-base' : 'text-sm'}`}>
        {format(date, 'd')}
      </span>

      {/* Data indicator dot */}
      {hasData && (
        <span
          className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor:
              completionRate >= 0.7
                ? 'var(--accent-success)'
                : completionRate >= 0.4
                ? 'var(--accent-warning)'
                : 'var(--accent-error)',
          }}
        />
      )}
    </button>
  );
});
