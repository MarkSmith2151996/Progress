'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowContent,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeadCell,
  TableDataCell,
  Tabs,
  Tab,
  TabBody,
  Toolbar,
  TextInput,
  GroupBox,
} from 'react95';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useLogStore } from '@/stores/logStore';
import { useGoalStore } from '@/stores/goalStore';

// Register service worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.error);
}

// ============================================
// STYLED COMPONENTS - Coins95 Style
// ============================================

const MobileContainer = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  background: #008080;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 8px;
  background: #008080;
`;

const AppTitle = styled.h1`
  font-size: 28px;
  font-weight: bold;
  font-style: italic;
  color: #ff00ff;
  text-shadow: 2px 2px 0 #800080;
  margin: 0;
  font-family: 'Times New Roman', serif;
`;

const VersionBadge = styled.span`
  font-size: 10px;
  color: #c0c0c0;
  font-style: normal;
  margin-left: 4px;
  vertical-align: super;
`;

const MainWindow = styled(Window)`
  flex: 1;
  margin: 0 4px;
  margin-bottom: 108px;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const ContentArea = styled(WindowContent)`
  flex: 1;
  padding: 0 !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const StyledTable = styled(Table)`
  width: 100%;
  font-size: 12px;

  th, td {
    padding: 8px 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const TableContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  border: 2px inset #808080;
  background: #fff;
  margin: 4px;
`;

const IconCell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const HabitIcon = styled.span<{ $color: string }>`
  width: 16px;
  height: 16px;
  background: ${props => props.$color};
  border: 1px solid #000;
  border-radius: 2px;
  display: inline-block;
  font-size: 10px;
  text-align: center;
  line-height: 16px;
`;

const StatusCell = styled.span<{ $completed: boolean }>`
  color: ${props => props.$completed ? '#008000' : '#808080'};
  font-weight: ${props => props.$completed ? 'bold' : 'normal'};
`;

const StreakCell = styled.span<{ $streak: number }>`
  color: ${props => props.$streak >= 7 ? '#ff8c00' : props.$streak >= 3 ? '#008000' : '#000'};
`;

const TabsContainer = styled.div`
  border-top: 2px solid #808080;
`;

const StyledTabs = styled(Tabs)`
  button {
    font-size: 11px;
    min-width: 80px;
  }
`;

const FloatingActionButton = styled(Button)`
  position: fixed;
  bottom: 70px;
  left: 50%;
  transform: translateX(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff00ff 0%, #800080 100%);
  border: 3px outset #ff80ff;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #fff;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.3);

  &:active {
    border-style: inset;
    transform: translateX(-50%) scale(0.95);
  }
`;

const Taskbar = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 48px;
  background: #c0c0c0;
  border-top: 2px outset #fff;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 4px 8px;
  z-index: 999;
`;

const TaskbarButton = styled(Button)<{ $active?: boolean }>`
  width: 48px;
  height: 36px;
  padding: 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  ${props => props.$active && `
    border-style: inset;
    background: #dfdfdf;
  `}
`;

const TaskbarIcon = styled.span`
  font-size: 18px;
  line-height: 1;
`;

// Quick Log Popup
const PopupOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
`;

const PopupWindow = styled(Window)`
  width: 100%;
  max-width: 300px;
`;

const PopupHeader = styled.div`
  background: linear-gradient(90deg, #000080, #1084d0);
  color: #fff;
  padding: 4px 8px;
  font-weight: bold;
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CloseButton = styled(Button)`
  min-width: 20px;
  min-height: 20px;
  padding: 0;
  font-size: 12px;
`;

const PopupContent = styled(WindowContent)`
  padding: 12px;
`;

const NoteTextArea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 6px;
  font-size: 12px;
  border: 2px inset #808080;
  background: #fff;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 8px;
`;

// Goal Progress Row Component
const GoalRow = styled(TableRow)`
  cursor: pointer;
  &:hover {
    background: #000080;
    color: #fff;
  }
`;

const ProgressText = styled.span<{ $percent: number }>`
  color: ${props => props.$percent >= 75 ? '#008000' : props.$percent >= 50 ? '#808000' : '#800000'};
  font-weight: bold;
`;

// ============================================
// ICON COLORS FOR HABITS
// ============================================

const habitColors = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
  '#dfe6e9', '#fd79a8', '#a29bfe', '#00b894', '#e17055',
];

function getHabitColor(index: number): string {
  return habitColors[index % habitColors.length];
}

function getHabitEmoji(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('gym') || lower.includes('workout') || lower.includes('exercise')) return '💪';
  if (lower.includes('read')) return '📚';
  if (lower.includes('meditat')) return '🧘';
  if (lower.includes('water') || lower.includes('drink')) return '💧';
  if (lower.includes('sleep') || lower.includes('bed')) return '😴';
  if (lower.includes('walk') || lower.includes('run')) return '🏃';
  if (lower.includes('study') || lower.includes('sat') || lower.includes('learn')) return '📖';
  if (lower.includes('code') || lower.includes('program')) return '💻';
  if (lower.includes('eat') || lower.includes('diet') || lower.includes('food')) return '🥗';
  if (lower.includes('journal') || lower.includes('write')) return '✍️';
  if (lower.includes('pray') || lower.includes('church')) return '🙏';
  if (lower.includes('save') || lower.includes('money')) return '💰';
  return '✓';
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function MobilePage() {
  const router = useRouter();
  const [today] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState(0);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  const {
    habits,
    habitCompletions,
    dailyLogs,
    fetchData,
    toggleHabit,
    saveDailyLog,
  } = useLogStore();

  const { goals, fetchGoals } = useGoalStore();

  useEffect(() => {
    fetchData();
    fetchGoals();
  }, []);

  const activeHabits = habits.filter((h) => h.active);
  const todayCompletions = habitCompletions.filter((c) => c.date === today);
  const completedCount = todayCompletions.filter((c) => c.completed).length;
  const activeGoals = goals.filter((g) => g.status === 'active');

  const isHabitCompleted = (habitId: string) => {
    return todayCompletions.some((c) => c.habit_id === habitId && c.completed);
  };

  const getHabitStreak = (habitId: string) => {
    const habit = habits.find(h => h.habit_id === habitId);
    return habit?.streak || 0;
  };

  const handleToggleHabit = async (habitId: string) => {
    await toggleHabit(habitId, today);
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);

    try {
      const existingLog = dailyLogs.find((l) => l.date === today);
      const updatedLog = {
        date: today,
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

  const getGoalProgress = (goal: typeof goals[0]) => {
    if (!goal.target_value) return 0;
    const current = goal.current_value ?? goal.start_value ?? 0;
    return Math.round((current / goal.target_value) * 100);
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
          <Button size="sm" onClick={() => router.push('/mobile/settings')}>
            Settings...
          </Button>
        </Header>

        {/* Main Content Window */}
        <MainWindow>
          <ContentArea>
            {/* Table Container */}
            <TableContainer>
              {activeTab === 0 && (
                <StyledTable>
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>Habit</TableHeadCell>
                      <TableHeadCell style={{ width: 70, textAlign: 'center' }}>Status</TableHeadCell>
                      <TableHeadCell style={{ width: 50, textAlign: 'right' }}>Streak</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeHabits.length === 0 ? (
                      <TableRow>
                        <TableDataCell colSpan={3} style={{ textAlign: 'center', padding: 20, color: '#808080' }}>
                          No habits yet. Add some in Settings!
                        </TableDataCell>
                      </TableRow>
                    ) : (
                      activeHabits.map((habit, index) => {
                        const completed = isHabitCompleted(habit.habit_id);
                        const streak = getHabitStreak(habit.habit_id);
                        return (
                          <TableRow
                            key={habit.habit_id}
                            onClick={() => handleToggleHabit(habit.habit_id)}
                            style={{ cursor: 'pointer' }}
                          >
                            <TableDataCell>
                              <IconCell>
                                <HabitIcon $color={getHabitColor(index)}>
                                  {getHabitEmoji(habit.name)}
                                </HabitIcon>
                                {habit.name}
                              </IconCell>
                            </TableDataCell>
                            <TableDataCell style={{ textAlign: 'center' }}>
                              <StatusCell $completed={completed}>
                                {completed ? '✓ Done' : '○ Todo'}
                              </StatusCell>
                            </TableDataCell>
                            <TableDataCell style={{ textAlign: 'right' }}>
                              <StreakCell $streak={streak}>
                                {streak}d 🔥
                              </StreakCell>
                            </TableDataCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </StyledTable>
              )}

              {activeTab === 1 && (
                <StyledTable>
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>Goal</TableHeadCell>
                      <TableHeadCell style={{ width: 70, textAlign: 'center' }}>Progress</TableHeadCell>
                      <TableHeadCell style={{ width: 60, textAlign: 'right' }}>Days</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeGoals.length === 0 ? (
                      <TableRow>
                        <TableDataCell colSpan={3} style={{ textAlign: 'center', padding: 20, color: '#808080' }}>
                          No active goals. Add some in Settings!
                        </TableDataCell>
                      </TableRow>
                    ) : (
                      activeGoals.map((goal) => {
                        const progress = getGoalProgress(goal);
                        const daysLeft = goal.deadline
                          ? Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                          : '—';
                        return (
                          <GoalRow key={goal.goal_id}>
                            <TableDataCell>
                              <IconCell>
                                <HabitIcon $color="#4ecdc4">
                                  🎯
                                </HabitIcon>
                                {goal.title}
                              </IconCell>
                            </TableDataCell>
                            <TableDataCell style={{ textAlign: 'center' }}>
                              <ProgressText $percent={progress}>
                                {progress}%
                              </ProgressText>
                            </TableDataCell>
                            <TableDataCell style={{ textAlign: 'right' }}>
                              {daysLeft}d
                            </TableDataCell>
                          </GoalRow>
                        );
                      })
                    )}
                  </TableBody>
                </StyledTable>
              )}

              {activeTab === 2 && (
                <StyledTable>
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>Date</TableHeadCell>
                      <TableHeadCell style={{ width: 50, textAlign: 'center' }}>Energy</TableHeadCell>
                      <TableHeadCell style={{ width: 50, textAlign: 'center' }}>Rating</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dailyLogs.length === 0 ? (
                      <TableRow>
                        <TableDataCell colSpan={3} style={{ textAlign: 'center', padding: 20, color: '#808080' }}>
                          No logs yet. Start tracking!
                        </TableDataCell>
                      </TableRow>
                    ) : (
                      dailyLogs.slice(0, 14).map((log) => (
                        <TableRow key={log.date}>
                          <TableDataCell>
                            <IconCell>
                              <HabitIcon $color="#ffeaa7">
                                📅
                              </HabitIcon>
                              {format(new Date(log.date), 'MMM d')}
                            </IconCell>
                          </TableDataCell>
                          <TableDataCell style={{ textAlign: 'center' }}>
                            {'⚡'.repeat(log.energy_level || 0)}
                          </TableDataCell>
                          <TableDataCell style={{ textAlign: 'center' }}>
                            {'⭐'.repeat(log.overall_rating || 0)}
                          </TableDataCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </StyledTable>
              )}
            </TableContainer>

            {/* Tabs */}
            <TabsContainer>
              <StyledTabs value={activeTab} onChange={(val) => setActiveTab(val as number)}>
                <Tab value={0}>Today ({completedCount}/{activeHabits.length})</Tab>
                <Tab value={1}>Goals</Tab>
                <Tab value={2}>History</Tab>
              </StyledTabs>
            </TabsContainer>
          </ContentArea>
        </MainWindow>

        {/* Floating Action Button */}
        <FloatingActionButton onClick={() => setShowQuickLog(true)}>
          📎
        </FloatingActionButton>

        {/* Taskbar */}
        <Taskbar>
          <TaskbarButton $active>
            <TaskbarIcon>🏠</TaskbarIcon>
          </TaskbarButton>
          <TaskbarButton onClick={() => router.push('/mobile/calendar')}>
            <TaskbarIcon>📅</TaskbarIcon>
          </TaskbarButton>
          <TaskbarButton onClick={() => setShowQuickLog(true)}>
            <TaskbarIcon>📝</TaskbarIcon>
          </TaskbarButton>
          <TaskbarButton onClick={() => router.push('/mobile/settings')}>
            <TaskbarIcon>⚙️</TaskbarIcon>
          </TaskbarButton>
        </Taskbar>
      </MobileContainer>

      {/* Quick Log Popup */}
      {showQuickLog && (
        <PopupOverlay onClick={() => setShowQuickLog(false)}>
          <PopupWindow onClick={(e) => e.stopPropagation()}>
            <PopupHeader>
              <span>📝 Quick Note</span>
              <CloseButton onClick={() => setShowQuickLog(false)}>✕</CloseButton>
            </PopupHeader>
            <PopupContent>
              <p style={{ fontSize: 11, marginBottom: 8, color: '#808080' }}>
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
              <NoteTextArea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="What did you accomplish today?"
                autoFocus
              />
              <Button
                primary
                fullWidth
                onClick={handleSaveNote}
                disabled={saving || !noteText.trim()}
              >
                {saving ? 'Saving...' : 'Save Note'}
              </Button>
            </PopupContent>
          </PopupWindow>
        </PopupOverlay>
      )}
    </>
  );
}
