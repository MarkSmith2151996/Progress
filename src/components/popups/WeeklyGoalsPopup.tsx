'use client';

import { useState, useEffect } from 'react';
import { Popup } from '../shared/Popup';
import { Button } from '../shared/Button';
import { ProgressBar } from '../shared/ProgressBar';
import { useGoalStore } from '@/stores/goalStore';
import { Goal, GoalWithProgress } from '@/types';

interface WeeklyGoalsPopupProps {
  weekId: string;
  weekStart: string;
  weekEnd: string;
  isOpen: boolean;
  onClose: () => void;
}

export function WeeklyGoalsPopup({
  weekId,
  weekStart,
  weekEnd,
  isOpen,
  onClose,
}: WeeklyGoalsPopupProps) {
  const { goals, saveGoal, deleteGoal, getActiveGoals } = useGoalStore();
  const [weeklyGoals, setWeeklyGoals] = useState<Goal[]>([]);
  const [tasksNotes, setTasksNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [selectedParentGoal, setSelectedParentGoal] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const monthlyGoals = goals.filter((g) => g.type === 'monthly' && g.status === 'active');

  // Get weekly goals for this week
  useEffect(() => {
    const weekly = goals.filter(
      (g) =>
        g.type === 'weekly_chunk' &&
        g.start_date >= weekStart &&
        g.deadline <= weekEnd
    );
    setWeeklyGoals(weekly);
  }, [goals, weekStart, weekEnd]);

  const handleAddGoal = async () => {
    if (!newGoalTitle.trim()) return;

    const newGoal: Goal = {
      goal_id: `g_${Date.now()}`,
      title: newGoalTitle.trim(),
      type: 'weekly_chunk',
      parent_goal_id: selectedParentGoal,
      target_value: 100,
      starting_value: 0,
      current_value: 0,
      unit: '%',
      start_date: weekStart,
      deadline: weekEnd,
      status: 'active',
      priority: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await saveGoal(newGoal);
      setNewGoalTitle('');
      setSelectedParentGoal(null);
    } catch (error) {
      console.error('Failed to add goal:', error);
    }
  };

  const handleUpdateProgress = async (goal: Goal, newValue: number) => {
    try {
      await saveGoal({
        ...goal,
        current_value: newValue,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to update goal:', error);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      deleteGoal(goalId);
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  const formatDateRange = () => {
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });

    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()}-${end.getDate()}`;
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
  };

  return (
    <Popup
      isOpen={isOpen}
      onClose={onClose}
      title={`Week of ${formatDateRange()}`}
      subtitle={weekId}
      width="lg"
    >
      <div className="space-y-4">
        {/* Goals Section */}
        <div>
          <h3
            className="text-sm font-bold mb-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            WEEKLY GOALS
          </h3>

          <div className="space-y-3">
            {weeklyGoals.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No goals set for this week yet.
              </p>
            ) : (
              weeklyGoals.map((goal) => (
                <GoalRow
                  key={goal.goal_id}
                  goal={goal}
                  parentGoal={monthlyGoals.find((g) => g.goal_id === goal.parent_goal_id)}
                  onUpdateProgress={(v) => handleUpdateProgress(goal, v)}
                  onDelete={() => handleDeleteGoal(goal.goal_id)}
                  isEditing={isEditing}
                />
              ))
            )}
          </div>

          {/* Add Goal */}
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="+ Add weekly goal..."
                className="flex-1 px-3 py-2 rounded text-sm"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddGoal();
                }}
              />
              {newGoalTitle && (
                <Button onClick={handleAddGoal} size="sm">
                  Add
                </Button>
              )}
            </div>
            {newGoalTitle && monthlyGoals.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Link to:
                </span>
                <select
                  value={selectedParentGoal || ''}
                  onChange={(e) => setSelectedParentGoal(e.target.value || null)}
                  className="flex-1 px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <option value="">No link (standalone)</option>
                  {monthlyGoals.map((g) => (
                    <option key={g.goal_id} value={g.goal_id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Tasks/Notes Section */}
        <div>
          <h3
            className="text-sm font-bold mb-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            TASKS / NOTES
          </h3>
          <textarea
            value={tasksNotes}
            onChange={(e) => setTasksNotes(e.target.value)}
            placeholder="Plan your tasks for the week...
- Task 1
- Task 2
- Notes about the week..."
            className="w-full h-32 p-3 rounded resize-none text-sm"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Done Editing' : 'Edit Goals'}
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Popup>
  );
}

function GoalRow({
  goal,
  parentGoal,
  onUpdateProgress,
  onDelete,
  isEditing,
}: {
  goal: Goal;
  parentGoal?: Goal;
  onUpdateProgress: (value: number) => void;
  onDelete: () => void;
  isEditing: boolean;
}) {
  const progress = ((goal.current_value - goal.starting_value) / (goal.target_value - goal.starting_value)) * 100;

  return (
    <div
      className="p-3 rounded"
      style={{
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
          {goal.title}
        </span>
        {isEditing && (
          <button
            onClick={onDelete}
            className="text-xs px-2 py-1 rounded hover:bg-secondary"
            style={{ color: 'var(--accent-error)' }}
          >
            Delete
          </button>
        )}
      </div>
      {parentGoal && (
        <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          → {parentGoal.title}
        </div>
      )}

      <ProgressBar
        value={progress}
        size="sm"
        showPercentage
        color={
          goal.status === 'completed'
            ? 'success'
            : progress >= 70
            ? 'accent'
            : progress >= 40
            ? 'warning'
            : 'error'
        }
      />

      {isEditing && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="range"
            min={goal.starting_value}
            max={goal.target_value}
            value={goal.current_value}
            onChange={(e) => onUpdateProgress(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {goal.current_value}/{goal.target_value} {goal.unit}
          </span>
        </div>
      )}
    </div>
  );
}
