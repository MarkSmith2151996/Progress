'use client';

import { useState, useEffect } from 'react';
import { Button, ProgressBar } from 'react95';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useLogStore } from '@/stores/logStore';
import { useGoalStore } from '@/stores/goalStore';
import {
  MobileContainer,
  MainWindow,
  ContentArea,
  TitleBar,
  TitleBarButton,
  ScrollArea,
  GoalCard,
  GoalTitle,
  GoalProgressWrapper,
  GoalPercentage,
  BottomTabs,
  BottomTab,
  TabIcon,
  TabLabel,
  ListContainer,
  ListItem,
  Checkbox,
  ListItemText,
  ListItemMeta,
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateText,
  PopupOverlay,
  PopupWindow,
  PopupContent,
  StyledInput,
  StyledTextArea,
  FormRow,
  FormLabel,
  SectionHeader,
  AddButton,
  AccomplishmentItem,
  AccomplishmentIcon,
  AccomplishmentContent,
  AccomplishmentText,
  AccomplishmentDate,
} from '@/components/mobile/MobileShared';

// Register service worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.error);
}

// Tab identifiers
const TABS = {
  ACCOMPLISHMENTS: 0,
  HABITS: 1,
  MONTHLY: 2,
  SUMMARY: 3, // Default tab
};

export default function MobilePage() {
  const router = useRouter();
  const [today] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState(TABS.SUMMARY); // Default to Goal Summary
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddAccomplishment, setShowAddAccomplishment] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newAccomplishment, setNewAccomplishment] = useState('');
  const [saving, setSaving] = useState(false);

  const {
    habits,
    habitCompletions,
    dailyLogs,
    fetchData,
    toggleHabit,
    saveDailyLog,
  } = useLogStore();

  const { goals, fetchGoals, saveGoal } = useGoalStore();

  useEffect(() => {
    fetchData();
    fetchGoals();
  }, []);

  const activeHabits = habits.filter((h) => h.active);
  const todayCompletions = habitCompletions.filter((c) => c.date === today);
  const activeGoals = goals.filter((g) => g.status === 'active');
  const monthlyGoals = activeGoals.filter((g) => g.type === 'monthly');

  // Get accomplishments from daily logs
  const allAccomplishments: { text: string; date: string }[] = [];
  dailyLogs.forEach((log) => {
    if (log.accomplishments && Array.isArray(log.accomplishments)) {
      log.accomplishments.forEach((acc) => {
        allAccomplishments.push({ text: acc, date: log.date });
      });
    }
    // Also include notes as accomplishments if present
    if (log.notes && log.notes.trim()) {
      allAccomplishments.push({ text: log.notes, date: log.date });
    }
  });
  // Sort by date descending
  allAccomplishments.sort((a, b) => b.date.localeCompare(a.date));

  const isHabitCompleted = (habitId: string) => {
    return todayCompletions.some((c) => c.habit_id === habitId && c.completed);
  };

  const handleToggleHabit = async (habitId: string) => {
    await toggleHabit(habitId, today);
  };

  const getGoalProgress = (goal: typeof goals[0]) => {
    if (!goal.target_value) return 0;
    const current = goal.current_value ?? goal.start_value ?? 0;
    return Math.min(100, Math.round((current / goal.target_value) * 100));
  };

  const handleAddGoal = async () => {
    if (!newGoalTitle.trim()) return;
    setSaving(true);

    try {
      const goal = {
        goal_id: `goal_${Date.now()}`,
        title: newGoalTitle.trim(),
        type: 'monthly' as const,
        target_value: parseFloat(newGoalTarget) || 100,
        current_value: 0,
        start_value: 0,
        status: 'active' as const,
        deadline: format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await saveGoal(goal);
      setNewGoalTitle('');
      setNewGoalTarget('');
      setShowAddGoal(false);
    } catch (err) {
      console.error('Failed to add goal:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAccomplishment = async () => {
    if (!newAccomplishment.trim()) return;
    setSaving(true);

    try {
      const existingLog = dailyLogs.find((l) => l.date === today);
      const currentAccomplishments = existingLog?.accomplishments || [];

      const updatedLog = {
        date: today,
        energy_level: existingLog?.energy_level ?? 3,
        sleep_hours: existingLog?.sleep_hours ?? 7,
        work_hours: existingLog?.work_hours ?? 0,
        school_hours: existingLog?.school_hours ?? 0,
        overall_rating: existingLog?.overall_rating ?? 3,
        notes: existingLog?.notes ?? '',
        accomplishments: [...currentAccomplishments, newAccomplishment.trim()],
        created_at: existingLog?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await saveDailyLog(updatedLog);
      setNewAccomplishment('');
      setShowAddAccomplishment(false);
    } catch (err) {
      console.error('Failed to add accomplishment:', err);
    } finally {
      setSaving(false);
    }
  };

  // Get title for current tab
  const getTabTitle = () => {
    switch (activeTab) {
      case TABS.ACCOMPLISHMENTS:
        return 'Accomplishments';
      case TABS.HABITS:
        return 'Habits';
      case TABS.MONTHLY:
        return 'Monthly Goals';
      case TABS.SUMMARY:
      default:
        return 'Goal Summary';
    }
  };

  // Render Goal Summary (default tab)
  const renderGoalSummary = () => {
    if (activeGoals.length === 0) {
      return (
        <EmptyState>
          <EmptyStateIcon>🎯</EmptyStateIcon>
          <EmptyStateTitle>No goals yet!</EmptyStateTitle>
          <EmptyStateText>
            Set your first goal to start tracking progress toward your dreams.
          </EmptyStateText>
          <Button onClick={() => { setActiveTab(TABS.MONTHLY); setShowAddGoal(true); }}>
            + Add Goal
          </Button>
        </EmptyState>
      );
    }

    return (
      <>
        {activeGoals.map((goal) => {
          const progress = getGoalProgress(goal);
          return (
            <GoalCard key={goal.goal_id}>
              <GoalTitle>{goal.title}</GoalTitle>
              <GoalProgressWrapper>
                <ProgressBar value={progress} />
              </GoalProgressWrapper>
              <GoalPercentage>{progress}%</GoalPercentage>
            </GoalCard>
          );
        })}
      </>
    );
  };

  // Render Habits tab
  const renderHabits = () => {
    if (activeHabits.length === 0) {
      return (
        <EmptyState>
          <EmptyStateIcon>📋</EmptyStateIcon>
          <EmptyStateTitle>No habits yet!</EmptyStateTitle>
          <EmptyStateText>
            Build good habits one day at a time. Add your first habit to start tracking.
          </EmptyStateText>
        </EmptyState>
      );
    }

    const completedCount = todayCompletions.filter((c) => c.completed).length;

    return (
      <>
        <SectionHeader>
          Today - {completedCount}/{activeHabits.length} completed
        </SectionHeader>
        <ListContainer>
          {activeHabits.map((habit) => {
            const completed = isHabitCompleted(habit.habit_id);
            return (
              <ListItem
                key={habit.habit_id}
                $completed={completed}
                $clickable
                onClick={() => handleToggleHabit(habit.habit_id)}
              >
                <Checkbox $checked={completed}>
                  {completed && '✓'}
                </Checkbox>
                <ListItemText $completed={completed}>
                  {habit.name}
                </ListItemText>
                {habit.streak > 0 && (
                  <ListItemMeta>{habit.streak}🔥</ListItemMeta>
                )}
              </ListItem>
            );
          })}
        </ListContainer>
      </>
    );
  };

  // Render Monthly Goals tab
  const renderMonthlyGoals = () => {
    return (
      <>
        <SectionHeader>
          {format(new Date(), 'MMMM yyyy')} Goals
        </SectionHeader>

        {monthlyGoals.length === 0 ? (
          <EmptyState>
            <EmptyStateIcon>📅</EmptyStateIcon>
            <EmptyStateTitle>No monthly goals!</EmptyStateTitle>
            <EmptyStateText>
              Set monthly goals to break down big dreams into achievable targets.
            </EmptyStateText>
          </EmptyState>
        ) : (
          <>
            {monthlyGoals.map((goal) => {
              const progress = getGoalProgress(goal);
              return (
                <GoalCard key={goal.goal_id}>
                  <GoalTitle>{goal.title}</GoalTitle>
                  <GoalProgressWrapper>
                    <ProgressBar value={progress} />
                  </GoalProgressWrapper>
                  <GoalPercentage>
                    {goal.current_value ?? 0} / {goal.target_value} ({progress}%)
                  </GoalPercentage>
                </GoalCard>
              );
            })}
          </>
        )}

        <AddButton onClick={() => setShowAddGoal(true)}>
          + Add Monthly Goal
        </AddButton>
      </>
    );
  };

  // Render Accomplishments tab
  const renderAccomplishments = () => {
    if (allAccomplishments.length === 0) {
      return (
        <EmptyState>
          <EmptyStateIcon>🏆</EmptyStateIcon>
          <EmptyStateTitle>No accomplishments yet!</EmptyStateTitle>
          <EmptyStateText>
            Record your wins, big or small. Every accomplishment counts!
          </EmptyStateText>
          <Button onClick={() => setShowAddAccomplishment(true)}>
            + Add Win
          </Button>
        </EmptyState>
      );
    }

    return (
      <>
        <SectionHeader>Your Wins</SectionHeader>
        <ListContainer>
          {allAccomplishments.slice(0, 50).map((acc, index) => (
            <AccomplishmentItem key={index}>
              <AccomplishmentIcon>🏆</AccomplishmentIcon>
              <AccomplishmentContent>
                <AccomplishmentText>{acc.text}</AccomplishmentText>
                <AccomplishmentDate>
                  {format(new Date(acc.date), 'MMM d, yyyy')}
                </AccomplishmentDate>
              </AccomplishmentContent>
            </AccomplishmentItem>
          ))}
        </ListContainer>
        <AddButton onClick={() => setShowAddAccomplishment(true)}>
          + Add Win
        </AddButton>
      </>
    );
  };

  return (
    <>
      <MobileContainer>
        {/* Main Content Window */}
        <MainWindow>
          <TitleBar>
            <span>📊 {getTabTitle()}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {activeTab === TABS.ACCOMPLISHMENTS && (
                <TitleBarButton size="sm" onClick={() => setShowAddAccomplishment(true)}>
                  +
                </TitleBarButton>
              )}
              {activeTab === TABS.MONTHLY && (
                <TitleBarButton size="sm" onClick={() => setShowAddGoal(true)}>
                  +
                </TitleBarButton>
              )}
              <TitleBarButton size="sm" onClick={() => router.push('/mobile/calendar')}>
                📅
              </TitleBarButton>
              <TitleBarButton size="sm" onClick={() => router.push('/mobile/settings')}>
                ⚙️
              </TitleBarButton>
            </div>
          </TitleBar>

          <ContentArea>
            <ScrollArea>
              {activeTab === TABS.SUMMARY && renderGoalSummary()}
              {activeTab === TABS.HABITS && renderHabits()}
              {activeTab === TABS.MONTHLY && renderMonthlyGoals()}
              {activeTab === TABS.ACCOMPLISHMENTS && renderAccomplishments()}
            </ScrollArea>
          </ContentArea>
        </MainWindow>

        {/* Bottom Tab Navigation - 4 tabs */}
        <BottomTabs>
          <BottomTab
            $active={activeTab === TABS.ACCOMPLISHMENTS}
            onClick={() => setActiveTab(TABS.ACCOMPLISHMENTS)}
          >
            <TabIcon>🏆</TabIcon>
            <TabLabel>Accomp</TabLabel>
          </BottomTab>
          <BottomTab
            $active={activeTab === TABS.HABITS}
            onClick={() => setActiveTab(TABS.HABITS)}
          >
            <TabIcon>✅</TabIcon>
            <TabLabel>Habits</TabLabel>
          </BottomTab>
          <BottomTab
            $active={activeTab === TABS.MONTHLY}
            onClick={() => setActiveTab(TABS.MONTHLY)}
          >
            <TabIcon>📅</TabIcon>
            <TabLabel>Monthly</TabLabel>
          </BottomTab>
          <BottomTab
            $active={activeTab === TABS.SUMMARY}
            onClick={() => setActiveTab(TABS.SUMMARY)}
          >
            <TabIcon>📊</TabIcon>
            <TabLabel>Summary</TabLabel>
          </BottomTab>
        </BottomTabs>
      </MobileContainer>

      {/* Add Goal Popup */}
      {showAddGoal && (
        <PopupOverlay onClick={() => setShowAddGoal(false)}>
          <PopupWindow onClick={(e) => e.stopPropagation()}>
            <TitleBar>
              <span>📅 Add Monthly Goal</span>
              <TitleBarButton size="sm" onClick={() => setShowAddGoal(false)}>
                ✕
              </TitleBarButton>
            </TitleBar>
            <PopupContent>
              <FormRow>
                <FormLabel>Goal Title</FormLabel>
                <StyledInput
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="e.g., Save $1000"
                  autoFocus
                />
              </FormRow>
              <FormRow>
                <FormLabel>Target Value</FormLabel>
                <StyledInput
                  type="number"
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(e.target.value)}
                  placeholder="e.g., 1000"
                />
              </FormRow>
              <Button
                primary
                fullWidth
                onClick={handleAddGoal}
                disabled={saving || !newGoalTitle.trim()}
              >
                {saving ? 'Saving...' : 'Add Goal'}
              </Button>
            </PopupContent>
          </PopupWindow>
        </PopupOverlay>
      )}

      {/* Add Accomplishment Popup */}
      {showAddAccomplishment && (
        <PopupOverlay onClick={() => setShowAddAccomplishment(false)}>
          <PopupWindow onClick={(e) => e.stopPropagation()}>
            <TitleBar>
              <span>🏆 Add Accomplishment</span>
              <TitleBarButton size="sm" onClick={() => setShowAddAccomplishment(false)}>
                ✕
              </TitleBarButton>
            </TitleBar>
            <PopupContent>
              <FormRow>
                <FormLabel>What did you accomplish?</FormLabel>
                <StyledTextArea
                  value={newAccomplishment}
                  onChange={(e) => setNewAccomplishment(e.target.value)}
                  placeholder="e.g., Completed a 5K run!"
                  autoFocus
                />
              </FormRow>
              <Button
                primary
                fullWidth
                onClick={handleAddAccomplishment}
                disabled={saving || !newAccomplishment.trim()}
              >
                {saving ? 'Saving...' : 'Add Win!'}
              </Button>
            </PopupContent>
          </PopupWindow>
        </PopupOverlay>
      )}
    </>
  );
}
