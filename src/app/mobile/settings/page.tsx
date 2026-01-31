'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Button } from 'react95';
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
  SectionHeader,
  ListContainer,
  ListItem,
  ListItemText,
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateText,
  PopupOverlay,
  PopupWindow,
  PopupContent,
  StyledInput,
  FormRow,
  FormLabel,
} from '@/components/mobile/MobileShared';

// ============================================
// SETTINGS SPECIFIC STYLES
// ============================================

const SettingsList = styled.div`
  background: #fff;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  margin: 4px 0;
`;

const SettingsItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 8px;
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
  gap: 8px;
`;

const ItemIcon = styled.span`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.color || '#4ecdc4'};
  border: 1px solid #000;
  border-radius: 2px;
  font-size: 12px;
  flex-shrink: 0;
`;

const ItemText = styled.span`
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DeleteButton = styled(Button)`
  min-width: 32px;
  min-height: 32px;
  padding: 0;
  font-size: 12px;
  color: #800000;
  margin-left: 8px;
`;

const AboutSection = styled.div`
  background: #c0c0c0;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  margin: 8px 0;
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

const BackButton = styled(Button)`
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
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
        {/* Main Window */}
        <MainWindow style={{ marginBottom: 70 }}>
          <TitleBar>
            <span>⚙️ Settings</span>
            <TitleBarButton size="sm" onClick={() => router.push('/mobile')}>
              ✕
            </TitleBarButton>
          </TitleBar>

          <ContentArea>
            <ScrollArea>
              {/* HABITS SECTION */}
              <SectionHeader>
                💪 Habits
              </SectionHeader>
              <SettingsList>
                {activeHabits.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                    <div style={{ fontSize: 12, color: '#808080' }}>No habits yet</div>
                  </div>
                ) : (
                  activeHabits.map((habit, index) => (
                    <SettingsItem key={habit.habit_id}>
                      <ItemContent>
                        <ItemIcon color={habitColors[index % habitColors.length]}>
                          {getHabitEmoji(habit.name)}
                        </ItemIcon>
                        <ItemText>{habit.name}</ItemText>
                      </ItemContent>
                      <DeleteButton onClick={() => handleDeleteHabit(habit.habit_id)}>
                        ✕
                      </DeleteButton>
                    </SettingsItem>
                  ))
                )}
              </SettingsList>
              <Button fullWidth onClick={() => setShowAddHabit(true)}>
                + Add Habit
              </Button>

              {/* GOALS SECTION */}
              <SectionHeader style={{ marginTop: 16 }}>
                🎯 Goals
              </SectionHeader>
              <SettingsList>
                {activeGoals.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
                    <div style={{ fontSize: 12, color: '#808080' }}>No goals yet</div>
                  </div>
                ) : (
                  activeGoals.map((goal) => (
                    <SettingsItem key={goal.goal_id}>
                      <ItemContent>
                        <ItemIcon color="#4ecdc4">🎯</ItemIcon>
                        <ItemText>{goal.title}</ItemText>
                      </ItemContent>
                      <DeleteButton onClick={() => handleDeleteGoal(goal.goal_id)}>
                        ✕
                      </DeleteButton>
                    </SettingsItem>
                  ))
                )}
              </SettingsList>
              <Button fullWidth onClick={() => setShowAddGoal(true)}>
                + Add Goal
              </Button>

              {/* NAVIGATION */}
              <SectionHeader style={{ marginTop: 16 }}>
                📍 Navigation
              </SectionHeader>
              <SettingsList>
                <SettingsItem onClick={() => router.push('/mobile/calendar')} style={{ cursor: 'pointer' }}>
                  <ItemContent>
                    <ItemIcon color="#74b9ff">📅</ItemIcon>
                    <ItemText>View Calendar</ItemText>
                  </ItemContent>
                  <span style={{ color: '#808080' }}>→</span>
                </SettingsItem>
              </SettingsList>

              {/* ABOUT SECTION */}
              <SectionHeader style={{ marginTop: 16 }}>
                ℹ️ About
              </SectionHeader>
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
            </ScrollArea>
          </ContentArea>
        </MainWindow>

        {/* Back Button */}
        <BackButton onClick={() => router.push('/mobile')}>
          ← Back to Home
        </BackButton>
      </MobileContainer>

      {/* Add Habit Popup */}
      {showAddHabit && (
        <PopupOverlay onClick={() => setShowAddHabit(false)}>
          <PopupWindow onClick={(e) => e.stopPropagation()}>
            <TitleBar>
              <span>💪 Add New Habit</span>
              <TitleBarButton size="sm" onClick={() => setShowAddHabit(false)}>✕</TitleBarButton>
            </TitleBar>
            <PopupContent>
              <FormRow>
                <FormLabel>What habit do you want to build?</FormLabel>
                <StyledInput
                  value={newHabit}
                  onChange={(e) => setNewHabit(e.target.value)}
                  placeholder="e.g., Go to gym, Read 30 min..."
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleAddHabit()}
                />
              </FormRow>
              <div style={{ display: 'flex', gap: 8 }}>
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
            </PopupContent>
          </PopupWindow>
        </PopupOverlay>
      )}

      {/* Add Goal Popup */}
      {showAddGoal && (
        <PopupOverlay onClick={() => setShowAddGoal(false)}>
          <PopupWindow onClick={(e) => e.stopPropagation()}>
            <TitleBar>
              <span>🎯 Add New Goal</span>
              <TitleBarButton size="sm" onClick={() => setShowAddGoal(false)}>✕</TitleBarButton>
            </TitleBar>
            <PopupContent>
              <FormRow>
                <FormLabel>What do you want to achieve?</FormLabel>
                <StyledInput
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  placeholder="e.g., SAT 1500+, Save $1000..."
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                />
              </FormRow>
              <div style={{ display: 'flex', gap: 8 }}>
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
            </PopupContent>
          </PopupWindow>
        </PopupOverlay>
      )}
    </>
  );
}
