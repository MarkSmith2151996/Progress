'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Button } from 'react95';
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
  TitleBarButton,
  InsetPanel,
  StyledGroupBox,
  GroupBoxLabel,
  IconBadge,
  StyledInput,
  AddFormRow,
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateText,
  FloatingActionButton,
  Taskbar,
  TaskbarButton,
  TaskbarIcon,
  PopupOverlay,
  PopupWindow,
} from '@/components/mobile/MobileShared';

// ============================================
// SETTINGS SPECIFIC STYLES
// ============================================

const ScrollContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-bottom: 20px;
`;

const SectionTitle = styled.div`
  background: linear-gradient(90deg, #000080, #1084d0);
  color: #fff;
  padding: 6px 8px;
  font-weight: bold;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 4px 0;
`;

const ListContainer = styled.div`
  background: #fff;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  margin: 0 4px 8px;
  max-height: 180px;
  overflow-y: auto;
`;

const ListItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 8px;
  border-bottom: 1px solid #e0e0e0;
  min-height: 44px;

  &:last-child {
    border-bottom: none;
  }

  &:nth-child(even) {
    background: #f8f8f8;
  }
`;

const ItemContent = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
`;

const ItemText = styled.span`
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DeleteButton = styled(Button)`
  min-width: 36px;
  min-height: 36px;
  padding: 0;
  font-size: 14px;
  color: #800000;
  margin-left: 8px;
`;

const AddRow = styled.div`
  display: flex;
  gap: 4px;
  padding: 8px;
  background: #c0c0c0;
  border-top: 1px solid #808080;
  margin: 0 4px 8px;
`;

const AboutSection = styled.div`
  background: #c0c0c0;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  margin: 8px 4px;
  padding: 12px;
`;

const AboutTitle = styled.div`
  font-size: 16px;
  font-weight: bold;
  font-style: italic;
  color: #ff00ff;
  text-shadow: 1px 1px 0 #800080;
  margin-bottom: 8px;
`;

const AboutText = styled.p`
  font-size: 11px;
  color: #000;
  margin: 4px 0;
  line-height: 1.4;
`;

const habitColors = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
  '#fd79a8', '#a29bfe', '#00b894', '#e17055', '#74b9ff',
];

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

export default function MobileSettingsPage() {
  const router = useRouter();
  const [newHabit, setNewHabit] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [addingHabit, setAddingHabit] = useState(false);
  const [addingGoal, setAddingGoal] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);

  const { habits, fetchData } = useLogStore();
  const { goals, fetchGoals, saveGoal, deleteGoal } = useGoalStore();

  useEffect(() => {
    fetchData();
    fetchGoals();
  }, []);

  const activeHabits = habits.filter((h) => h.active);
  const activeGoals = goals.filter((g) => g.status === 'active');

  const handleAddHabit = async () => {
    if (!newHabit.trim()) return;
    setAddingHabit(true);

    try {
      await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habit_id: `habit_${Date.now()}`,
          name: newHabit.trim(),
          active: true,
          streak: 0,
          best_streak: 0,
          target_minutes: null,
          days_active: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
          sort_order: habits.length,
          created_at: new Date().toISOString(),
        }),
      });
      setNewHabit('');
      setShowAddHabit(false);
      fetchData();
    } catch (err) {
      console.error('Failed to add habit:', err);
    } finally {
      setAddingHabit(false);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    try {
      await fetch(`/api/habits?id=${habitId}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error('Failed to delete habit:', err);
    }
  };

  const handleAddGoal = async () => {
    if (!newGoal.trim()) return;
    setAddingGoal(true);

    try {
      await saveGoal({
        goal_id: `g_${Date.now()}`,
        title: newGoal.trim(),
        type: 'monthly',
        parent_goal_id: null,
        target_value: 100,
        start_value: 0,
        current_value: 0,
        unit: '%',
        start_date: new Date().toISOString().split('T')[0],
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        priority: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setNewGoal('');
      setShowAddGoal(false);
    } catch (err) {
      console.error('Failed to add goal:', err);
    } finally {
      setAddingGoal(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (deleteGoal) {
      await deleteGoal(goalId);
    }
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
            <span>⚙️ Settings</span>
          </TitleBar>

          <ContentArea>
            <ScrollContent>
              {/* HABITS SECTION */}
              <SectionTitle>
                💪 Habits
                <Button
                  size="sm"
                  style={{ marginLeft: 'auto', fontSize: 10 }}
                  onClick={() => setShowAddHabit(true)}
                >
                  + Add
                </Button>
              </SectionTitle>
              <ListContainer>
                {activeHabits.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                    <div style={{ fontSize: 12, color: '#808080' }}>No habits yet</div>
                    <Button
                      size="sm"
                      style={{ marginTop: 8 }}
                      onClick={() => setShowAddHabit(true)}
                    >
                      + Add First Habit
                    </Button>
                  </div>
                ) : (
                  activeHabits.map((habit, index) => (
                    <ListItem key={habit.habit_id}>
                      <ItemContent>
                        <IconBadge $color={habitColors[index % habitColors.length]}>
                          {getHabitEmoji(habit.name)}
                        </IconBadge>
                        <ItemText>{habit.name}</ItemText>
                      </ItemContent>
                      <DeleteButton onClick={() => handleDeleteHabit(habit.habit_id)}>
                        ✕
                      </DeleteButton>
                    </ListItem>
                  ))
                )}
              </ListContainer>

              {/* GOALS SECTION */}
              <SectionTitle>
                🎯 Goals
                <Button
                  size="sm"
                  style={{ marginLeft: 'auto', fontSize: 10 }}
                  onClick={() => setShowAddGoal(true)}
                >
                  + Add
                </Button>
              </SectionTitle>
              <ListContainer>
                {activeGoals.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
                    <div style={{ fontSize: 12, color: '#808080' }}>No goals yet</div>
                    <Button
                      size="sm"
                      style={{ marginTop: 8 }}
                      onClick={() => setShowAddGoal(true)}
                    >
                      + Add First Goal
                    </Button>
                  </div>
                ) : (
                  activeGoals.map((goal) => (
                    <ListItem key={goal.goal_id}>
                      <ItemContent>
                        <IconBadge $color="#4ecdc4">🎯</IconBadge>
                        <ItemText>{goal.title}</ItemText>
                      </ItemContent>
                      <DeleteButton onClick={() => handleDeleteGoal(goal.goal_id)}>
                        ✕
                      </DeleteButton>
                    </ListItem>
                  ))
                )}
              </ListContainer>

              {/* ABOUT SECTION */}
              <SectionTitle>
                ℹ️ About
              </SectionTitle>
              <AboutSection>
                <AboutTitle>Progress95</AboutTitle>
                <AboutText>
                  <strong>Version:</strong> 1.0.0
                </AboutText>
                <AboutText>
                  Personal productivity and goal tracking with Windows 95 nostalgia.
                </AboutText>
                <AboutText style={{ marginTop: 8, color: '#808080' }}>
                  Data syncs with Google Sheets. Coach powered by Claude AI (desktop only).
                </AboutText>
                <div style={{
                  marginTop: 12,
                  padding: 8,
                  background: '#fff',
                  border: '2px inset #808080',
                  fontSize: 10,
                  textAlign: 'center'
                }}>
                  Built with ❤️ by Antonio
                </div>
              </AboutSection>
            </ScrollContent>
          </ContentArea>
        </MainWindow>

        {/* Floating Action Button */}
        <FloatingActionButton onClick={() => setShowAddHabit(true)}>
          📎
        </FloatingActionButton>

        {/* Taskbar */}
        <Taskbar>
          <TaskbarButton onClick={() => router.push('/mobile')}>
            <TaskbarIcon>🏠</TaskbarIcon>
          </TaskbarButton>
          <TaskbarButton onClick={() => router.push('/mobile/calendar')}>
            <TaskbarIcon>📅</TaskbarIcon>
          </TaskbarButton>
          <TaskbarButton onClick={() => setShowAddHabit(true)}>
            <TaskbarIcon>📝</TaskbarIcon>
          </TaskbarButton>
          <TaskbarButton $active>
            <TaskbarIcon>⚙️</TaskbarIcon>
          </TaskbarButton>
        </Taskbar>
      </MobileContainer>

      {/* Add Habit Popup */}
      {showAddHabit && (
        <PopupOverlay onClick={() => setShowAddHabit(false)}>
          <PopupWindow onClick={(e) => e.stopPropagation()}>
            <TitleBar>
              <span>💪 Add New Habit</span>
              <TitleBarButton onClick={() => setShowAddHabit(false)}>✕</TitleBarButton>
            </TitleBar>
            <div style={{ padding: 12, background: '#c0c0c0' }}>
              <p style={{ fontSize: 11, marginBottom: 8, color: '#000' }}>
                What habit do you want to build?
              </p>
              <StyledInput
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                placeholder="e.g., Go to gym, Read 30 min..."
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAddHabit()}
              />
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Button
                  primary
                  style={{ flex: 1 }}
                  onClick={handleAddHabit}
                  disabled={addingHabit || !newHabit.trim()}
                >
                  {addingHabit ? 'Adding...' : 'Add Habit'}
                </Button>
                <Button style={{ flex: 1 }} onClick={() => setShowAddHabit(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </PopupWindow>
        </PopupOverlay>
      )}

      {/* Add Goal Popup */}
      {showAddGoal && (
        <PopupOverlay onClick={() => setShowAddGoal(false)}>
          <PopupWindow onClick={(e) => e.stopPropagation()}>
            <TitleBar>
              <span>🎯 Add New Goal</span>
              <TitleBarButton onClick={() => setShowAddGoal(false)}>✕</TitleBarButton>
            </TitleBar>
            <div style={{ padding: 12, background: '#c0c0c0' }}>
              <p style={{ fontSize: 11, marginBottom: 8, color: '#000' }}>
                What do you want to achieve?
              </p>
              <StyledInput
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="e.g., SAT 1500+, Save $1000..."
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
              />
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Button
                  primary
                  style={{ flex: 1 }}
                  onClick={handleAddGoal}
                  disabled={addingGoal || !newGoal.trim()}
                >
                  {addingGoal ? 'Adding...' : 'Add Goal'}
                </Button>
                <Button style={{ flex: 1 }} onClick={() => setShowAddGoal(false)}>
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
