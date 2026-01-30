'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
  AppBar,
  Toolbar,
} from 'react95';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { useRouter } from 'next/navigation';
import { useLogStore } from '@/stores/logStore';

const MobileContainer = styled.div`
  padding: 8px;
  padding-bottom: 70px;
`;

const MonthNav = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
`;

const MonthTitle = styled.span`
  font-size: 16px;
  font-weight: bold;
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
`;

const DayHeader = styled.div`
  text-align: center;
  font-size: 10px;
  font-weight: bold;
  padding: 4px;
  color: #666;
`;

const DayCell = styled.div<{ $isToday: boolean; $isCurrentMonth: boolean; $hasData: boolean }>`
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  background: ${(props) =>
    props.$isToday ? '#000080' : props.$hasData ? '#90EE90' : props.$isCurrentMonth ? '#fff' : '#ddd'};
  color: ${(props) => (props.$isToday ? '#fff' : '#000')};
  border: 1px solid #888;
  min-height: 44px;

  &:active {
    background: #000080;
    color: #fff;
  }
`;

const DayNumber = styled.span`
  font-weight: bold;
`;

const DayIndicator = styled.span`
  font-size: 8px;
`;

const DayDetail = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
`;

const FixedTaskbar = styled(AppBar)`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  top: auto;
  z-index: 1000;
`;

const TaskbarButton = styled(Button)`
  flex: 1;
  padding: 8px 4px;
  font-size: 11px;
  min-height: 44px;
`;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MobileCalendarPage() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { dailyLogs, habitCompletions, fetchData } = useLogStore();

  useEffect(() => {
    fetchData();
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const hasDataForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return dailyLogs.some((l) => l.date === dateStr) ||
           habitCompletions.some((c) => c.date === dateStr);
  };

  const getSelectedDayData = () => {
    if (!selectedDay) return null;
    const log = dailyLogs.find((l) => l.date === selectedDay);
    const completions = habitCompletions.filter((c) => c.date === selectedDay);
    return { log, completions };
  };

  const dayData = getSelectedDayData();

  return (
    <>
      <MobileContainer>
        <Window>
          <WindowHeader style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Calendar</span>
            <Button size="sm" onClick={() => router.push('/mobile')}>Back</Button>
          </WindowHeader>
          <WindowContent>
            <MonthNav>
              <Button size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                &lt;
              </Button>
              <MonthTitle>{format(currentMonth, 'MMMM yyyy')}</MonthTitle>
              <Button size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                &gt;
              </Button>
            </MonthNav>

            <CalendarGrid>
              {DAYS.map((day) => (
                <DayHeader key={day}>{day}</DayHeader>
              ))}
              {days.map((day) => {
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const hasData = hasDataForDay(day);
                const dateStr = format(day, 'yyyy-MM-dd');

                return (
                  <DayCell
                    key={dateStr}
                    $isToday={isToday}
                    $isCurrentMonth={isCurrentMonth}
                    $hasData={hasData}
                    onClick={() => setSelectedDay(dateStr)}
                  >
                    <DayNumber>{format(day, 'd')}</DayNumber>
                    {hasData && <DayIndicator>*</DayIndicator>}
                  </DayCell>
                );
              })}
            </CalendarGrid>
          </WindowContent>
        </Window>
      </MobileContainer>

      {/* Day Detail Popup */}
      {selectedDay && (
        <DayDetail onClick={() => setSelectedDay(null)}>
          <Window style={{ width: '100%', maxWidth: 350 }} onClick={(e) => e.stopPropagation()}>
            <WindowHeader style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{format(new Date(selectedDay), 'EEEE, MMM d')}</span>
              <Button size="sm" onClick={() => setSelectedDay(null)}>X</Button>
            </WindowHeader>
            <WindowContent>
              {dayData?.log ? (
                <>
                  <p style={{ fontSize: 12, marginBottom: 8 }}>
                    <strong>Energy:</strong> {dayData.log.energy_level || '-'}/5 |
                    <strong> Sleep:</strong> {dayData.log.hours_slept || '-'}h |
                    <strong> Rating:</strong> {dayData.log.overall_rating || '-'}/5
                  </p>
                  {dayData.log.notes && (
                    <div style={{ fontSize: 12, background: '#f0f0f0', padding: 8, marginBottom: 8 }}>
                      {dayData.log.notes}
                    </div>
                  )}
                </>
              ) : (
                <p style={{ fontSize: 12, color: '#666' }}>No log for this day</p>
              )}

              {dayData?.completions && dayData.completions.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <strong style={{ fontSize: 12 }}>Habits:</strong>
                  {dayData.completions.filter((c) => c.completed).map((c) => (
                    <div key={c.completion_id} style={{ fontSize: 11, color: 'green' }}>
                      [X] {c.habit_id}
                    </div>
                  ))}
                </div>
              )}

              <Button
                style={{ width: '100%', marginTop: 12 }}
                onClick={() => setSelectedDay(null)}
              >
                Close
              </Button>
            </WindowContent>
          </Window>
        </DayDetail>
      )}

      {/* Fixed Taskbar */}
      <FixedTaskbar>
        <Toolbar style={{ justifyContent: 'space-around', padding: '4px' }}>
          <TaskbarButton onClick={() => router.push('/mobile')}>
            Home
          </TaskbarButton>
          <TaskbarButton active>
            Calendar
          </TaskbarButton>
          <TaskbarButton onClick={() => router.push('/mobile/coach')}>
            Coach
          </TaskbarButton>
          <TaskbarButton onClick={() => router.push('/mobile/settings')}>
            Settings
          </TaskbarButton>
        </Toolbar>
      </FixedTaskbar>
    </>
  );
}
