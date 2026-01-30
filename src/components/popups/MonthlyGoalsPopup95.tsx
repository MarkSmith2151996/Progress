'use client';

import { useState } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
  TextInput,
  GroupBox,
} from 'react95';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useGoalStore } from '@/stores/goalStore';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const PopupWindow = styled(Window)`
  width: 450px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
`;

const StyledWindowHeader = styled(WindowHeader)`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Content = styled(WindowContent)`
  flex: 1;
  overflow: auto;
`;

const GoalItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  margin-bottom: 4px;
  border: 1px solid #c0c0c0;
  background: #fff;
`;

const GoalText = styled.span`
  font-size: 12px;
  flex: 1;
`;

const AddGoalForm = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
`;

interface MonthlyGoalsPopup95Props {
  month: Date;
  isOpen: boolean;
  onClose: () => void;
}

export function MonthlyGoalsPopup95({
  month,
  isOpen,
  onClose,
}: MonthlyGoalsPopup95Props) {
  const { goals, addGoal, deleteGoal } = useGoalStore();
  const [newGoal, setNewGoal] = useState('');

  const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');

  // Get all goals (not just monthly type - show all active goals)
  const activeGoals = goals.filter((g) => g.status === 'active');

  if (!isOpen) return null;

  const handleAddGoal = async () => {
    if (!newGoal.trim()) return;

    await addGoal({
      goal_id: `g_${Date.now()}`,
      title: newGoal.trim(),
      type: 'monthly',
      parent_goal_id: null,
      target_value: 100,
      starting_value: 0,
      current_value: 0,
      unit: '%',
      start_date: monthStart,
      deadline: monthEnd,
      status: 'active',
      priority: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    setNewGoal('');
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (deleteGoal) {
      await deleteGoal(goalId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddGoal();
    }
  };

  return (
    <Overlay onClick={onClose}>
      <PopupWindow onClick={(e) => e.stopPropagation()}>
        <StyledWindowHeader>
          <span>{format(month, 'MMMM yyyy')} Goals</span>
          <Button size="sm" onClick={onClose}>
            X
          </Button>
        </StyledWindowHeader>
        <Content>
          <GroupBox label="My Goals">
            {activeGoals.length === 0 ? (
              <p style={{ fontSize: 12, color: '#666', padding: 8 }}>
                No goals yet. Add one below!
              </p>
            ) : (
              activeGoals.map((goal) => (
                <GoalItem key={goal.goal_id}>
                  <GoalText>{goal.title}</GoalText>
                  <Button
                    size="sm"
                    onClick={() => handleDeleteGoal(goal.goal_id)}
                    style={{ fontSize: 10, padding: '2px 6px', minWidth: 20 }}
                  >
                    X
                  </Button>
                </GoalItem>
              ))
            )}

            <AddGoalForm>
              <TextInput
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Get 1500 on SAT, Save $500, etc..."
                style={{ flex: 1 }}
              />
              <Button onClick={handleAddGoal} disabled={!newGoal.trim()}>
                Add
              </Button>
            </AddGoalForm>
          </GroupBox>

          <p style={{ fontSize: 10, color: '#888', marginTop: 8 }}>
            Just write your goal naturally. The AI coach will help track it.
          </p>

          <ButtonRow>
            <Button onClick={onClose}>Done</Button>
          </ButtonRow>
        </Content>
      </PopupWindow>
    </Overlay>
  );
}
