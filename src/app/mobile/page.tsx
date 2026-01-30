'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
  Checkbox,
  Tabs,
  Tab,
  TabBody,
  TextInput,
} from 'react95';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useLogStore } from '@/stores/logStore';
import { useGoalStore } from '@/stores/goalStore';

// Register service worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.error);
}

const MobileContainer = styled.div`
  min-height: 100vh;
  background: #008080;
  padding: 4px;
  padding-bottom: 56px;
`;

const MainWindow = styled(Window)`
  width: 100%;
  min-height: calc(100vh - 64px);
`;

const TitleBar = styled(WindowHeader)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 4px;
  font-size: 12px;
`;

const TitleText = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: bold;
`;

const StatsRow = styled.div`
  display: flex;
  justify-content: space-around;
  padding: 8px 4px;
  background: #c0c0c0;
  border: 2px inset #fff;
  margin: 4px 0;
`;

const StatBox = styled.div`
  text-align: center;
  padding: 4px 12px;
`;

const StatValue = styled.div`
  font-size: 18px;
  font-weight: bold;
  font-family: 'ms_sans_serif', sans-serif;
`;

const StatLabel = styled.div`
  font-size: 9px;
  text-transform: uppercase;
  color: #444;
`;

const HabitList = styled.div`
  background: #fff;
  border: 2px inset #888;
  max-height: 250px;
  overflow-y: auto;
`;

const HabitRow = styled.div<{ $completed: boolean }>`
  display: flex;
  align-items: center;
  padding: 10px 8px;
  border-bottom: 1px solid #c0c0c0;
  background: ${props => props.$completed ? '#c0ffc0' : '#fff'};
  min-height: 44px;

  &:active {
    background: #000080;
    color: #fff;
  }
`;

const HabitName = styled.span`
  font-size: 14px;
  margin-left: 8px;
  flex: 1;
`;

const QuickButtons = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin: 8px 0;
`;

const BigButton = styled(Button)`
  padding: 12px 8px;
  font-size: 12px;
  min-height: 48px;
`;

const FixedTaskbar = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 52px;
  background: #c0c0c0;
  border-top: 2px outset #fff;
  display: flex;
  align-items: center;
  padding: 4px;
  gap: 2px;
  z-index: 1000;
`;

const StartButton = styled(Button)`
  font-weight: bold;
  padding: 4px 8px;
  font-size: 11px;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const TaskbarButton = styled(Button)`
  min-width: 44px;
  min-height: 44px;
  padding: 4px;
  font-size: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
`;

const TaskbarIcon = styled.span`
  font-size: 16px;
`;

const TaskbarLabel = styled.span`
  font-size: 8px;
`;

const TaskbarClock = styled.div`
  margin-left: auto;
  padding: 4px 8px;
  border: 2px inset #888;
  font-size: 11px;
  min-height: 32px;
  display: flex;
  align-items: center;
`;

const FloatingButton = styled(Button)`
  position: fixed;
  bottom: 64px;
  right: 12px;
  width: 56px;
  height: 56px;
  border-radius: 4px;
  font-size: 24px;
  z-index: 999;
  box-shadow: 4px 4px 0 #000;
`;

const Popup = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 8px;
`;

const PopupWindow = styled(Window)`
  width: 100%;
  max-width: 320px;
`;

const GoalCard = styled.div`
  padding: 12px;
  margin-bottom: 8px;
  background: #fff;
  border: 2px inset #888;
`;

const GoalTitle = styled.div`
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 4px;
`;

const GoalProgress = styled.div`
  font-size: 11px;
  color: #666;
`;

const ProgressBar = styled.div`
  height: 8px;
  background: #c0c0c0;
  border: 1px inset #888;
  margin-top: 4px;
`;

const ProgressFill = styled.div<{ $percent: number }>`
  height: 100%;
  background: #000080;
  width: ${props => Math.min(100, props.$percent)}%;
`;

const NoteTextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 8px;
  font-size: 14px;
  border: 2px inset #888;
  background: #fff;
  font-family: inherit;
  resize: vertical;
`;

export default function MobilePage() {
  const router = useRouter();
  const [today] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState(0);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

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

    // Update clock
    const updateClock = () => {
      setCurrentTime(format(new Date(), 'h:mm a'));
    };
    updateClock();
    const interval = setInterval(updateClock, 60000);
    return () => clearInterval(interval);
  }, []);

  const activeHabits = habits.filter((h) => h.active);
  const todayCompletions = habitCompletions.filter((c) => c.date === today);
  const completedCount = todayCompletions.filter((c) => c.completed).length;

  const streak = dailyLogs.filter((l) => {
    const logDate = new Date(l.date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  }).length;

  const weeklyScore = Math.round((completedCount / Math.max(activeHabits.length, 1)) * 100);

  const isHabitCompleted = (habitId: string) => {
    return todayCompletions.some((c) => c.habit_id === habitId && c.completed);
  };

  const handleToggleHabit = async (habitId: string) => {
    await toggleHabit(habitId, today);
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);

    try {
      // Get existing log for today or create new one
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

  const activeGoals = goals.filter((g) => g.status === 'active');

  const getGoalProgress = (goal: typeof goals[0]) => {
    if (!goal.target_value) return 0;
    const current = goal.current_value ?? goal.start_value ?? 0;
    return Math.round((current / goal.target_value) * 100);
  };

  return (
    <>
      <MobileContainer>
        <MainWindow>
          <TitleBar>
            <TitleText>
              <span style={{ fontSize: 14 }}>📊</span>
              Progress Tracker
            </TitleText>
            <span>{format(new Date(), 'EEE, MMM d')}</span>
          </TitleBar>

          <WindowContent style={{ padding: 4 }}>
            {/* Stats */}
            <StatsRow>
              <StatBox>
                <StatValue>{weeklyScore}%</StatValue>
                <StatLabel>Score</StatLabel>
              </StatBox>
              <StatBox>
                <StatValue>{streak}</StatValue>
                <StatLabel>Streak</StatLabel>
              </StatBox>
              <StatBox>
                <StatValue>{completedCount}/{activeHabits.length}</StatValue>
                <StatLabel>Habits</StatLabel>
              </StatBox>
            </StatsRow>

            {/* Tabs - Only Habits and Goals */}
            <Tabs value={activeTab} onChange={(v) => setActiveTab(v as number)}>
              <Tab value={0}>Habits</Tab>
              <Tab value={1}>Goals</Tab>
            </Tabs>

            <TabBody style={{ padding: 4, minHeight: 280 }}>
              {activeTab === 0 && (
                <>
                  <HabitList>
                    {activeHabits.length === 0 ? (
                      <div style={{ padding: 16, textAlign: 'center', color: '#666' }}>
                        No habits yet. Add some in Settings!
                      </div>
                    ) : (
                      activeHabits.map((habit) => (
                        <HabitRow
                          key={habit.habit_id}
                          $completed={isHabitCompleted(habit.habit_id)}
                          onClick={() => handleToggleHabit(habit.habit_id)}
                        >
                          <Checkbox
                            checked={isHabitCompleted(habit.habit_id)}
                            onChange={() => {}}
                          />
                          <HabitName>{habit.name}</HabitName>
                          {isHabitCompleted(habit.habit_id) && <span>✓</span>}
                        </HabitRow>
                      ))
                    )}
                  </HabitList>
                  <QuickButtons>
                    <BigButton onClick={() => setShowQuickLog(true)}>
                      📝 Add Note
                    </BigButton>
                    <BigButton onClick={() => router.push('/mobile/calendar')}>
                      📅 Calendar
                    </BigButton>
                  </QuickButtons>
                </>
              )}

              {activeTab === 1 && (
                <div>
                  {activeGoals.length === 0 ? (
                    <div style={{ padding: 16, textAlign: 'center', color: '#666' }}>
                      No active goals. Add some in Settings!
                    </div>
                  ) : (
                    activeGoals.map((goal) => (
                      <GoalCard key={goal.goal_id}>
                        <GoalTitle>{goal.title}</GoalTitle>
                        {goal.target_value && (
                          <>
                            <GoalProgress>
                              {goal.current_value ?? goal.start_value ?? 0} / {goal.target_value} {goal.unit || ''}
                            </GoalProgress>
                            <ProgressBar>
                              <ProgressFill $percent={getGoalProgress(goal)} />
                            </ProgressBar>
                          </>
                        )}
                      </GoalCard>
                    ))
                  )}
                </div>
              )}
            </TabBody>
          </WindowContent>
        </MainWindow>
      </MobileContainer>

      {/* Floating Quick Log Button */}
      <FloatingButton onClick={() => setShowQuickLog(true)}>
        +
      </FloatingButton>

      {/* Taskbar - Removed Coach button */}
      <FixedTaskbar>
        <StartButton active>
          <span style={{ fontSize: 14 }}>🪟</span>
          Start
        </StartButton>
        <TaskbarButton active>
          <TaskbarIcon>🏠</TaskbarIcon>
          <TaskbarLabel>Home</TaskbarLabel>
        </TaskbarButton>
        <TaskbarButton onClick={() => router.push('/mobile/calendar')}>
          <TaskbarIcon>📅</TaskbarIcon>
          <TaskbarLabel>Calendar</TaskbarLabel>
        </TaskbarButton>
        <TaskbarButton onClick={() => router.push('/mobile/settings')}>
          <TaskbarIcon>⚙️</TaskbarIcon>
          <TaskbarLabel>Settings</TaskbarLabel>
        </TaskbarButton>
        <TaskbarClock>{currentTime}</TaskbarClock>
      </FixedTaskbar>

      {/* Note Popup - Simple text note, no coach */}
      {showQuickLog && (
        <Popup onClick={() => setShowQuickLog(false)}>
          <PopupWindow onClick={(e) => e.stopPropagation()}>
            <WindowHeader style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Add Note</span>
              <Button size="sm" onClick={() => setShowQuickLog(false)}>×</Button>
            </WindowHeader>
            <WindowContent>
              <p style={{ fontSize: 11, marginBottom: 8, color: '#666' }}>
                Add a note for today:
              </p>
              <NoteTextArea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="What did you accomplish today?"
                autoFocus
              />
              <Button
                primary
                style={{ width: '100%', marginTop: 8, padding: 12 }}
                onClick={handleSaveNote}
                disabled={saving || !noteText.trim()}
              >
                {saving ? 'Saving...' : 'Save Note'}
              </Button>
            </WindowContent>
          </PopupWindow>
        </Popup>
      )}
    </>
  );
}
