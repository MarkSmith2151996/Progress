'use client';

import { useState } from 'react';
import styled, { css } from 'styled-components';
import { Button, Separator } from 'react95';
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
import { useSettingsStore } from '@/stores/settingsStore';

// Windows 95 3D border effects
const raised3D = css`
  border-top: 2px solid #ffffff;
  border-left: 2px solid #ffffff;
  border-right: 2px solid #808080;
  border-bottom: 2px solid #808080;
  box-shadow: inset 1px 1px 0 #dfdfdf, 1px 1px 0 #000000;
`;

const sunken3D = css`
  border-top: 2px solid #808080;
  border-left: 2px solid #808080;
  border-right: 2px solid #ffffff;
  border-bottom: 2px solid #ffffff;
  box-shadow: inset 1px 1px 0 #000000;
`;

const CalendarContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const MonthTitle = styled.span`
  font-weight: bold;
  font-size: 14px;
  font-family: 'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif;
`;

const NavButtons = styled.div`
  display: flex;
  gap: 2px;
`;

// Sunken panel for the calendar grid (like Minesweeper field)
const CalendarGrid = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  ${sunken3D}
  background: #c0c0c0;
  padding: 2px;
`;

const DayHeaders = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #c0c0c0;
  padding: 2px;
`;

const DayHeader = styled.div`
  text-align: center;
  font-weight: bold;
  font-size: 11px;
  padding: 2px 4px;
  font-family: 'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif;
  color: #000080;
`;

const WeeksContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: #808080;
  padding: 1px;
`;

const WeekRow = styled.div<{ $color: string }>`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  cursor: pointer;
  flex: 1;
  min-height: 40px;
  background: ${(props) => props.$color}15;
  position: relative;

  &:hover {
    background: ${(props) => props.$color}30;
  }

  /* Subtle week color indicator on the left edge */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: ${(props) => props.$color};
  }
`;

const DayCell = styled.button<{ $isCurrentMonth: boolean; $isToday: boolean; $hasData: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2px;
  font-size: 12px;
  font-family: 'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif;
  cursor: pointer;
  position: relative;
  min-height: 32px;

  /* Default raised button look */
  background: ${(props) => props.$isCurrentMonth ? '#c0c0c0' : '#a0a0a0'};
  color: ${(props) => props.$isCurrentMonth ? '#000000' : '#606060'};
  ${(props) => props.$isToday ? sunken3D : raised3D}

  /* Today gets special styling - pressed/sunken look with highlight */
  ${(props) => props.$isToday && css`
    background: #000080;
    color: #ffffff;
  `}

  &:hover {
    ${(props) => !props.$isToday && css`
      background: #d4d4d4;
    `}
    ${(props) => props.$isToday && css`
      background: #0000a0;
    `}
  }

  &:active {
    ${sunken3D}
    background: #a0a0a0;
  }
`;

const DayNumber = styled.span`
  font-weight: bold;
`;

const DataIndicator = styled.span<{ $color: string }>`
  position: absolute;
  bottom: 3px;
  right: 3px;
  width: 8px;
  height: 8px;
  ${raised3D}
  background: ${(props) => props.$color};
`;

interface MonthCalendar95Props {
  onDayClick: (date: string) => void;
  onWeekClick: (weekId: string, weekStart: string, weekEnd: string) => void;
  dayData?: Record<string, { hasData: boolean; completionRate: number }>;
}

export function MonthCalendar95({
  onDayClick,
  onWeekClick,
  dayData = {},
}: MonthCalendar95Props) {
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

  const getCompletionColor = (rate: number) => {
    if (rate >= 0.7) return '#00aa00';
    if (rate >= 0.4) return '#aaaa00';
    return '#aa0000';
  };

  return (
    <CalendarContainer>
      <Header>
        <MonthTitle>{format(currentMonth, 'MMMM yyyy')}</MonthTitle>
        <NavButtons>
          <Button size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            {'◀'}
          </Button>
          <Button size="sm" onClick={() => setCurrentMonth(new Date())}>
            Today
          </Button>
          <Button size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            {'▶'}
          </Button>
        </NavButtons>
      </Header>

      <Separator />

      <CalendarGrid>
        <DayHeaders>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <DayHeader key={day}>{day}</DayHeader>
          ))}
        </DayHeaders>

        <WeeksContainer>
          {weeks.map((weekDays, weekIndex) => {
            const weekNumber = weekIndex + 1;
            const weekColor = week_colors[String(weekNumber)] || '#808080';
            const weekStart = format(weekDays[0], 'yyyy-MM-dd');
            const weekEnd = format(weekDays[6], 'yyyy-MM-dd');
            const weekId = `${format(currentMonth, 'yyyy')}-W${String(weekNumber).padStart(2, '0')}`;

            return (
              <WeekRow
                key={weekIndex}
                $color={weekColor}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  onWeekClick(weekId, weekStart, weekEnd);
                }}
              >
                {weekDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const data = dayData[dateStr];

                  return (
                    <DayCell
                      key={dateStr}
                      $isCurrentMonth={isSameMonth(day, currentMonth)}
                      $isToday={isToday(day)}
                      $hasData={data?.hasData || false}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDayClick(dateStr);
                      }}
                    >
                      <DayNumber>{format(day, 'd')}</DayNumber>
                      {data?.hasData && (
                        <DataIndicator $color={getCompletionColor(data.completionRate)} />
                      )}
                    </DayCell>
                  );
                })}
              </WeekRow>
            );
          })}
        </WeeksContainer>
      </CalendarGrid>
    </CalendarContainer>
  );
}
