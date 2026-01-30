'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Popup } from '../shared/Popup';
import { Button } from '../shared/Button';
import { ProgressBar } from '../shared/ProgressBar';
import { useGoalStore } from '@/stores/goalStore';
import { Goal, GoalWithProgress } from '@/types';
import { enrichGoalWithProgress } from '@/lib/metrics';

interface MonthlyGoalsPopupProps {
  month: Date;
  isOpen: boolean;
  onClose: () => void;
}

export function MonthlyGoalsPopup({
  month,
  isOpen,
  onClose,
}: MonthlyGoalsPopupProps) {
  const { goals, saveGoal, deleteGoal } = useGoalStore();
  const [monthlyGoals, setMonthlyGoals] = useState<GoalWithProgress[]>([]);
  const [notes, setNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    target: '',
    starting: '',
    unit: '',
  });

  const monthStart = format(month, 'yyyy-MM-01');
  const monthEnd = format(new Date(month.getFullYear(), month.getMonth() + 1, 0), 'yyyy-MM-dd');

  useEffect(() => {
    const monthly = goals
      .filter((g) => g.type === 'monthly' && g.start_date.startsWith(format(month, 'yyyy-MM')))
      .map(enrichGoalWithProgress);
    setMonthlyGoals(monthly);
  }, [goals, month]);

  const handleAddGoal = async () => {
    if (!newGoal.title.trim() || !newGoal.target) return;

    const goal: Goal = {
      goal_id: `g_${Date.now()}`,
      title: newGoal.title.trim(),
      type: 'monthly',
      parent_goal_id: null,
      target_value: Number(newGoal.target),
      starting_value: Number(newGoal.starting) || 0,
      current_value: Number(newGoal.starting) || 0,
      unit: newGoal.unit || 'units',
      start_date: monthStart,
      deadline: monthEnd,
      status: 'active',
      priority: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await saveGoal(goal);
      setNewGoal({ title: '', target: '', starting: '', unit: '' });
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
    deleteGoal(goalId);
  };

  return (
    <Popup
      isOpen={isOpen}
      onClose={onClose}
      title={`${format(month, 'MMMM yyyy')} Goals`}
      width="lg"
    >
      <div className="space-y-4">
        {/* Goals List */}
        <div>
          <div className="space-y-3">
            {monthlyGoals.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No monthly goals set yet. Add your first goal below.
              </p>
            ) : (
              monthlyGoals.map((goal) => (
                <MonthlyGoalRow
                  key={goal.goal_id}
                  goal={goal}
                  onUpdateProgress={(v) => handleUpdateProgress(goal, v)}
                  onDelete={() => handleDeleteGoal(goal.goal_id)}
                  isEditing={isEditing}
                />
              ))
            )}
          </div>
        </div>

        {/* Add Goal Form */}
        <div
          className="p-4 rounded"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <h4 className="text-sm font-bold mb-3" style={{ color: 'var(--text-secondary)' }}>
            + Add Monthly Goal
          </h4>

          <div className="space-y-2">
            <input
              type="text"
              value={newGoal.title}
              onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
              placeholder="Goal title (e.g., SAT: 1340 → 1500)"
              className="w-full px-3 py-2 rounded text-sm"
              style={{
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            />

            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                value={newGoal.starting}
                onChange={(e) => setNewGoal({ ...newGoal, starting: e.target.value })}
                placeholder="Starting"
                className="px-3 py-2 rounded text-sm"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              />
              <input
                type="number"
                value={newGoal.target}
                onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                placeholder="Target"
                className="px-3 py-2 rounded text-sm"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              />
              <input
                type="text"
                value={newGoal.unit}
                onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })}
                placeholder="Unit"
                className="px-3 py-2 rounded text-sm"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              />
            </div>

            <Button
              onClick={handleAddGoal}
              disabled={!newGoal.title || !newGoal.target}
              size="sm"
            >
              Add Goal
            </Button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>
            NOTES
          </h4>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes for the month..."
            className="w-full h-24 p-3 rounded resize-none text-sm"
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

function MonthlyGoalRow({
  goal,
  onUpdateProgress,
  onDelete,
  isEditing,
}: {
  goal: GoalWithProgress;
  onUpdateProgress: (value: number) => void;
  onDelete: () => void;
  isEditing: boolean;
}) {
  return (
    <div
      className="p-4 rounded"
      style={{
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {goal.title}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                goal.statusIndicator === 'ahead'
                  ? 'bg-green-900/30'
                  : goal.statusIndicator === 'behind'
                  ? 'bg-red-900/30'
                  : 'bg-yellow-900/30'
              }`}
              style={{
                color:
                  goal.statusIndicator === 'ahead'
                    ? 'var(--accent-success)'
                    : goal.statusIndicator === 'behind'
                    ? 'var(--accent-error)'
                    : 'var(--accent-warning)',
              }}
            >
              {goal.statusIndicator === 'ahead'
                ? 'Ahead'
                : goal.statusIndicator === 'behind'
                ? 'Behind'
                : 'On Track'}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {goal.daysRemaining} days left
            </span>
          </div>
        </div>
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

      <ProgressBar
        value={goal.progress}
        size="md"
        showPercentage
        color={
          goal.statusIndicator === 'ahead'
            ? 'success'
            : goal.statusIndicator === 'behind'
            ? 'error'
            : 'accent'
        }
      />

      <div className="flex justify-between text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
        <span>
          {goal.current_value} / {goal.target_value} {goal.unit}
        </span>
        <span>Started: {goal.starting_value}</span>
      </div>

      {isEditing && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Current:
          </span>
          <input
            type="number"
            value={goal.current_value}
            onChange={(e) => onUpdateProgress(Number(e.target.value))}
            className="w-20 px-2 py-1 rounded text-sm"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          />
        </div>
      )}
    </div>
  );
}
