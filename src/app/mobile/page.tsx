'use client';

import { useState, useEffect } from 'react';
import { Button } from 'react95';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useLogStore } from '@/stores/logStore';
import { useGoalStore } from '@/stores/goalStore';
import {
  MobileContainer,
  Header,
  AppTitle,
  VersionBadge,
  MainWindow,
  ContentArea,
  TitleBar,
  TableContainer,
  StyledTable,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  IconBadge,
  StatusBadge,
  TabsRow,
  TabButton,
  FloatingActionButton,
  Taskbar,
  TaskbarButton,
  TaskbarIcon,
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateText,
  PopupOverlay,
  PopupWindow,
  StyledTextArea,
} from '@/components/mobile/MobileShared';

// Register service worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.error);
}

// ============================================
// HABIT HELPERS
// ============================================

const habitColors = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
  '#fd79a8', '#a29bfe', '#00b894', '#e17055', '#74b9ff',
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

  // Empty states
  const renderHabitsEmpty = () => (
    <EmptyState>
      <EmptyStateIcon>📋</EmptyStateIcon>
      <EmptyStateTitle>No habits yet!</EmptyStateTitle>
      <EmptyStateText>
        Start building good habits. Add your first one to begin tracking.
      </EmptyStateText>
      <Button onClick={() => router.push('/mobile/settings')}>
        + Add Habit
      </Button>
    </EmptyState>
  );

  const renderGoalsEmpty = () => (
    <EmptyState>
      <EmptyStateIcon>🎯</EmptyStateIcon>
      <EmptyStateTitle>No goals yet!</EmptyStateTitle>
      <EmptyStateText>
        Set goals to stay focused. What do you want to achieve?
      </EmptyStateText>
      <Button onClick={() => router.push('/mobile/settings')}>
        + Add Goal
      </Button>
    </EmptyState>
  );

  const renderHistoryEmpty = () => (
    <EmptyState>
      <EmptyStateIcon>📅</EmptyStateIcon>
      <EmptyStateTitle>No history yet!</EmptyStateTitle>
      <EmptyStateText>
        Complete habits and add notes to build your history.
      </EmptyStateText>
      <Button onClick={() => setShowQuickLog(true)}>
        + Add Note
      </Button>
    </EmptyState>
  );

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
          <TitleBar>
            <span>📊 {format(new Date(), 'EEEE, MMM d')}</span>
          </TitleBar>

          <ContentArea>
            {/* Table Content */}
            <TableContainer>
              {/* HABITS TAB */}
              {activeTab === 0 && (
                activeHabits.length === 0 ? renderHabitsEmpty() : (
                  <StyledTable>
                    <TableHeader>
                      <tr>
                        <TableHeaderCell>Habit</TableHeaderCell>
                        <TableHeaderCell style={{ width: 70, textAlign: 'center' }}>Status</TableHeaderCell>
                        <TableHeaderCell style={{ width: 55, textAlign: 'right' }}>Streak</TableHeaderCell>
                      </tr>
                    </TableHeader>
                    <TableBody>
                      {activeHabits.map((habit, index) => {
                        const completed = isHabitCompleted(habit.habit_id);
                        const streak = getHabitStreak(habit.habit_id);
                        return (
                          <TableRow
                            key={habit.habit_id}
                            $clickable
                            onClick={() => handleToggleHabit(habit.habit_id)}
                          >
                            <TableCell>
                              <IconBadge $color={getHabitColor(index)}>
                                {getHabitEmoji(habit.name)}
                              </IconBadge>
                              {habit.name}
                            </TableCell>
                            <TableCell style={{ textAlign: 'center' }}>
                              <StatusBadge $variant={completed ? 'success' : 'pending'}>
                                {completed ? '✓ Done' : '○ Todo'}
                              </StatusBadge>
                            </TableCell>
                            <TableCell style={{ textAlign: 'right' }}>
                              <StatusBadge $variant={streak >= 7 ? 'warning' : streak >= 3 ? 'success' : 'pending'}>
                                {streak}🔥
                              </StatusBadge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </StyledTable>
                )
              )}

              {/* GOALS TAB */}
              {activeTab === 1 && (
                activeGoals.length === 0 ? renderGoalsEmpty() : (
                  <StyledTable>
                    <TableHeader>
                      <tr>
                        <TableHeaderCell>Goal</TableHeaderCell>
                        <TableHeaderCell style={{ width: 65, textAlign: 'center' }}>Progress</TableHeaderCell>
                        <TableHeaderCell style={{ width: 50, textAlign: 'right' }}>Days</TableHeaderCell>
                      </tr>
                    </TableHeader>
                    <TableBody>
                      {activeGoals.map((goal) => {
                        const progress = getGoalProgress(goal);
                        const daysLeft = goal.deadline
                          ? Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                          : '—';
                        return (
                          <TableRow key={goal.goal_id} $clickable>
                            <TableCell>
                              <IconBadge $color="#4ecdc4">🎯</IconBadge>
                              {goal.title}
                            </TableCell>
                            <TableCell style={{ textAlign: 'center' }}>
                              <StatusBadge $variant={progress >= 75 ? 'success' : progress >= 50 ? 'warning' : 'pending'}>
                                {progress}%
                              </StatusBadge>
                            </TableCell>
                            <TableCell style={{ textAlign: 'right' }}>
                              {daysLeft}d
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </StyledTable>
                )
              )}

              {/* HISTORY TAB */}
              {activeTab === 2 && (
                dailyLogs.length === 0 ? renderHistoryEmpty() : (
                  <StyledTable>
                    <TableHeader>
                      <tr>
                        <TableHeaderCell>Date</TableHeaderCell>
                        <TableHeaderCell style={{ width: 60, textAlign: 'center' }}>Energy</TableHeaderCell>
                        <TableHeaderCell style={{ width: 60, textAlign: 'center' }}>Rating</TableHeaderCell>
                      </tr>
                    </TableHeader>
                    <TableBody>
                      {dailyLogs.slice(0, 14).map((log) => (
                        <TableRow key={log.date}>
                          <TableCell>
                            <IconBadge $color="#ffeaa7">📅</IconBadge>
                            {format(new Date(log.date), 'MMM d')}
                          </TableCell>
                          <TableCell style={{ textAlign: 'center' }}>
                            {'⚡'.repeat(Math.min(log.energy_level || 0, 5))}
                          </TableCell>
                          <TableCell style={{ textAlign: 'center' }}>
                            {'⭐'.repeat(Math.min(log.overall_rating || 0, 5))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </StyledTable>
                )
              )}
            </TableContainer>

            {/* Tabs */}
            <TabsRow>
              <TabButton $active={activeTab === 0} onClick={() => setActiveTab(0)}>
                Today ({completedCount}/{activeHabits.length})
              </TabButton>
              <TabButton $active={activeTab === 1} onClick={() => setActiveTab(1)}>
                Goals
              </TabButton>
              <TabButton $active={activeTab === 2} onClick={() => setActiveTab(2)}>
                History
              </TabButton>
            </TabsRow>
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
            <TitleBar>
              <span>📝 Quick Note</span>
              <Button size="sm" onClick={() => setShowQuickLog(false)}>✕</Button>
            </TitleBar>
            <div style={{ padding: 12, background: '#c0c0c0' }}>
              <p style={{ fontSize: 11, marginBottom: 8, color: '#000' }}>
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
              <StyledTextArea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="What did you accomplish today?"
                autoFocus
              />
              <div style={{ marginTop: 8 }}>
                <Button
                  primary
                  fullWidth
                  onClick={handleSaveNote}
                  disabled={saving || !noteText.trim()}
                >
                  {saving ? 'Saving...' : 'Save Note'}
                </Button>
              </div>
            </div>
          </PopupWindow>
        </PopupOverlay>
      )}
    </>
  );
}
