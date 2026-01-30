'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
  TextInput,
  GroupBox,
  AppBar,
  Toolbar,
} from 'react95';
import { useRouter } from 'next/navigation';
import { useLogStore } from '@/stores/logStore';
import { useGoalStore } from '@/stores/goalStore';

const MobileContainer = styled.div`
  padding: 8px;
  padding-bottom: 70px;
`;

const Section = styled(Window)`
  margin-bottom: 8px;
`;

const ListItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 8px;
  border-bottom: 1px solid #c0c0c0;
  min-height: 44px;
`;

const ItemText = styled.span`
  font-size: 14px;
`;

const AddForm = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px;
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

export default function MobileSettingsPage() {
  const router = useRouter();
  const [newHabit, setNewHabit] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [addingHabit, setAddingHabit] = useState(false);
  const [addingGoal, setAddingGoal] = useState(false);

  const { habits, fetchData } = useLogStore();
  const { goals, fetchGoals, addGoal, deleteGoal } = useGoalStore();

  useEffect(() => {
    fetchData();
    fetchGoals();
  }, []);

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
          target_minutes: null,
          days_active: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
          sort_order: habits.length,
          created_at: new Date().toISOString(),
        }),
      });
      setNewHabit('');
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
      await addGoal({
        goal_id: `g_${Date.now()}`,
        title: newGoal.trim(),
        type: 'monthly',
        parent_goal_id: null,
        target_value: 100,
        starting_value: 0,
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
        {/* Habits Section */}
        <Section>
          <WindowHeader>Habits</WindowHeader>
          <WindowContent style={{ padding: 0 }}>
            {habits.filter((h) => h.active).map((habit) => (
              <ListItem key={habit.habit_id}>
                <ItemText>{habit.name}</ItemText>
                <Button
                  size="sm"
                  onClick={() => handleDeleteHabit(habit.habit_id)}
                  style={{ minWidth: 44, minHeight: 44 }}
                >
                  X
                </Button>
              </ListItem>
            ))}
            <AddForm>
              <TextInput
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                placeholder="New habit..."
                style={{ flex: 1, fontSize: 14 }}
              />
              <Button
                onClick={handleAddHabit}
                disabled={addingHabit || !newHabit.trim()}
                style={{ minWidth: 60, minHeight: 44 }}
              >
                Add
              </Button>
            </AddForm>
          </WindowContent>
        </Section>

        {/* Goals Section */}
        <Section>
          <WindowHeader>Goals</WindowHeader>
          <WindowContent style={{ padding: 0 }}>
            {goals.filter((g) => g.status === 'active').map((goal) => (
              <ListItem key={goal.goal_id}>
                <ItemText>{goal.title}</ItemText>
                <Button
                  size="sm"
                  onClick={() => handleDeleteGoal(goal.goal_id)}
                  style={{ minWidth: 44, minHeight: 44 }}
                >
                  X
                </Button>
              </ListItem>
            ))}
            <AddForm>
              <TextInput
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="New goal..."
                style={{ flex: 1, fontSize: 14 }}
              />
              <Button
                onClick={handleAddGoal}
                disabled={addingGoal || !newGoal.trim()}
                style={{ minWidth: 60, minHeight: 44 }}
              >
                Add
              </Button>
            </AddForm>
          </WindowContent>
        </Section>

        {/* App Info */}
        <Section>
          <WindowHeader>About</WindowHeader>
          <WindowContent>
            <p style={{ fontSize: 12, marginBottom: 8 }}>
              <strong>Progress Tracker</strong> v0.1.0
            </p>
            <p style={{ fontSize: 11, color: '#666' }}>
              Personal productivity and goal tracking with AI coaching.
            </p>
            <p style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
              Data syncs with Google Sheets. Coach powered by Claude AI.
            </p>
          </WindowContent>
        </Section>
      </MobileContainer>

      {/* Fixed Taskbar */}
      <FixedTaskbar>
        <Toolbar style={{ justifyContent: 'space-around', padding: '4px' }}>
          <TaskbarButton onClick={() => router.push('/mobile')}>
            Home
          </TaskbarButton>
          <TaskbarButton onClick={() => router.push('/mobile/calendar')}>
            Calendar
          </TaskbarButton>
          <TaskbarButton onClick={() => router.push('/mobile/coach')}>
            Coach
          </TaskbarButton>
          <TaskbarButton active>
            Settings
          </TaskbarButton>
        </Toolbar>
      </FixedTaskbar>
    </>
  );
}
