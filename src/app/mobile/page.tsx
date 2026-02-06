'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Button, ProgressBar } from 'react95';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useLogStore } from '@/stores/logStore';
import { useGoalStore } from '@/stores/goalStore';
import { Goal, Habit, HabitWithStatus, GoalType, GoalStatus, Task, TaskStatus } from '@/types';
import { useCoachStore } from '@/stores/coachStore';
import { useSettingsStore } from '@/stores/settingsStore';
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
  StyledSelect,
  ToggleButton,
  ToggleGroup,
  FormRow,
  FormLabel,
  SectionHeader,
  AddButton,
  SyncStatusBar,
  SyncStatusText,
  SyncStatusIcon,
  RefreshButton,
} from '@/components/mobile/MobileShared';
import { SyncStatus } from '@/stores/goalStore';
import { IncrementType } from '@/types';
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

const Toast = styled.div<{ $visible: boolean }>`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: #008000;
  color: #fff;
  padding: 12px 20px;
  border: 2px solid;
  border-color: #00a000 #004000 #004000 #00a000;
  font-size: 12px;
  font-family: 'MS Sans Serif', sans-serif;
  z-index: 1000;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.3s ease;
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
  max-width: 90%;
  text-align: center;
`;

const KeywordTag = styled.span`
  display: inline-block;
  background: #c0c0c0;
  border: 1px solid #808080;
  padding: 2px 6px;
  margin: 2px;
  font-size: 10px;
`;

const KeywordInput = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  border: 2px inset #dfdfdf;
  background: #fff;
  min-height: 32px;
`;

// Tab identifiers
const TABS = {
  ACCOMPLISHMENTS: 0,
  TODO: 1,
  MONTHLY: 2,
  SUMMARY: 3,
  COACH: 4,
};

// ============================================
// COACH STYLED COMPONENTS
// ============================================

const CoachContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

const CoachMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  background: #fff;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  box-shadow: inset 1px 1px 0 #0a0a0a;
  margin: 4px 0;
`;

const CoachBubble = styled.div<{ $role: 'user' | 'assistant' }>`
  max-width: 85%;
  padding: 8px 10px;
  margin-bottom: 8px;
  font-size: 12px;
  line-height: 1.4;
  background: ${props => props.$role === 'user' ? '#000080' : '#c0c0c0'};
  color: ${props => props.$role === 'user' ? '#fff' : '#000'};
  border: 2px solid;
  border-color: ${props => props.$role === 'user'
    ? '#4040c0 #000040 #000040 #4040c0'
    : '#dfdfdf #808080 #808080 #dfdfdf'};
  margin-left: ${props => props.$role === 'user' ? 'auto' : '0'};
  margin-right: ${props => props.$role === 'user' ? '0' : 'auto'};
  word-wrap: break-word;
`;

const CoachTimestamp = styled.div`
  font-size: 9px;
  color: #808080;
  margin-top: 2px;
`;

const CoachStatus = styled.div<{ $online: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  padding: 4px 8px;
  background: ${props => props.$online ? '#90EE90' : '#FFD700'};
  border-bottom: 1px solid #808080;
  font-weight: bold;
`;

const StatusDot = styled.span<{ $online: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$online ? '#008000' : '#808080'};
`;

const TypingIndicator = styled.div`
  padding: 8px 10px;
  font-size: 12px;
  color: #808080;
  font-style: italic;
  background: #c0c0c0;
  border: 2px solid;
  border-color: #dfdfdf #808080 #808080 #dfdfdf;
  max-width: 120px;
  margin-bottom: 8px;
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const CoachInputRow = styled.div`
  display: flex;
  gap: 4px;
  padding: 4px 0;
`;

const CoachInput = styled.input`
  flex: 1;
  padding: 6px 8px;
  font-size: 13px;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  box-shadow: inset 1px 1px 0 #0a0a0a;
  background: #fff;
  font-family: inherit;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: #808080;
  }
`;

const DigestCard = styled.div`
  padding: 12px;
  background: #fff;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  box-shadow: inset 1px 1px 0 #0a0a0a;
  margin: 4px 0;
`;

const DigestDate = styled.div`
  font-size: 11px;
  color: #808080;
  margin-bottom: 8px;
  font-weight: bold;
`;

const DigestContent = styled.div`
  font-size: 12px;
  line-height: 1.5;
  color: #000;
  white-space: pre-wrap;
`;

const DashboardStat = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 8px;
  border-bottom: 1px solid #c0c0c0;
  background: #fff;

  &:last-child {
    border-bottom: none;
  }
`;

const StatLabel = styled.span`
  font-size: 12px;
  color: #000;
`;

const StatValue = styled.span<{ $color?: string }>`
  font-size: 14px;
  font-weight: bold;
  color: ${props => props.$color || '#000080'};
`;

export default function MobilePage() {
  const router = useRouter();
  const [today] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { default_tab, accent_color, font_size } = useSettingsStore();
  const [activeTab, setActiveTab] = useState(default_tab);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showEditGoal, setShowEditGoal] = useState(false);
  const [showAddAccomplishment, setShowAddAccomplishment] = useState(false);
  const [showEditHabit, setShowEditHabit] = useState(false);
  const [showEditAccomplishment, setShowEditAccomplishment] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editingAccomplishment, setEditingAccomplishment] = useState<{ text: string; date: string; index: number } | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [newGoalStatus, setNewGoalStatus] = useState<GoalStatus>('active');
  const [newGoalType, setNewGoalType] = useState<GoalType>('monthly');
  const [newGoalKeywords, setNewGoalKeywords] = useState<string[]>([]);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [newGoalIncrementType, setNewGoalIncrementType] = useState<IncrementType>('count');
  const [newAccomplishment, setNewAccomplishment] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [editAccomplishmentText, setEditAccomplishmentText] = useState('');
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitTarget, setNewHabitTarget] = useState('');
  const [newHabitActive, setNewHabitActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Coach state
  const [coachSubTab, setCoachSubTab] = useState<'chat' | 'digest' | 'dashboard'>('chat');
  const [coachInput, setCoachInput] = useState('');

  const {
    chatHistory,
    isLoadingChat,
    coachOnline,
    latestDigest,
    digestHistory,
    sendMessage: sendCoachMsg,
    initSession,
    fetchDigest,
    fetchDigestHistory,
    cleanup: cleanupCoach,
  } = useCoachStore();

  // To Do sub-tab state
  const [todoSubTab, setTodoSubTab] = useState<'habits' | 'tasks'>('habits');
  const [taskViewDate, setTaskViewDate] = useState(today);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [addTodoType, setAddTodoType] = useState<'habit' | 'task'>('task');
  const [showEditTask, setShowEditTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPlannedDate, setNewTaskPlannedDate] = useState(today);
  const [newTaskGoalId, setNewTaskGoalId] = useState<string | null>(null);
  const [newTaskTimeEstimated, setNewTaskTimeEstimated] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');

  const {
    habits,
    habitCompletions,
    dailyLogs,
    tasks,
    fetchData,
    toggleHabit,
    saveDailyLog,
    updateHabit,
    deleteHabit,
    saveTask,
    deleteTask,
    toggleTask,
    addHabit,
    getTodayHabits,
    syncStatus: logSyncStatus,
    goalUpdateMessage,
    clearGoalUpdateMessage,
  } = useLogStore();

  const { goals, fetchGoals, saveGoal, deleteGoal, syncStatus: goalSyncStatus, subscribeToRealtime, unsubscribeFromRealtime } = useGoalStore();

  // Combined sync status - if either is offline/error, show that
  const syncStatus: SyncStatus =
    goalSyncStatus === 'error' || logSyncStatus === 'error' ? 'error' :
    goalSyncStatus === 'syncing' || logSyncStatus === 'syncing' ? 'syncing' :
    goalSyncStatus === 'offline' || logSyncStatus === 'offline' ? 'offline' :
    'synced';

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchData(), fetchGoals()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getSyncStatusLabel = () => {
    switch (syncStatus) {
      case 'synced': return 'Cloud Synced';
      case 'offline': return 'Offline Mode';
      case 'syncing': return 'Syncing...';
      case 'error': return 'Sync Error';
      default: return 'Unknown';
    }
  };

  // Apply visual settings
  useEffect(() => {
    if (accent_color) {
      document.documentElement.style.setProperty('--accent-color', accent_color);
    }
    if (font_size) {
      document.documentElement.setAttribute('data-font-size', font_size);
    }
  }, [accent_color, font_size]);

  useEffect(() => {
    fetchData();
    fetchGoals();
    subscribeToRealtime();
    initSession();
    fetchDigest();
    fetchDigestHistory();

    return () => {
      unsubscribeFromRealtime();
      cleanupCoach();
    };
  }, []);

  // Show toast when goal is auto-updated
  useEffect(() => {
    if (goalUpdateMessage) {
      setToastMessage(goalUpdateMessage);
      setToastVisible(true);

      const timer = setTimeout(() => {
        setToastVisible(false);
        setTimeout(() => {
          clearGoalUpdateMessage();
          setToastMessage(null);
        }, 300);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [goalUpdateMessage, clearGoalUpdateMessage]);

  const activeHabits = getTodayHabits();
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
    const current = goal.current_value ?? goal.starting_value ?? 0;
    return Math.min(100, Math.round((current / goal.target_value) * 100));
  };

  // Open edit popup for a goal
  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setNewGoalTitle(goal.title);
    setNewGoalTarget(String(goal.target_value || ''));
    setNewGoalCurrent(String(goal.current_value || 0));
    setNewGoalDeadline(goal.deadline || '');
    setNewGoalStatus(goal.status || 'active');
    setNewGoalType(goal.type || 'monthly');
    setNewGoalKeywords(goal.keywords || []);
    setNewGoalIncrementType(goal.increment_type || 'count');
    setNewKeywordInput('');
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
        deadline: newGoalDeadline || editingGoal.deadline,
        status: newGoalStatus,
        type: newGoalType,
        keywords: newGoalKeywords.length > 0 ? newGoalKeywords : undefined,
        increment_type: newGoalIncrementType,
        updated_at: new Date().toISOString(),
      };

      await saveGoal(updatedGoal);
      setShowEditGoal(false);
      setEditingGoal(null);
      setNewGoalTitle('');
      setNewGoalTarget('');
      setNewGoalCurrent('');
      setNewGoalDeadline('');
      setNewGoalStatus('active');
      setNewGoalType('monthly');
      setNewGoalKeywords([]);
      setNewGoalIncrementType('count');
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

  // Auto-generate keywords from goal title
  const generateKeywordsFromTitle = (title: string): string[] => {
    // Common words to exclude
    const stopWords = new Set(['a', 'an', 'the', 'to', 'of', 'in', 'for', 'and', 'or', 'my', 'i']);

    // Extract words, filter out numbers and stop words, lowercase
    const words = title
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !stopWords.has(w));

    // Return unique keywords
    return [...new Set(words)];
  };

  const handleAddGoal = async () => {
    if (!newGoalTitle.trim()) return;
    setSaving(true);

    try {
      // Auto-generate keywords from title
      const autoKeywords = generateKeywordsFromTitle(newGoalTitle);

      const goal: Goal = {
        goal_id: `goal_${Date.now()}`,
        title: newGoalTitle.trim(),
        type: 'monthly',
        parent_goal_id: null,
        target_value: parseFloat(newGoalTarget) || 1,
        starting_value: 0,
        current_value: 0,
        unit: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        deadline: format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd'),
        status: 'active',
        priority: 1,
        keywords: autoKeywords,
        increment_type: 'count',
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
        day_type: existingLog?.day_type ?? null,
        energy_level: existingLog?.energy_level ?? 3,
        hours_slept: existingLog?.hours_slept ?? 7,
        work_hours: existingLog?.work_hours ?? 0,
        school_hours: existingLog?.school_hours ?? 0,
        free_hours: existingLog?.free_hours ?? null,
        overall_rating: existingLog?.overall_rating ?? 3,
        notes: existingLog?.notes ?? '',
        sick: existingLog?.sick ?? false,
        accomplishments: [...currentAccomplishments, newAccomplishment.trim()],
        created_at: existingLog?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Pass goals and saveGoal callback for smart goal updates
      await saveDailyLog(updatedLog, goals, saveGoal);
      setNewAccomplishment('');
      setShowAddAccomplishment(false);
    } catch (err) {
      console.error('Failed to add accomplishment:', err);
    } finally {
      setSaving(false);
    }
  };

  // Helper functions for keyword management
  const handleAddKeyword = () => {
    const keyword = newKeywordInput.trim().toLowerCase();
    if (keyword && !newGoalKeywords.includes(keyword)) {
      setNewGoalKeywords([...newGoalKeywords, keyword]);
      setNewKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setNewGoalKeywords(newGoalKeywords.filter((k) => k !== keyword));
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  // ============================================
  // TASK HANDLERS
  // ============================================

  const resetTaskForm = () => {
    setNewTaskDescription('');
    setNewTaskPlannedDate(today);
    setNewTaskGoalId(null);
    setNewTaskTimeEstimated('');
    setNewTaskNotes('');
  };

  const handleToggleTask = async (taskId: string) => {
    await toggleTask(taskId);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setNewTaskDescription(task.description);
    setNewTaskPlannedDate(task.planned_date);
    setNewTaskGoalId(task.goal_id);
    setNewTaskTimeEstimated(task.time_estimated ? String(task.time_estimated) : '');
    setNewTaskNotes(task.notes || '');
    setShowEditTask(true);
  };

  const handleSaveEditedTask = async () => {
    if (!editingTask || !newTaskDescription.trim()) return;
    setSaving(true);

    try {
      const updatedTask: Task = {
        ...editingTask,
        description: newTaskDescription.trim(),
        planned_date: newTaskPlannedDate,
        goal_id: newTaskGoalId,
        time_estimated: newTaskTimeEstimated ? parseInt(newTaskTimeEstimated) : null,
        notes: newTaskNotes.trim() || null,
      };

      await saveTask(updatedTask);
      setShowEditTask(false);
      setEditingTask(null);
      resetTaskForm();
    } catch (err) {
      console.error('Failed to update task:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!editingTask) return;
    setSaving(true);

    try {
      await deleteTask(editingTask.task_id);
      setShowEditTask(false);
      setEditingTask(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskDescription.trim()) return;
    setSaving(true);

    try {
      const task: Task = {
        task_id: `task_${Date.now()}`,
        goal_id: newTaskGoalId,
        description: newTaskDescription.trim(),
        planned_date: newTaskPlannedDate,
        completed_date: null,
        status: 'planned',
        time_estimated: newTaskTimeEstimated ? parseInt(newTaskTimeEstimated) : null,
        time_actual: null,
        difficulty: null,
        notes: newTaskNotes.trim() || null,
        created_at: new Date().toISOString(),
      };

      await saveTask(task);
      resetTaskForm();
      setShowAddTodo(false);
    } catch (err) {
      console.error('Failed to add task:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddHabitFromTodo = async () => {
    if (!newHabitName.trim()) return;
    setSaving(true);

    try {
      await addHabit({
        habit_id: `habit_${Date.now()}`,
        name: newHabitName.trim(),
        target_minutes: newHabitTarget ? parseInt(newHabitTarget) : null,
        days_active: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        active: true,
        sort_order: habits.length,
        created_at: new Date().toISOString(),
      });
      setNewHabitName('');
      setNewHabitTarget('');
      setShowAddTodo(false);
      setTodoSubTab('habits');
    } catch (err) {
      console.error('Failed to add habit:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTaskDatePrev = () => {
    const d = new Date(taskViewDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setTaskViewDate(format(d, 'yyyy-MM-dd'));
  };

  const handleTaskDateNext = () => {
    const d = new Date(taskViewDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setTaskViewDate(format(d, 'yyyy-MM-dd'));
  };

  const handleTaskDateToday = () => {
    setTaskViewDate(today);
  };

  // Open edit popup for a habit
  const handleEditHabit = (habit: Habit, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingHabit(habit);
    setNewHabitName(habit.name);
    setNewHabitTarget(String(habit.target_minutes || ''));
    setNewHabitActive(habit.active);
    setShowEditHabit(true);
  };

  // Save edited habit
  const handleSaveEditedHabit = async () => {
    if (!editingHabit || !newHabitName.trim()) return;
    setSaving(true);

    try {
      const updatedHabit: Habit = {
        ...editingHabit,
        name: newHabitName.trim(),
        target_minutes: newHabitTarget ? parseInt(newHabitTarget) : null,
        active: newHabitActive,
      };

      await updateHabit(updatedHabit);
      setShowEditHabit(false);
      setEditingHabit(null);
      setNewHabitName('');
      setNewHabitTarget('');
      setNewHabitActive(true);
    } catch (err) {
      console.error('Failed to update habit:', err);
    } finally {
      setSaving(false);
    }
  };

  // Delete habit
  const handleDeleteHabit = async () => {
    if (!editingHabit) return;
    setSaving(true);

    try {
      await deleteHabit(editingHabit.habit_id);
      setShowEditHabit(false);
      setEditingHabit(null);
    } catch (err) {
      console.error('Failed to delete habit:', err);
    } finally {
      setSaving(false);
    }
  };

  // Open edit popup for an accomplishment
  const handleEditAccomplishment = (acc: { text: string; date: string }, index: number) => {
    setEditingAccomplishment({ ...acc, index });
    setEditAccomplishmentText(acc.text);
    setShowEditAccomplishment(true);
  };

  // Save edited accomplishment
  const handleSaveEditedAccomplishment = async () => {
    if (!editingAccomplishment || !editAccomplishmentText.trim()) return;
    setSaving(true);

    try {
      const log = dailyLogs.find((l) => l.date === editingAccomplishment.date);
      if (!log) return;

      // Find and update the accomplishment in the log
      const accomplishments = log.accomplishments ? [...log.accomplishments] : [];
      const accIndex = accomplishments.indexOf(editingAccomplishment.text);
      if (accIndex >= 0) {
        accomplishments[accIndex] = editAccomplishmentText.trim();
      }

      const updatedLog = {
        ...log,
        accomplishments,
        updated_at: new Date().toISOString(),
      };

      await saveDailyLog(updatedLog);
      setShowEditAccomplishment(false);
      setEditingAccomplishment(null);
      setEditAccomplishmentText('');
    } catch (err) {
      console.error('Failed to update accomplishment:', err);
    } finally {
      setSaving(false);
    }
  };

  // Delete accomplishment
  const handleDeleteAccomplishment = async () => {
    if (!editingAccomplishment) return;
    setSaving(true);

    try {
      const log = dailyLogs.find((l) => l.date === editingAccomplishment.date);
      if (!log) return;

      // Remove the accomplishment from the log
      const accomplishments = log.accomplishments
        ? log.accomplishments.filter((acc) => acc !== editingAccomplishment.text)
        : [];

      const updatedLog = {
        ...log,
        accomplishments,
        updated_at: new Date().toISOString(),
      };

      await saveDailyLog(updatedLog);
      setShowEditAccomplishment(false);
      setEditingAccomplishment(null);
      setEditAccomplishmentText('');
    } catch (err) {
      console.error('Failed to delete accomplishment:', err);
    } finally {
      setSaving(false);
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case TABS.ACCOMPLISHMENTS:
        return 'Accomplishments';
      case TABS.TODO:
        return 'To Do';
      case TABS.MONTHLY:
        return 'Monthly Goals';
      case TABS.COACH:
        return 'Coach';
      case TABS.SUMMARY:
      default:
        return 'Goal Summary';
    }
  };

  // ============================================
  // COACH TAB RENDERING
  // ============================================

  const handleSendCoachMessage = () => {
    const msg = coachInput.trim();
    if (!msg) return;
    sendCoachMsg(msg);
    setCoachInput('');
  };

  const renderCoachChat = () => (
    <CoachContainer>
      <CoachStatus $online={coachOnline}>
        <StatusDot $online={coachOnline} />
        Coach: {coachOnline ? 'Online' : 'Offline'}
      </CoachStatus>
      <CoachMessages>
        {chatHistory.length === 0 && (
          <EmptyState style={{ minHeight: 120, padding: '20px 16px' }}>
            <EmptyStateTitle>Chat with your Coach</EmptyStateTitle>
            <EmptyStateText>
              Send a message to get personalized insights about your progress.
            </EmptyStateText>
          </EmptyState>
        )}
        {chatHistory.map((msg) => (
          <CoachBubble key={msg.id} $role={msg.role}>
            {msg.content}
            <CoachTimestamp>
              {format(new Date(msg.timestamp), 'h:mm a')}
            </CoachTimestamp>
          </CoachBubble>
        ))}
        {isLoadingChat && (
          <TypingIndicator>Thinking...</TypingIndicator>
        )}
      </CoachMessages>
      <CoachInputRow>
        <CoachInput
          value={coachInput}
          onChange={(e) => setCoachInput(e.target.value)}
          inputMode="none"
          placeholder="Ask your coach..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendCoachMessage();
          }}
        />
        <Button onClick={handleSendCoachMessage} disabled={isLoadingChat || !coachInput.trim()}>
          Send
        </Button>
      </CoachInputRow>
    </CoachContainer>
  );

  const renderCoachDigest = () => (
    <>
      {latestDigest ? (
        <DigestCard>
          <DigestDate>
            {format(new Date(latestDigest.digest_date), 'EEEE, MMM d')} - Daily Digest
          </DigestDate>
          <DigestContent>{latestDigest.content}</DigestContent>
        </DigestCard>
      ) : (
        <EmptyState>
          <EmptyStateTitle>No Digest Yet</EmptyStateTitle>
          <EmptyStateText>
            The coach server generates a daily digest each morning. Make sure the server is running on your PC.
          </EmptyStateText>
        </EmptyState>
      )}
      {digestHistory.length > 1 && (
        <>
          <SectionHeader>Previous Digests</SectionHeader>
          {digestHistory.slice(1).map((d) => (
            <DigestCard key={d.id}>
              <DigestDate>{format(new Date(d.digest_date), 'EEE, MMM d')}</DigestDate>
              <DigestContent>{d.content}</DigestContent>
            </DigestCard>
          ))}
        </>
      )}
    </>
  );

  const renderCoachDashboard = () => {
    const completedHabitsToday = todayCompletions.filter((c) => c.completed).length;
    const totalHabitsToday = activeHabits.length;
    const habitRate = totalHabitsToday > 0 ? Math.round((completedHabitsToday / totalHabitsToday) * 100) : 0;
    const weekTasks = tasks.filter((t) => {
      const d = new Date(t.planned_date);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= weekAgo && d <= now;
    });
    const weekCompleted = weekTasks.filter((t) => t.status === 'completed').length;
    const logDays = dailyLogs.length;

    return (
      <>
        <SectionHeader>Today</SectionHeader>
        <ListContainer>
          <DashboardStat>
            <StatLabel>Habits Completed</StatLabel>
            <StatValue $color={habitRate >= 80 ? '#008000' : habitRate >= 50 ? '#808000' : '#ff0000'}>
              {completedHabitsToday}/{totalHabitsToday} ({habitRate}%)
            </StatValue>
          </DashboardStat>
        </ListContainer>

        <SectionHeader>This Week</SectionHeader>
        <ListContainer>
          <DashboardStat>
            <StatLabel>Tasks Completed</StatLabel>
            <StatValue>{weekCompleted}/{weekTasks.length}</StatValue>
          </DashboardStat>
        </ListContainer>

        <SectionHeader>Active Goals</SectionHeader>
        <ListContainer>
          {activeGoals.map((goal) => {
            const range = goal.target_value - goal.starting_value;
            const progress = range > 0 ? Math.round(((goal.current_value - goal.starting_value) / range) * 100) : 0;
            const daysLeft = Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
            return (
              <DashboardStat key={goal.goal_id}>
                <StatLabel>{goal.title}</StatLabel>
                <StatValue $color={progress >= 70 ? '#008000' : progress >= 40 ? '#808000' : '#ff0000'}>
                  {progress}% ({daysLeft}d left)
                </StatValue>
              </DashboardStat>
            );
          })}
          {activeGoals.length === 0 && (
            <DashboardStat>
              <StatLabel>No active goals</StatLabel>
              <StatValue>-</StatValue>
            </DashboardStat>
          )}
        </ListContainer>

        <SectionHeader>Stats</SectionHeader>
        <ListContainer>
          <DashboardStat>
            <StatLabel>Total Log Days</StatLabel>
            <StatValue>{logDays}</StatValue>
          </DashboardStat>
          <DashboardStat>
            <StatLabel>Total Wins Logged</StatLabel>
            <StatValue>{allAccomplishments.length}</StatValue>
          </DashboardStat>
        </ListContainer>
      </>
    );
  };

  const renderCoach = () => (
    <>
      <ToggleGroup style={{ margin: '0 0 8px 0' }}>
        <ToggleButton $active={coachSubTab === 'chat'} onClick={() => setCoachSubTab('chat')}>
          Chat
        </ToggleButton>
        <ToggleButton $active={coachSubTab === 'digest'} onClick={() => setCoachSubTab('digest')}>
          Digest
        </ToggleButton>
        <ToggleButton $active={coachSubTab === 'dashboard'} onClick={() => setCoachSubTab('dashboard')}>
          Stats
        </ToggleButton>
      </ToggleGroup>
      {coachSubTab === 'chat' && renderCoachChat()}
      {coachSubTab === 'digest' && renderCoachDigest()}
      {coachSubTab === 'dashboard' && renderCoachDashboard()}
    </>
  );

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
            Build good habits one day at a time.
          </EmptyStateText>
          <Button onClick={() => { setAddTodoType('habit'); setShowAddTodo(true); }}>
            + Add Habit
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
                <Button
                  size="sm"
                  style={{ marginLeft: 8, minWidth: 32, padding: '2px 6px' }}
                  onClick={(e) => handleEditHabit(habit, e)}
                >
                  ✎
                </Button>
              </ListItem>
            );
          })}
        </ListContainer>
      </>
    );
  };

  // Render Tasks sub-view (day-specific to-do items)
  const renderTasks = () => {
    const dateTasks = tasks.filter((t) => t.planned_date === taskViewDate);
    const completed = dateTasks.filter((t) => t.status === 'completed').length;
    const isToday = taskViewDate === today;

    return (
      <>
        {/* Date navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
          <Button size="sm" onClick={handleTaskDatePrev}>&#9664;</Button>
          <span
            style={{ fontSize: 12, fontWeight: 'bold', cursor: 'pointer' }}
            onClick={handleTaskDateToday}
          >
            {isToday ? 'Today' : format(new Date(taskViewDate + 'T00:00:00'), 'MMM d, yyyy')}
          </span>
          <Button size="sm" onClick={handleTaskDateNext}>&#9654;</Button>
        </div>

        {dateTasks.length === 0 ? (
          <EmptyState>
            <EmptyStateIcon>
              <Win95Icon $bg="#ADD8E6" $color="#000080" style={{ width: 40, height: 40, fontSize: 24 }}>&#9744;</Win95Icon>
            </EmptyStateIcon>
            <EmptyStateTitle>No tasks for this day</EmptyStateTitle>
            <EmptyStateText>
              Add a to-do item to plan your day.
            </EmptyStateText>
            <Button onClick={() => { setAddTodoType('task'); setShowAddTodo(true); }}>
              + Add Task
            </Button>
          </EmptyState>
        ) : (
          <>
            <SectionHeader>
              {isToday ? 'Today' : format(new Date(taskViewDate + 'T00:00:00'), 'MMM d')} &mdash; {completed}/{dateTasks.length} done
            </SectionHeader>
            <ListContainer>
              {dateTasks.map((task) => {
                const isCompleted = task.status === 'completed';
                return (
                  <ListItem
                    key={task.task_id}
                    $completed={isCompleted}
                    $clickable
                    onClick={() => handleToggleTask(task.task_id)}
                  >
                    <Checkbox $checked={isCompleted}>
                      {isCompleted && '\u2713'}
                    </Checkbox>
                    <ListItemText $completed={isCompleted}>
                      {task.description}
                    </ListItemText>
                    {task.time_estimated && (
                      <ListItemMeta>{task.time_estimated}m</ListItemMeta>
                    )}
                    <Button
                      size="sm"
                      style={{ marginLeft: 8, minWidth: 32, padding: '2px 6px' }}
                      onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}
                    >
                      &#9998;
                    </Button>
                  </ListItem>
                );
              })}
            </ListContainer>
          </>
        )}

        <AddButton onClick={() => { setAddTodoType('task'); setShowAddTodo(true); }}>
          + Add Task
        </AddButton>
      </>
    );
  };

  // Render To Do tab wrapper with sub-tabs
  const renderTodo = () => {
    return (
      <>
        <ToggleGroup>
          <ToggleButton
            $active={todoSubTab === 'habits'}
            onClick={() => setTodoSubTab('habits')}
          >
            Habits
          </ToggleButton>
          <ToggleButton
            $active={todoSubTab === 'tasks'}
            onClick={() => setTodoSubTab('tasks')}
          >
            Tasks
          </ToggleButton>
        </ToggleGroup>

        {todoSubTab === 'habits' ? renderHabits() : renderTasks()}
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
        <SectionHeader>Your Wins (tap to edit)</SectionHeader>
        <ListContainer>
          {allAccomplishments.slice(0, 50).map((acc, index) => (
            <AccomplishmentItem
              key={index}
              style={{ cursor: 'pointer' }}
              onClick={() => handleEditAccomplishment(acc, index)}
            >
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
              {activeTab === TABS.TODO && (
                <TitleBarButton size="sm" onClick={() => setShowAddTodo(true)}>
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
            <SyncStatusBar $status={syncStatus}>
              <SyncStatusText>
                <SyncStatusIcon $status={syncStatus} />
                {getSyncStatusLabel()}
              </SyncStatusText>
              <RefreshButton
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || syncStatus === 'syncing'}
              >
                {isRefreshing ? '...' : 'Refresh'}
              </RefreshButton>
            </SyncStatusBar>
            <ScrollArea>
              {activeTab === TABS.SUMMARY && renderGoalSummary()}
              {activeTab === TABS.TODO && renderTodo()}
              {activeTab === TABS.MONTHLY && renderMonthlyGoals()}
              {activeTab === TABS.ACCOMPLISHMENTS && renderAccomplishments()}
              {activeTab === TABS.COACH && renderCoach()}
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
            $active={activeTab === TABS.TODO}
            onClick={() => setActiveTab(TABS.TODO)}
          >
            <TabIcon>
              <Win95Icon $bg="#90EE90" $color="#008000" style={{ width: 18, height: 18, fontSize: 10 }}>✓</Win95Icon>
            </TabIcon>
            <TabLabel>To Do</TabLabel>
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
          <BottomTab
            $active={activeTab === TABS.COACH}
            onClick={() => setActiveTab(TABS.COACH)}
          >
            <TabIcon>
              <Win95Icon $bg="#DDA0DD" $color="#800080" style={{ width: 18, height: 18, fontSize: 10 }}>♦</Win95Icon>
            </TabIcon>
            <TabLabel>Coach</TabLabel>
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
              <FormRow>
                <FormLabel>Deadline</FormLabel>
                <StyledInput
                  type="date"
                  value={newGoalDeadline}
                  onChange={(e) => setNewGoalDeadline(e.target.value)}
                />
              </FormRow>
              <FormRow>
                <FormLabel>Type</FormLabel>
                <StyledSelect
                  value={newGoalType}
                  onChange={(e) => setNewGoalType(e.target.value as GoalType)}
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly_chunk">Weekly Chunk</option>
                  <option value="bonus">Bonus</option>
                </StyledSelect>
              </FormRow>
              <FormRow>
                <FormLabel>Status</FormLabel>
                <StyledSelect
                  value={newGoalStatus}
                  onChange={(e) => setNewGoalStatus(e.target.value as GoalStatus)}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="paused">Paused</option>
                  <option value="abandoned">Abandoned</option>
                </StyledSelect>
              </FormRow>
              <FormRow>
                <FormLabel>Smart Keywords (for auto-tracking)</FormLabel>
                <KeywordInput>
                  {newGoalKeywords.map((keyword) => (
                    <KeywordTag key={keyword}>
                      {keyword}
                      <span
                        style={{ marginLeft: 4, cursor: 'pointer' }}
                        onClick={() => handleRemoveKeyword(keyword)}
                      >
                        ×
                      </span>
                    </KeywordTag>
                  ))}
                  <StyledInput
                    style={{ flex: 1, minWidth: 80, border: 'none', background: 'transparent' }}
                    value={newKeywordInput}
                    onChange={(e) => setNewKeywordInput(e.target.value)}
                    onKeyDown={handleKeywordKeyDown}
                    onBlur={handleAddKeyword}
                    placeholder="Add keyword..."
                  />
                </KeywordInput>
                <span style={{ fontSize: 10, color: '#808080' }}>
                  Press Enter or comma to add. E.g., sat, test, practice
                </span>
              </FormRow>
              <FormRow>
                <FormLabel>Increment Type</FormLabel>
                <StyledSelect
                  value={newGoalIncrementType}
                  onChange={(e) => setNewGoalIncrementType(e.target.value as IncrementType)}
                >
                  <option value="count">Count (one, two, 3...)</option>
                  <option value="value">Value ($50, 100 dollars...)</option>
                  <option value="time">Time (2 hours, 30 minutes...)</option>
                </StyledSelect>
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

      {/* Edit Habit Popup */}
      {showEditHabit && editingHabit && (
        <PopupOverlay onClick={() => setShowEditHabit(false)}>
          <PopupWindow onClick={(e) => e.stopPropagation()}>
            <TitleBar>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Win95Icon $bg="#90EE90" $color="#008000" style={{ width: 14, height: 14, fontSize: 8 }}>✓</Win95Icon>
                Edit Habit
              </span>
              <TitleBarButton size="sm" onClick={() => setShowEditHabit(false)}>
                ✕
              </TitleBarButton>
            </TitleBar>
            <PopupContent>
              <FormRow>
                <FormLabel>Habit Name</FormLabel>
                <StyledInput
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="e.g., Exercise"
                  autoFocus
                />
              </FormRow>
              <FormRow>
                <FormLabel>Target Minutes (optional)</FormLabel>
                <StyledInput
                  type="number"
                  value={newHabitTarget}
                  onChange={(e) => setNewHabitTarget(e.target.value)}
                  placeholder="e.g., 30"
                />
              </FormRow>
              <FormRow>
                <FormLabel>Status</FormLabel>
                <ToggleGroup>
                  <ToggleButton
                    $active={newHabitActive}
                    onClick={() => setNewHabitActive(true)}
                  >
                    Active
                  </ToggleButton>
                  <ToggleButton
                    $active={!newHabitActive}
                    onClick={() => setNewHabitActive(false)}
                  >
                    Inactive
                  </ToggleButton>
                </ToggleGroup>
              </FormRow>
              <ButtonRow>
                <Button
                  primary
                  style={{ flex: 1 }}
                  onClick={handleSaveEditedHabit}
                  disabled={saving || !newHabitName.trim()}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  style={{ flex: 1, color: '#800000' }}
                  onClick={handleDeleteHabit}
                  disabled={saving}
                >
                  Delete
                </Button>
              </ButtonRow>
            </PopupContent>
          </PopupWindow>
        </PopupOverlay>
      )}

      {/* Edit Accomplishment Popup */}
      {showEditAccomplishment && editingAccomplishment && (
        <PopupOverlay onClick={() => setShowEditAccomplishment(false)}>
          <PopupWindow onClick={(e) => e.stopPropagation()}>
            <TitleBar>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Win95Icon $bg="#FFD700" $color="#800000" style={{ width: 14, height: 14, fontSize: 8 }}>★</Win95Icon>
                Edit Accomplishment
              </span>
              <TitleBarButton size="sm" onClick={() => setShowEditAccomplishment(false)}>
                ✕
              </TitleBarButton>
            </TitleBar>
            <PopupContent>
              <FormRow>
                <FormLabel>
                  {format(new Date(editingAccomplishment.date), 'MMM d, yyyy')}
                </FormLabel>
                <StyledTextArea
                  value={editAccomplishmentText}
                  onChange={(e) => setEditAccomplishmentText(e.target.value)}
                  placeholder="What did you accomplish?"
                  autoFocus
                />
              </FormRow>
              <ButtonRow>
                <Button
                  primary
                  style={{ flex: 1 }}
                  onClick={handleSaveEditedAccomplishment}
                  disabled={saving || !editAccomplishmentText.trim()}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  style={{ flex: 1, color: '#800000' }}
                  onClick={handleDeleteAccomplishment}
                  disabled={saving}
                >
                  Delete
                </Button>
              </ButtonRow>
            </PopupContent>
          </PopupWindow>
        </PopupOverlay>
      )}

      {/* Add To-Do Popup */}
      {showAddTodo && (
        <PopupOverlay onClick={() => setShowAddTodo(false)}>
          <PopupWindow onClick={(e) => e.stopPropagation()}>
            <TitleBar>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Win95Icon $bg="#90EE90" $color="#008000" style={{ width: 14, height: 14, fontSize: 8 }}>+</Win95Icon>
                Add To Do Item
              </span>
              <TitleBarButton size="sm" onClick={() => setShowAddTodo(false)}>
                &#10005;
              </TitleBarButton>
            </TitleBar>
            <PopupContent>
              <FormRow>
                <FormLabel>Type</FormLabel>
                <ToggleGroup>
                  <ToggleButton
                    $active={addTodoType === 'habit'}
                    onClick={() => setAddTodoType('habit')}
                  >
                    Habit
                  </ToggleButton>
                  <ToggleButton
                    $active={addTodoType === 'task'}
                    onClick={() => setAddTodoType('task')}
                  >
                    To-Do Item
                  </ToggleButton>
                </ToggleGroup>
              </FormRow>

              {addTodoType === 'habit' ? (
                <>
                  <FormRow>
                    <FormLabel>Habit Name</FormLabel>
                    <StyledInput
                      value={newHabitName}
                      onChange={(e) => setNewHabitName(e.target.value)}
                      placeholder="e.g., Exercise daily"
                      autoFocus
                    />
                  </FormRow>
                  <FormRow>
                    <FormLabel>Target Minutes (optional)</FormLabel>
                    <StyledInput
                      type="number"
                      value={newHabitTarget}
                      onChange={(e) => setNewHabitTarget(e.target.value)}
                      placeholder="e.g., 30"
                    />
                  </FormRow>
                  <Button
                    primary
                    fullWidth
                    onClick={handleAddHabitFromTodo}
                    disabled={saving || !newHabitName.trim()}
                  >
                    {saving ? 'Saving...' : 'Add Habit'}
                  </Button>
                </>
              ) : (
                <>
                  <FormRow>
                    <FormLabel>Description</FormLabel>
                    <StyledInput
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      placeholder="e.g., Finish chapter 5 review"
                      autoFocus
                    />
                  </FormRow>
                  <FormRow>
                    <FormLabel>Planned Date</FormLabel>
                    <StyledInput
                      type="date"
                      value={newTaskPlannedDate}
                      onChange={(e) => setNewTaskPlannedDate(e.target.value)}
                    />
                  </FormRow>
                  <FormRow>
                    <FormLabel>Link to Goal (optional)</FormLabel>
                    <StyledSelect
                      value={newTaskGoalId || ''}
                      onChange={(e) => setNewTaskGoalId(e.target.value || null)}
                    >
                      <option value="">None</option>
                      {activeGoals.map((g) => (
                        <option key={g.goal_id} value={g.goal_id}>{g.title}</option>
                      ))}
                    </StyledSelect>
                  </FormRow>
                  <FormRow>
                    <FormLabel>Estimated Time (minutes, optional)</FormLabel>
                    <StyledInput
                      type="number"
                      value={newTaskTimeEstimated}
                      onChange={(e) => setNewTaskTimeEstimated(e.target.value)}
                      placeholder="e.g., 45"
                    />
                  </FormRow>
                  <Button
                    primary
                    fullWidth
                    onClick={handleAddTask}
                    disabled={saving || !newTaskDescription.trim()}
                  >
                    {saving ? 'Saving...' : 'Add Task'}
                  </Button>
                </>
              )}
            </PopupContent>
          </PopupWindow>
        </PopupOverlay>
      )}

      {/* Edit Task Popup */}
      {showEditTask && editingTask && (
        <PopupOverlay onClick={() => setShowEditTask(false)}>
          <PopupWindow onClick={(e) => e.stopPropagation()}>
            <TitleBar>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Win95Icon $bg="#FFD700" $color="#000" style={{ width: 14, height: 14, fontSize: 8 }}>&#9998;</Win95Icon>
                Edit Task
              </span>
              <TitleBarButton size="sm" onClick={() => setShowEditTask(false)}>
                &#10005;
              </TitleBarButton>
            </TitleBar>
            <PopupContent>
              <FormRow>
                <FormLabel>Description</FormLabel>
                <StyledInput
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Task description"
                  autoFocus
                />
              </FormRow>
              <FormRow>
                <FormLabel>Planned Date</FormLabel>
                <StyledInput
                  type="date"
                  value={newTaskPlannedDate}
                  onChange={(e) => setNewTaskPlannedDate(e.target.value)}
                />
              </FormRow>
              <FormRow>
                <FormLabel>Status</FormLabel>
                <StyledSelect
                  value={editingTask.status}
                  onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as TaskStatus })}
                >
                  <option value="planned">Planned</option>
                  <option value="completed">Completed</option>
                  <option value="skipped">Skipped</option>
                  <option value="rolled">Rolled</option>
                </StyledSelect>
              </FormRow>
              <FormRow>
                <FormLabel>Link to Goal (optional)</FormLabel>
                <StyledSelect
                  value={newTaskGoalId || ''}
                  onChange={(e) => setNewTaskGoalId(e.target.value || null)}
                >
                  <option value="">None</option>
                  {activeGoals.map((g) => (
                    <option key={g.goal_id} value={g.goal_id}>{g.title}</option>
                  ))}
                </StyledSelect>
              </FormRow>
              <FormRow>
                <FormLabel>Estimated Time (minutes)</FormLabel>
                <StyledInput
                  type="number"
                  value={newTaskTimeEstimated}
                  onChange={(e) => setNewTaskTimeEstimated(e.target.value)}
                  placeholder="Minutes"
                />
              </FormRow>
              <FormRow>
                <FormLabel>Notes</FormLabel>
                <StyledTextArea
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  placeholder="Optional notes..."
                />
              </FormRow>
              <ButtonRow>
                <Button
                  primary
                  style={{ flex: 1 }}
                  onClick={handleSaveEditedTask}
                  disabled={saving || !newTaskDescription.trim()}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  style={{ flex: 1, color: '#800000' }}
                  onClick={handleDeleteTask}
                  disabled={saving}
                >
                  Delete
                </Button>
              </ButtonRow>
            </PopupContent>
          </PopupWindow>
        </PopupOverlay>
      )}

      {/* Goal Update Toast */}
      <Toast $visible={toastVisible}>
        {toastMessage}
      </Toast>
    </>
  );
}
