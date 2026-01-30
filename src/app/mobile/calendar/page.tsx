'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Button } from 'react95';
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
import {
  MobileContainer,
  Header,
  AppTitle,
  VersionBadge,
  MainWindow,
  ContentArea,
  TitleBar,
  TitleBarButton,
  InsetPanel,
  FloatingActionButton,
  Taskbar,
  TaskbarButton,
  TaskbarIcon,
  PopupOverlay,
  PopupWindow,
  StyledTextArea,
} from '@/components/mobile/MobileShared';

// ============================================
// CALENDAR SPECIFIC STYLES
// ============================================

const CalendarNav = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #c0c0c0;
  border-bottom: 2px solid #808080;
`;

const MonthTitle = styled.span`
  font-size: 14px;
  font-weight: bold;
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #808080;
  padding: 1px;
`;

const DayHeader = styled.div`
  text-align: center;
  font-size: 10px;
  font-weight: bold;
  padding: 6px 2px;
  background: #c0c0c0;
  border-bottom: 2px solid #808080;
`;

const DayCell = styled.div<{ $isToday: boolean; $isCurrentMonth: boolean; $hasData: boolean }>`
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  background: ${(props) =>
    props.$isToday ? '#000080' :
    props.$hasData ? '#90EE90' :
    props.$isCurrentMonth ? '#fff' : '#e0e0e0'};
  color: ${(props) => props.$isToday ? '#fff' : '#000'};
  min-height: 44px;
  border: 1px solid transparent;

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
  color: #008000;
`;

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ============================================
// MAIN COMPONENT
// ============================================

export default function MobileCalendarPage() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [saving, setSaving] = useState(false);

  const { dailyLogs, habitCompletions, habits, fetchData, saveDailyLog } = useLogStore();

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
           habitCompletions.some((c) => c.date === dateStr && c.completed);
  };

  const getSelectedDayData = () => {
    if (!selectedDay) return null;
    const log = dailyLogs.find((l) => l.date === selectedDay);
    const completions = habitCompletions.filter((c) => c.date === selectedDay && c.completed);
    return { log, completions };
  };

  const dayData = getSelectedDayData();

  const handleSaveNote = async () => {
    if (!noteText.trim() || !selectedDay) return;
    setSaving(true);

    try {
      const existingLog = dailyLogs.find((l) => l.date === selectedDay);
      const updatedLog = {
        date: selectedDay,
        energy_level: existingLog?.energy_level ?? 3,
        sleep_hours: existingLog?.sleep_hours ?? 7,
        work_hours: existingLog?.work_hours ?? 0,
        school_hours: existingLog?.school_hours ?? 0,
        overall_rating: existingLog?.overall_rating ?? 3,
        notes: noteText,
        accomplishments: existingLog?.accomplishments ?? [],
        created_at: existingLog?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await saveDailyLog(updatedLog);
      setNoteText('');
      setShowQuickLog(false);
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setSaving(false);
    }
  };

  const getHabitName = (habitId: string) => {
    const habit = habits.find(h => h.habit_id === habitId);
    return habit?.name || habitId;
  };

  return (
    <>
      <MobileContainer>
        {/* Header */}
        <Header>
          <AppTitle>
            Progress95
            <VersionBadge>v1.0</VersionBadge>
          </AppTitle>
          <Button size="sm" onClick={() => router.push('/mobile')}>
            Back
          </Button>
        </Header>

        {/* Main Window */}
        <MainWindow>
          <TitleBar>
            <span>📅 Calendar</span>
          </TitleBar>

          <ContentArea>
            {/* Month Navigation */}
            <CalendarNav>
              <Button size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                ◀
              </Button>
              <MonthTitle>{format(currentMonth, 'MMMM yyyy')}</MonthTitle>
              <Button size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                ▶
              </Button>
            </CalendarNav>

            {/* Calendar Grid */}
            <InsetPanel style={{ margin: 4, padding: 0, overflow: 'hidden' }}>
              <CalendarGrid>
                {/* Day Headers */}
                {DAYS.map((day) => (
                  <DayHeader key={day}>{day}</DayHeader>
                ))}

                {/* Day Cells */}
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
                      {hasData && <DayIndicator>●</DayIndicator>}
                    </DayCell>
                  );
                })}
              </CalendarGrid>
            </InsetPanel>

            {/* Legend */}
            <div style={{ padding: '8px', background: '#c0c0c0', fontSize: 10, display: 'flex', gap: 16, justifyContent: 'center' }}>
              <span><span style={{ color: '#000080' }}>■</span> Today</span>
              <span><span style={{ color: '#90EE90' }}>■</span> Has data</span>
            </div>
          </ContentArea>
        </MainWindow>

        {/* Floating Action Button */}
        <FloatingActionButton onClick={() => {
          setSelectedDay(format(new Date(), 'yyyy-MM-dd'));
          setShowQuickLog(true);
        }}>
          📎
        </FloatingActionButton>

        {/* Taskbar */}
        <Taskbar>
          <TaskbarButton onClick={() => router.push('/mobile')}>
            <TaskbarIcon>🏠</TaskbarIcon>
          </TaskbarButton>
          <TaskbarButton $active>
            <TaskbarIcon>📅</TaskbarIcon>
          </TaskbarButton>
          <TaskbarButton onClick={() => {
            setSelectedDay(format(new Date(), 'yyyy-MM-dd'));
            setShowQuickLog(true);
          }}>
            <TaskbarIcon>📝</TaskbarIcon>
          </TaskbarButton>
          <TaskbarButton onClick={() => router.push('/mobile/settings')}>
            <TaskbarIcon>⚙️</TaskbarIcon>
          </TaskbarButton>
        </Taskbar>
      </MobileContainer>

      {/* Day Detail Popup */}
      {selectedDay && !showQuickLog && (
        <PopupOverlay onClick={() => setSelectedDay(null)}>
          <PopupWindow onClick={(e) => e.stopPropagation()}>
            <TitleBar>
              <span>📅 {format(new Date(selectedDay), 'EEE, MMM d')}</span>
              <TitleBarButton onClick={() => setSelectedDay(null)}>✕</TitleBarButton>
            </TitleBar>
            <div style={{ padding: 12, background: '#c0c0c0' }}>
              {dayData?.log ? (
                <>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 8,
                    marginBottom: 12,
                    background: '#fff',
                    padding: 8,
                    border: '2px inset #808080'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18 }}>{'⚡'.repeat(dayData.log.energy_level || 0)}</div>
                      <div style={{ fontSize: 9, color: '#808080' }}>Energy</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18 }}>{dayData.log.sleep_hours || '—'}h</div>
                      <div style={{ fontSize: 9, color: '#808080' }}>Sleep</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18 }}>{'⭐'.repeat(dayData.log.overall_rating || 0)}</div>
                      <div style={{ fontSize: 9, color: '#808080' }}>Rating</div>
                    </div>
                  </div>
                  {dayData.log.notes && (
                    <div style={{
                      fontSize: 12,
                      background: '#fff',
                      padding: 8,
                      marginBottom: 12,
                      border: '2px inset #808080',
                      maxHeight: 80,
                      overflow: 'auto'
                    }}>
                      {dayData.log.notes}
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: 16,
                  color: '#808080',
                  fontSize: 12
                }}>
                  No log for this day
                </div>
              )}

              {dayData?.completions && dayData.completions.length > 0 && (
                <div style={{
                  background: '#fff',
                  border: '2px inset #808080',
                  padding: 8,
                  marginBottom: 12
                }}>
                  <div style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>Habits Completed:</div>
                  {dayData.completions.map((c) => (
                    <div key={c.completion_id || c.habit_id} style={{ fontSize: 11, color: '#008000' }}>
                      ✓ {getHabitName(c.habit_id)}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  style={{ flex: 1 }}
                  onClick={() => {
                    setNoteText(dayData?.log?.notes || '');
                    setShowQuickLog(true);
                  }}
                >
                  {dayData?.log ? 'Edit Note' : 'Add Note'}
                </Button>
                <Button style={{ flex: 1 }} onClick={() => setSelectedDay(null)}>
                  Close
                </Button>
              </div>
            </div>
          </PopupWindow>
        </PopupOverlay>
      )}

      {/* Quick Log Popup */}
      {showQuickLog && selectedDay && (
        <PopupOverlay onClick={() => { setShowQuickLog(false); setSelectedDay(null); }}>
          <PopupWindow onClick={(e) => e.stopPropagation()}>
            <TitleBar>
              <span>📝 Note for {format(new Date(selectedDay), 'MMM d')}</span>
              <TitleBarButton onClick={() => { setShowQuickLog(false); setSelectedDay(null); }}>✕</TitleBarButton>
            </TitleBar>
            <div style={{ padding: 12, background: '#c0c0c0' }}>
              <StyledTextArea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="What did you accomplish?"
                autoFocus
              />
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <Button
                  primary
                  style={{ flex: 1 }}
                  onClick={handleSaveNote}
                  disabled={saving || !noteText.trim()}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button style={{ flex: 1 }} onClick={() => { setShowQuickLog(false); setSelectedDay(null); }}>
                  Cancel
                </Button>
              </div>
            </div>
          </PopupWindow>
        </PopupOverlay>
      )}
    </>
  );
}
