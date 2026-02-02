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
  MainWindow,
  ContentArea,
  TitleBar,
  TitleBarButton,
  PopupOverlay,
  PopupWindow,
  PopupContent,
  StyledTextArea,
  StyledInput,
  ToggleButton,
  ToggleGroup,
  FormRow,
  FormLabel,
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

const CalendarWrapper = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #fff;
  margin: 4px;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  box-shadow: inset 1px 1px 0 #0a0a0a;
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #808080;
  flex: 1;
`;

const DayHeader = styled.div`
  text-align: center;
  font-size: 10px;
  font-weight: bold;
  padding: 6px 2px;
  background: #c0c0c0;
`;

const DayCell = styled.div<{ $isToday: boolean; $isCurrentMonth: boolean; $hasData: boolean }>`
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
  min-height: 40px;
  padding: 4px;

  &:active {
    background: #000080;
    color: #fff;
  }
`;

const DayNumber = styled.span`
  font-weight: bold;
  font-size: 12px;
`;

const DayIndicator = styled.span`
  font-size: 6px;
  color: #008000;
  margin-top: 2px;
`;

const Legend = styled.div`
  padding: 8px;
  background: #c0c0c0;
  font-size: 10px;
  display: flex;
  gap: 16px;
  justify-content: center;
  border-top: 1px solid #808080;
`;

const BackButton = styled(Button)`
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
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
  const [showFullEditor, setShowFullEditor] = useState(false);
  const [saving, setSaving] = useState(false);

  // Full log editor state
  const [editEnergy, setEditEnergy] = useState(3);
  const [editSleep, setEditSleep] = useState('7');
  const [editWork, setEditWork] = useState('0');
  const [editRating, setEditRating] = useState(3);
  const [editNotes, setEditNotes] = useState('');

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
        day_type: existingLog?.day_type ?? null,
        energy_level: existingLog?.energy_level ?? 3,
        hours_slept: existingLog?.hours_slept ?? 7,
        work_hours: existingLog?.work_hours ?? 0,
        school_hours: existingLog?.school_hours ?? 0,
        free_hours: existingLog?.free_hours ?? null,
        overall_rating: existingLog?.overall_rating ?? 3,
        notes: noteText,
        sick: existingLog?.sick ?? false,
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

  // Open full log editor
  const openFullEditor = () => {
    if (!selectedDay) return;
    const log = dailyLogs.find((l) => l.date === selectedDay);
    setEditEnergy(log?.energy_level ?? 3);
    setEditSleep(String(log?.hours_slept ?? 7));
    setEditWork(String(log?.work_hours ?? 0));
    setEditRating(log?.overall_rating ?? 3);
    setEditNotes(log?.notes ?? '');
    setShowFullEditor(true);
  };

  // Save full log
  const handleSaveFullLog = async () => {
    if (!selectedDay) return;
    setSaving(true);

    try {
      const existingLog = dailyLogs.find((l) => l.date === selectedDay);
      const updatedLog = {
        date: selectedDay,
        day_type: existingLog?.day_type ?? null,
        energy_level: editEnergy,
        hours_slept: parseFloat(editSleep) || 0,
        work_hours: parseFloat(editWork) || 0,
        school_hours: existingLog?.school_hours ?? 0,
        free_hours: existingLog?.free_hours ?? null,
        overall_rating: editRating,
        notes: editNotes,
        sick: existingLog?.sick ?? false,
        accomplishments: existingLog?.accomplishments ?? [],
        created_at: existingLog?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await saveDailyLog(updatedLog);
      setShowFullEditor(false);
      setSelectedDay(null);
    } catch (err) {
      console.error('Failed to save log:', err);
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
        {/* Main Window */}
        <MainWindow style={{ marginBottom: 70 }}>
          <TitleBar>
            <span>📅 Calendar</span>
            <TitleBarButton size="sm" onClick={() => router.push('/mobile')}>
              ✕
            </TitleBarButton>
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
            <CalendarWrapper>
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
            </CalendarWrapper>

            {/* Legend */}
            <Legend>
              <span><span style={{ color: '#000080' }}>■</span> Today</span>
              <span><span style={{ color: '#90EE90' }}>■</span> Has data</span>
            </Legend>
          </ContentArea>
        </MainWindow>

        {/* Back Button */}
        <BackButton onClick={() => router.push('/mobile')}>
          ← Back to Home
        </BackButton>
      </MobileContainer>

      {/* Day Detail Popup */}
      {selectedDay && !showQuickLog && !showFullEditor && (
        <PopupOverlay onClick={() => setSelectedDay(null)}>
          <PopupWindow onClick={(e) => e.stopPropagation()}>
            <TitleBar>
              <span>📅 {format(new Date(selectedDay), 'EEE, MMM d')}</span>
              <TitleBarButton size="sm" onClick={() => setSelectedDay(null)}>✕</TitleBarButton>
            </TitleBar>
            <PopupContent>
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
                      <div style={{ fontSize: 18 }}>{'⚡'.repeat(Math.min(dayData.log.energy_level || 0, 5))}</div>
                      <div style={{ fontSize: 9, color: '#808080' }}>Energy</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18 }}>{dayData.log.hours_slept || '—'}h</div>
                      <div style={{ fontSize: 9, color: '#808080' }}>Sleep</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18 }}>{'⭐'.repeat(Math.min(dayData.log.overall_rating || 0, 5))}</div>
                      <div style={{ fontSize: 9, color: '#808080' }}>Rating</div>
                    </div>
                  </div>
                  {(dayData.log.work_hours ?? 0) > 0 && (
                    <div style={{
                      fontSize: 11,
                      color: '#808080',
                      textAlign: 'center',
                      marginBottom: 8
                    }}>
                      Work: {dayData.log.work_hours}h
                    </div>
                  )}
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

              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <Button
                  primary
                  style={{ flex: 1 }}
                  onClick={openFullEditor}
                >
                  Edit Full Log
                </Button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  style={{ flex: 1 }}
                  onClick={() => {
                    setNoteText(dayData?.log?.notes || '');
                    setShowQuickLog(true);
                  }}
                >
                  {dayData?.log ? 'Quick Note' : 'Add Note'}
                </Button>
                <Button style={{ flex: 1 }} onClick={() => setSelectedDay(null)}>
                  Close
                </Button>
              </div>
            </PopupContent>
          </PopupWindow>
        </PopupOverlay>
      )}

      {/* Quick Log Popup */}
      {showQuickLog && selectedDay && (
        <PopupOverlay onClick={() => { setShowQuickLog(false); setSelectedDay(null); }}>
          <PopupWindow onClick={(e) => e.stopPropagation()}>
            <TitleBar>
              <span>📝 Note for {format(new Date(selectedDay), 'MMM d')}</span>
              <TitleBarButton size="sm" onClick={() => { setShowQuickLog(false); setSelectedDay(null); }}>✕</TitleBarButton>
            </TitleBar>
            <PopupContent>
              <FormRow>
                <FormLabel>What did you accomplish?</FormLabel>
                <StyledTextArea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Write your notes here..."
                  autoFocus
                />
              </FormRow>
              <div style={{ display: 'flex', gap: 8 }}>
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
            </PopupContent>
          </PopupWindow>
        </PopupOverlay>
      )}

      {/* Full Log Editor Popup */}
      {showFullEditor && selectedDay && (
        <PopupOverlay onClick={() => { setShowFullEditor(false); setSelectedDay(null); }}>
          <PopupWindow onClick={(e) => e.stopPropagation()}>
            <TitleBar>
              <span>📊 Edit Log - {format(new Date(selectedDay), 'MMM d')}</span>
              <TitleBarButton size="sm" onClick={() => { setShowFullEditor(false); setSelectedDay(null); }}>✕</TitleBarButton>
            </TitleBar>
            <PopupContent>
              <FormRow>
                <FormLabel>Energy Level (1-5)</FormLabel>
                <ToggleGroup>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <ToggleButton
                      key={level}
                      $active={editEnergy === level}
                      onClick={() => setEditEnergy(level)}
                    >
                      {level}
                    </ToggleButton>
                  ))}
                </ToggleGroup>
              </FormRow>

              <FormRow>
                <FormLabel>Sleep Hours</FormLabel>
                <StyledInput
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={editSleep}
                  onChange={(e) => setEditSleep(e.target.value)}
                  placeholder="e.g., 7.5"
                />
              </FormRow>

              <FormRow>
                <FormLabel>Work Hours</FormLabel>
                <StyledInput
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={editWork}
                  onChange={(e) => setEditWork(e.target.value)}
                  placeholder="e.g., 8"
                />
              </FormRow>

              <FormRow>
                <FormLabel>Overall Rating (1-5)</FormLabel>
                <ToggleGroup>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <ToggleButton
                      key={level}
                      $active={editRating === level}
                      onClick={() => setEditRating(level)}
                    >
                      {'⭐'.repeat(level)}
                    </ToggleButton>
                  ))}
                </ToggleGroup>
              </FormRow>

              <FormRow>
                <FormLabel>Notes</FormLabel>
                <StyledTextArea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="How was your day?"
                />
              </FormRow>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  primary
                  style={{ flex: 1 }}
                  onClick={handleSaveFullLog}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Log'}
                </Button>
                <Button style={{ flex: 1 }} onClick={() => { setShowFullEditor(false); setSelectedDay(null); }}>
                  Cancel
                </Button>
              </div>
            </PopupContent>
          </PopupWindow>
        </PopupOverlay>
      )}
    </>
  );
}
