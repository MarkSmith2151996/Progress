'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Window,
  WindowHeader,
  WindowContent,
  Button,
  TextInput,
  Select,
  GroupBox,
  ProgressBar,
} from 'react95';
import { format, parseISO } from 'date-fns';
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
  width: 500px;
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
  padding: 8px;
  margin-bottom: 8px;
  border: 1px solid #c0c0c0;
  background: #fff;
`;

const GoalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`;

const GoalTitle = styled.span`
  font-weight: bold;
  font-size: 12px;
`;

const AddGoalForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border: 1px solid #c0c0c0;
  background: #f0f0f0;
  margin-top: 8px;
`;

const FormRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
`;

interface WeeklyGoalsPopup95Props {
  weekId: string;
  weekStart: string;
  weekEnd: string;
  isOpen: boolean;
  onClose: () => void;
}

export function WeeklyGoalsPopup95({
  weekId,
  weekStart,
  weekEnd,
  isOpen,
  onClose,
}: WeeklyGoalsPopup95Props) {
  const { goals, addGoal, updateGoal } = useGoalStore();
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [parentGoalId, setParentGoalId] = useState<string | null>(null);

  const weeklyGoals = goals.filter(
    (g) => g.type === 'weekly_chunk' && g.start_date >= weekStart && g.start_date <= weekEnd
  );

  const monthlyGoals = goals.filter(
    (g) => g.type === 'monthly' && g.status === 'active'
  );

  if (!isOpen) return null;

  const formatDateRange = () => {
    const start = parseISO(weekStart);
    const end = parseISO(weekEnd);
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  };

  const handleAddGoal = async () => {
    if (!newTitle.trim()) return;

    await addGoal({
      goal_id: `g_${Date.now()}`,
      title: newTitle.trim(),
      type: 'weekly_chunk',
      parent_goal_id: parentGoalId,
      target_value: parseFloat(newTarget) || 100,
      starting_value: 0,
      current_value: 0,
      unit: newUnit || '%',
      start_date: weekStart,
      deadline: weekEnd,
      status: 'active',
      priority: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    setNewTitle('');
    setNewTarget('');
    setNewUnit('');
    setParentGoalId(null);
  };

  const calculateProgress = (goal: typeof goals[0]) => {
    if (goal.target_value === goal.starting_value) return 0;
    const progress =
      ((goal.current_value - goal.starting_value) /
        (goal.target_value - goal.starting_value)) *
      100;
    return Math.max(0, Math.min(100, Math.round(progress)));
  };

  return (
    <Overlay onClick={onClose}>
      <PopupWindow onClick={(e) => e.stopPropagation()}>
        <StyledWindowHeader>
          <span>Week of {formatDateRange()}</span>
          <Button size="sm" onClick={onClose}>
            X
          </Button>
        </StyledWindowHeader>
        <Content>
          <GroupBox label="Weekly Goals">
            {weeklyGoals.length === 0 ? (
              <p style={{ fontSize: 12, color: '#666' }}>No goals set for this week</p>
            ) : (
              weeklyGoals.map((goal) => (
                <GoalItem key={goal.goal_id}>
                  <GoalHeader>
                    <GoalTitle>{goal.title}</GoalTitle>
                    <span style={{ fontSize: 11 }}>{calculateProgress(goal)}%</span>
                  </GoalHeader>
                  <ProgressBar value={calculateProgress(goal)} />
                  <div style={{ fontSize: 10, marginTop: 4, color: '#666' }}>
                    {goal.current_value} / {goal.target_value} {goal.unit}
                  </div>
                </GoalItem>
              ))
            )}

            <AddGoalForm>
              <strong style={{ fontSize: 12 }}>Add New Goal</strong>
              <TextInput
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Goal title..."
                style={{ width: '100%' }}
              />
              <FormRow>
                <TextInput
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder="Target"
                  type="number"
                  style={{ width: 80 }}
                />
                <TextInput
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="Unit"
                  style={{ width: 80 }}
                />
              </FormRow>
              {monthlyGoals.length > 0 && (
                <Select
                  value={parentGoalId || ''}
                  onChange={(option) => setParentGoalId(option.value as string || null)}
                  options={[
                    { value: '', label: 'No parent goal' },
                    ...monthlyGoals.map((g) => ({
                      value: g.goal_id,
                      label: g.title,
                    })),
                  ]}
                  style={{ width: '100%' }}
                />
              )}
              <Button onClick={handleAddGoal} disabled={!newTitle.trim()}>
                Add Goal
              </Button>
            </AddGoalForm>
          </GroupBox>

          <ButtonRow>
            <Button onClick={onClose}>Close</Button>
          </ButtonRow>
        </Content>
      </PopupWindow>
    </Overlay>
  );
}
