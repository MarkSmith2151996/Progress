'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Button, ProgressBar } from 'react95';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useLogStore } from '@/stores/logStore';
import { useGoalStore } from '@/stores/goalStore';
import { Goal } from '@/types';
import {
  MobileContainer,
  MainWindow,
  ContentArea,
  TitleBar,
  TitleBarButton,
  ScrollArea,
  BottomTabs,
  BottomTab,
  ListContainer,
  ListItem,
  Checkbox,
  ListItemText,
  ListItemMeta,
  EmptyState,
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
} from '@/components/mobile/MobileShared';
import {
  Win95Icon,
} from '@/components/mobile/Win95Icons';

// Register service worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.error);
}

// ============================================
// WIN95 STYLED COMPONENTS
// ============================================

const GoalCard = styled.div<{ $clickable?: boolean }>`
  margin-bottom: 12px;
  padding: 12px;
  background: #c0c0c0;
  border: 2px solid;
  border-color: #dfdfdf #808080 #808080 #dfdfdf;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};

  &:hover {
    ${props => props.$clickable && `
      background: #d0d0d0;
    `}
  }

  &:active {
    ${props => props.$clickable && `
      border-color: #808080 #dfdfdf #dfdfdf #808080;
    `}
  }
`;

const GoalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const GoalTitle = styled.div`
  font-size: 13px;
  font-weight: bold;
  color: #000;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const GoalEditHint = styled.span`
  font-size: 10px;
  color: #808080;
  font-weight: normal;
`;

const GoalProgressWrapper = styled.div`
  margin-bottom: 4px;
`;

const GoalPercentage = styled.div`
  font-size: 11px;
  color: #000;
  text-align: center;
  margin-top: 4px;
`;

const TabIcon = styled.span`
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const TabLabel = styled.span`
  font-size: 9px;
  line-height: 1;
  white-space: nowrap;
`;

const EmptyStateIcon = styled.div`
  margin-bottom: 12px;
`;

const AccomplishmentItem = styled.div`
  display: flex;
  align-items: flex-start;
  padding: 10px 8px;
  border-bottom: 1px solid #c0c0c0;
  background: #fff;

  &:last-child {
    border-bottom: none;
  }
`;

const AccomplishmentContent = styled.div`
  flex: 1;
  margin-left: 8px;
`;

const AccomplishmentText = styled.div`
  font-size: 12px;
  color: #000;
`;

const AccomplishmentDate = styled.div`
  font-size: 10px;
  color: #808080;
  margin-top: 2px;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`;

// Tab identifiers
const TABS = {
  ACCOMPLISHMENTS: 0,
  HABITS: 1,
  MONTHLY: 2,
  SUMMARY: 3,
};

export default function MobilePage() {
  const router = useRouter();
  const [today] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState(TABS.SUMMARY);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showEditGoal, setShowEditGoal] = useState(false);
  const [showAddAccomplishment, setShowAddAccomplishment] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('');
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

  const { goals, fetchGoals, saveGoal, deleteGoal } = useGoalStore();

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
    if (log.notes && log.notes.trim()) {
      allAccomplishments.push({ text: log.notes, date: log.date });
    }
  });
  allAccomplishments.sort((a, b) => b.date.localeCompare(a.date));

  const isHabitCompleted = (habitId: string) => {
    return todayCompletions.some((c) => c.habit_id === habitId && c.completed);
  };

  const handleToggleHabit = async (habitId: string) => {
    await toggleHabit(habitId, today);
  };

  const getGoalProgress = (goal: Goal) => {
    if (!goal.target_value) return 0;
    const current = goal.current_value ?? goal.start_value ?? 0;
    return Math.min(100, Math.round((current / goal.target_value) * 100));
  };

  // Open edit popup for a goal
  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setNewGoalTitle(goal.title);
    setNewGoalTarget(String(goal.target_value || ''));
    setNewGoalCurrent(String(goal.current_value || 0));
    setShowEditGoal(true);
  };

  // Save edited goal
  const handleSaveEditedGoal = async () => {
    if (!editingGoal || !newGoalTitle.trim()) return;
    setSaving(true);

    try {
      const updatedGoal: Goal = {
        ...editingGoal,
        title: newGoalTitle.trim(),
        target_value: parseFloat(newGoalTarget) || 100,
        current_value: parseFloat(newGoalCurrent) || 0,
        updated_at: new Date().toISOString(),
      };

      await saveGoal(updatedGoal);
      setShowEditGoal(false);
      setEditingGoal(null);
      setNewGoalTitle('');
      setNewGoalTarget('');
      setNewGoalCurrent('');
    } catch (err) {
      console.error('Failed to update goal:', err);
    } finally {
      setSaving(false);
    }
  };

  // Delete goal
  const handleDeleteGoal = async () => {
    if (!editingGoal) return;
    setSaving(true);

    try {
      await deleteGoal(editingGoal.goal_id);
      setShowEditGoal(false);
      setEditingGoal(null);
    } catch (err) {
      console.error('Failed to delete goal:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddGoal = async () => {
    if (!newGoalTitle.trim()) return;
    setSaving(true);

    try {
      const goal: Goal = {
        goal_id: `goal_${Date.now()}`,
        title: newGoalTitle.trim(),
        type: 'monthly',
        target_value: parseFloat(newGoalTarget) || 100,
        current_value: 0,
        start_value: 0,
        status: 'active',
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
          <EmptyStateIcon>
            <Win95Icon $bg="#fff" $color="#ff0000" style={{ width: 40, height: 40, fontSize: 24 }}>◎</Win95Icon>
          </EmptyStateIcon>
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
            <GoalCard key={goal.goal_id} $clickable onClick={() => handleEditGoal(goal)}>
              <GoalHeader>
                <GoalTitle>
                  <Win95Icon $bg="#fff" $color="#ff0000">◎</Win95Icon>
                  {goal.title}
                </GoalTitle>
                <GoalEditHint>tap to edit</GoalEditHint>
              </GoalHeader>
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
    );
  };

  // Render Habits tab
  const renderHabits = () => {
    if (activeHabits.length === 0) {
      return (
        <EmptyState>
          <EmptyStateIcon>
            <Win95Icon $bg="#90EE90" $color="#008000" style={{ width: 40, height: 40, fontSize: 24 }}>✓</Win95Icon>
          </EmptyStateIcon>
          <EmptyStateTitle>No habits yet!</EmptyStateTitle>
          <EmptyStateText>
            Build good habits one day at a time. Add your first habit in Settings.
          </EmptyStateText>
          <Button onClick={() => router.push('/mobile/settings')}>
            Go to Settings
          </Button>
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
                  <ListItemMeta>
                    <Win95Icon $bg="#FFD700" $color="#800000" style={{ width: 16, height: 16, fontSize: 10 }}>★</Win95Icon>
                    {habit.streak}
                  </ListItemMeta>
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
            <EmptyStateIcon>
              <Win95Icon $bg="#ADD8E6" $color="#000080" style={{ width: 40, height: 40, fontSize: 24 }}>▦</Win95Icon>
            </EmptyStateIcon>
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
                <GoalCard key={goal.goal_id} $clickable onClick={() => handleEditGoal(goal)}>
                  <GoalHeader>
                    <GoalTitle>
                      <Win95Icon $bg="#ADD8E6" $color="#000080">▦</Win95Icon>
                      {goal.title}
                    </GoalTitle>
                    <GoalEditHint>tap to edit</GoalEditHint>
                  </GoalHeader>
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
          <EmptyStateIcon>
            <Win95Icon $bg="#FFD700" $color="#800000" style={{ width: 40, height: 40, fontSize: 24 }}>★</Win95Icon>
          </EmptyStateIcon>
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
              <Win95Icon $bg="#FFD700" $color="#800000">★</Win95Icon>
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
        <MainWindow>
          <TitleBar>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Win95Icon $bg="#fff" $color="#008000" style={{ width: 16, height: 16, fontSize: 10 }}>▊</Win95Icon>
              {getTabTitle()}
            </span>
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
                <Win95Icon $bg="#ADD8E6" $color="#000080" style={{ width: 14, height: 14, fontSize: 8, border: 'none' }}>▦</Win95Icon>
              </TitleBarButton>
              <TitleBarButton size="sm" onClick={() => router.push('/mobile/settings')}>
                <Win95Icon $bg="#c0c0c0" $color="#000" style={{ width: 14, height: 14, fontSize: 8, border: 'none' }}>⚙</Win95Icon>
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

        {/* Bottom Tab Navigation */}
        <BottomTabs>
          <BottomTab
            $active={activeTab === TABS.ACCOMPLISHMENTS}
            onClick={() => setActiveTab(TABS.ACCOMPLISHMENTS)}
          >
            <TabIcon>
              <Win95Icon $bg="#FFD700" $color="#800000" style={{ width: 18, height: 18, fontSize: 10 }}>★</Win95Icon>
            </TabIcon>
            <TabLabel>Wins</TabLabel>
          </BottomTab>
          <BottomTab
            $active={activeTab === TABS.HABITS}
            onClick={() => setActiveTab(TABS.HABITS)}
          >
            <TabIcon>
              <Win95Icon $bg="#90EE90" $color="#008000" style={{ width: 18, height: 18, fontSize: 10 }}>✓</Win95Icon>
            </TabIcon>
            <TabLabel>Habits</TabLabel>
          </BottomTab>
          <BottomTab
            $active={activeTab === TABS.MONTHLY}
            onClick={() => setActiveTab(TABS.MONTHLY)}
          >
            <TabIcon>
              <Win95Icon $bg="#ADD8E6" $color="#000080" style={{ width: 18, height: 18, fontSize: 10 }}>▦</Win95Icon>
            </TabIcon>
            <TabLabel>Monthly</TabLabel>
          </BottomTab>
          <BottomTab
            $active={activeTab === TABS.SUMMARY}
            onClick={() => setActiveTab(TABS.SUMMARY)}
          >
            <TabIcon>
              <Win95Icon $bg="#fff" $color="#008000" style={{ width: 18, height: 18, fontSize: 10 }}>▊</Win95Icon>
            </TabIcon>
            <TabLabel>Goals</TabLabel>
          </BottomTab>
        </BottomTabs>
      </MobileContainer>

      {/* Add Goal Popup */}
      {showAddGoal && (
        <PopupOverlay onClick={() => setShowAddGoal(false)}>
          <PopupWindow onClick={(e) => e.stopPropagation()}>
            <TitleBar>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Win95Icon $bg="#ADD8E6" $color="#000080" style={{ width: 14, height: 14, fontSize: 8 }}>▦</Win95Icon>
                Add Monthly Goal
              </span>
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

      {/* Edit Goal Popup */}
      {showEditGoal && editingGoal && (
        <PopupOverlay onClick={() => setShowEditGoal(false)}>
          <PopupWindow onClick={(e) => e.stopPropagation()}>
            <TitleBar>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Win95Icon $bg="#FFD700" $color="#000" style={{ width: 14, height: 14, fontSize: 8 }}>✎</Win95Icon>
                Edit Goal
              </span>
              <TitleBarButton size="sm" onClick={() => setShowEditGoal(false)}>
                ✕
              </TitleBarButton>
            </TitleBar>
            <PopupContent>
              <FormRow>
                <FormLabel>Goal Title</FormLabel>
                <StyledInput
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="Goal name"
                  autoFocus
                />
              </FormRow>
              <FormRow>
                <FormLabel>Current Progress</FormLabel>
                <StyledInput
                  type="number"
                  value={newGoalCurrent}
                  onChange={(e) => setNewGoalCurrent(e.target.value)}
                  placeholder="Current value"
                />
              </FormRow>
              <FormRow>
                <FormLabel>Target Value</FormLabel>
                <StyledInput
                  type="number"
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(e.target.value)}
                  placeholder="Target value"
                />
              </FormRow>
              <ButtonRow>
                <Button
                  primary
                  style={{ flex: 1 }}
                  onClick={handleSaveEditedGoal}
                  disabled={saving || !newGoalTitle.trim()}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  style={{ flex: 1, color: '#800000' }}
                  onClick={handleDeleteGoal}
                  disabled={saving}
                >
                  Delete
                </Button>
              </ButtonRow>
            </PopupContent>
          </PopupWindow>
        </PopupOverlay>
      )}

      {/* Add Accomplishment Popup */}
      {showAddAccomplishment && (
        <PopupOverlay onClick={() => setShowAddAccomplishment(false)}>
          <PopupWindow onClick={(e) => e.stopPropagation()}>
            <TitleBar>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Win95Icon $bg="#FFD700" $color="#800000" style={{ width: 14, height: 14, fontSize: 8 }}>★</Win95Icon>
                Add Accomplishment
              </span>
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
