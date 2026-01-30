'use client';

import { memo, useCallback } from 'react';
import { format, isSameMonth, isToday } from 'date-fns';
import { DayCell } from './DayCell';

interface WeekRowProps {
  days: Date[];
  weekNumber: number;
  weekColor: string;
  currentMonth: Date;
  onDayClick: (date: string) => void;
  onWeekClick: () => void;
  dayData: Record<string, { hasData: boolean; completionRate: number }>;
}

export const WeekRow = memo(function WeekRow({
  days,
  weekNumber,
  weekColor,
  currentMonth,
  onDayClick,
  onWeekClick,
  dayData,
}: WeekRowProps) {
  const handleRowClick = useCallback((e: React.MouseEvent) => {
    // Only trigger week click if clicking on the row background, not a day
    if ((e.target as HTMLElement).closest('.day-cell')) return;
    onWeekClick();
  }, [onWeekClick]);

  return (
    <div
      className="relative rounded cursor-pointer group flex-1"
      style={{
        backgroundColor: `${weekColor}15`,
        border: `1px solid ${weekColor}30`,
      }}
      onClick={handleRowClick}
    >
      {/* Week indicator on hover */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: weekColor }}
      />

      <div className="grid grid-cols-7 gap-1 p-1.5 h-full">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const data = dayData[dateStr];

          return (
            <DayCell
              key={dateStr}
              date={day}
              isCurrentMonth={isSameMonth(day, currentMonth)}
              isToday={isToday(day)}
              hasData={data?.hasData || false}
              completionRate={data?.completionRate || 0}
              onClick={() => onDayClick(dateStr)}
            />
          );
        })}
      </div>
    </div>
  );
});
