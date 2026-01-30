'use client';

import { useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
} from 'date-fns';
import { WeekRow } from './WeekRow';
import { useSettingsStore } from '@/stores/settingsStore';

interface MonthCalendarProps {
  onDayClick: (date: string) => void;
  onWeekClick: (weekId: string, weekStart: string, weekEnd: string) => void;
  onMonthlyGoalsClick: () => void;
  onSettingsClick: () => void;
  dayData?: Record<string, { hasData: boolean; completionRate: number }>;
}

export function MonthCalendar({
  onDayClick,
  onWeekClick,
  onMonthlyGoalsClick,
  onSettingsClick,
  dayData = {},
}: MonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { week_colors } = useSettingsStore();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div
      className="rounded p-4 h-full flex flex-col"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={goToPrevMonth}
            className="w-8 h-8 flex items-center justify-center rounded hover:opacity-80"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-tertiary)',
            }}
          >
            ◀
          </button>
          <button
            onClick={goToNextMonth}
            className="w-8 h-8 flex items-center justify-center rounded hover:opacity-80"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-tertiary)',
            }}
          >
            ▶
          </button>
          <button
            onClick={onMonthlyGoalsClick}
            className="w-8 h-8 flex items-center justify-center rounded hover:opacity-80 ml-2"
            style={{
              color: 'var(--accent-primary)',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--accent-primary)',
            }}
            title="Monthly Goals"
          >
            M
          </button>
          <button
            onClick={onSettingsClick}
            className="w-8 h-8 flex items-center justify-center rounded hover:opacity-80"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
            }}
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2 flex-shrink-0">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium py-2"
            style={{ color: 'var(--text-muted)' }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Weeks - fills remaining space */}
      <div className="flex-1 flex flex-col gap-1">
        {weeks.map((weekDays, weekIndex) => {
          const weekNumber = weekIndex + 1;
          const weekColor = week_colors[String(weekNumber)] || '#4a4a4a';
          const weekStart = format(weekDays[0], 'yyyy-MM-dd');
          const weekEnd = format(weekDays[6], 'yyyy-MM-dd');
          const weekId = `${format(currentMonth, 'yyyy')}-W${String(weekNumber).padStart(2, '0')}`;

          return (
            <WeekRow
              key={weekIndex}
              days={weekDays}
              weekNumber={weekNumber}
              weekColor={weekColor}
              currentMonth={currentMonth}
              onDayClick={onDayClick}
              onWeekClick={() => onWeekClick(weekId, weekStart, weekEnd)}
              dayData={dayData}
            />
          );
        })}
      </div>
    </div>
  );
}
