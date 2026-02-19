'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Button, ProgressBar } from 'react95';
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useLogStore } from '@/stores/logStore';
import { useGoalStore } from '@/stores/goalStore';
import { Goal, Habit, HabitWithStatus, GoalType, GoalStatus, Task, TaskStatus, DifficultyTier, MissReason } from '@/types';
import { isHabitActiveOnDate } from '@/lib/metrics';
import { useSettingsStore } from '@/stores/settingsStore';
import dynamic from 'next/dynamic';
import type { WeekScoreData, CategoryData } from '@/components/mobile/ReportCharts';

const ScoreTrendChart = dynamic(
  () => import('@/components/mobile/ReportCharts').then((mod) => mod.ScoreTrendChart),
  { ssr: false }
);
const CategoryBreakdownChart = dynamic(
  () => import('@/components/mobile/ReportCharts').then((mod) => mod.CategoryBreakdownChart),
  { ssr: false }
);
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
  REPORT: 4,
};

// ============================================
// REPORT CARD STYLED COMPONENTS
// ============================================

const ReportCard = styled.div`
  margin-bottom: 12px;
  padding: 12px;
  background: #fff;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  box-shadow: inset 1px 1px 0 #0a0a0a;
`;

const ReportScoreContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px 0;
`;

const ReportScore = styled.div<{ $color: string }>`
  font-size: 48px;
  font-weight: bold;
  color: ${props => props.$color};
  line-height: 1;
`;

const ReportGrade = styled.div<{ $color: string }>`
  font-size: 36px;
  font-weight: bold;
  color: ${props => props.$color};
  background: #c0c0c0;
  border: 2px solid;
  border-color: #dfdfdf #808080 #808080 #dfdfdf;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ReportStatRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
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

const ReportWeekLabel = styled.div`
  font-size: 11px;
  color: #808080;
  text-align: center;
  margin-top: 4px;
`;

const GoalProgressRow = styled.div`
  padding: 8px;
  border-bottom: 1px solid #c0c0c0;
  background: #fff;

  &:last-child {
    border-bottom: none;
  }
`;

const GoalProgressLabel = styled.div`
  font-size: 12px;
  color: #000;
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
`;

const GoalProgressBarBg = styled.div`
  width: 100%;
  height: 12px;
  background: #c0c0c0;
  border: 1px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
`;

const GoalProgressBarFill = styled.div<{ $width: number; $color: string }>`
  height: 100%;
  width: ${props => props.$width}%;
  background: ${props => props.$color};
`;

const WinItem = styled.div`
  padding: 6px 8px;
  border-bottom: 1px solid #c0c0c0;
  font-size: 12px;
  color: #000;
  display: flex;
  align-items: flex-start;
  gap: 6px;

  &:last-child {
    border-bottom: none;
  }
`;

// ============================================
// DIFFICULTY TIER COMPONENTS
// ============================================

const TIER_COLORS: Record<DifficultyTier, string> = {
  low: '#90EE90',
  med: '#FFD700',
  high: '#FF6B6B',
};

const TIER_LABELS: Record<DifficultyTier, string> = {
  low: 'Low',
  med: 'Med',
  high: 'High',
};

const TierDayButton = styled.button<{ $tier: DifficultyTier }>`
  width: 38px;
  height: 38px;
  background: ${props => TIER_COLORS[props.$tier]};
  border: 2px solid;
  border-color: #dfdfdf #808080 #808080 #dfdfdf;
  cursor: pointer;
  font-size: 11px;
  font-weight: bold;
  font-family: 'MS Sans Serif', sans-serif;
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;

  &:active {
    border-color: #808080 #dfdfdf #dfdfdf #808080;
  }
`;

const TierDayColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
`;

const TierDayLabel = styled.span<{ $isToday?: boolean }>`
  font-size: 10px;
  color: ${props => props.$isToday ? '#000080' : '#808080'};
  font-weight: ${props => props.$isToday ? 'bold' : 'normal'};
`;

const TierBadge = styled.span<{ $tier: DifficultyTier }>`
  display: inline-block;
  padding: 1px 6px;
  background: ${props => TIER_COLORS[props.$tier]};
  border: 1px solid #808080;
  font-size: 10px;
  font-weight: bold;
  color: #000;
  margin-left: 6px;
`;

const TierLegend = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 8px;
`;

const TierLegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #808080;
`;

const TierLegendDot = styled.div<{ $color: string }>`
  width: 10px;
  height: 10px;
  background: ${props => props.$color};
  border: 1px solid #808080;
`;

const MissReasonRow = styled.div`
  display: flex;
  gap: 4px;
  padding: 2px 8px 6px 36px;
  background: #f8f8f8;
  border-bottom: 1px solid #e0e0e0;
`;

const MissReasonButton = styled.button<{ $selected?: boolean }>`
  font-size: 9px;
  font-family: inherit;
  padding: 2px 6px;
  background: ${props => props.$selected ? '#c0c0c0' : '#e8e8e8'};
  border: 1px solid;
  border-color: ${props => props.$selected
    ? '#808080 #dfdfdf #dfdfdf #808080'
    : '#dfdfdf #808080 #808080 #dfdfdf'};
  cursor: pointer;
  color: ${props => props.$selected ? '#000' : '#808080'};

  &:active {
    border-color: #808080 #dfdfdf #dfdfdf #808080;
  }
`;

const FocusBanner = styled.div`
  background: #fff;
  border: 2px solid;
  border-color: #808080 #dfdfdf #dfdfdf #808080;
  padding: 6px 8px;
  margin-bottom: 8px;
  font-size: 11px;
  color: #000080;
  font-weight: bold;
`;

// Helpers
function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  return format(d, 'yyyy-MM-dd');
}

function getWeekDates(mondayStr: string): string[] {
  const dates: string[] = [];
  const d = new Date(mondayStr + 'T00:00:00');
  for (let i = 0; i < 7; i++) {
    dates.push(format(d, 'yyyy-MM-dd'));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function cycleTier(current: DifficultyTier): DifficultyTier {
  if (current === 'low') return 'med';
  if (current === 'med') return 'high';
  return 'low';
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
  const [editingGoalNotes, setEditingGoalNotes] = useState('');
  const [editingDayNotes, setEditingDayNotes] = useState('');
  const [newAccomplishment, setNewAccomplishment] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [editAccomplishmentText, setEditAccomplishmentText] = useState('');
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitTarget, setNewHabitTarget] = useState('');
  const [newHabitActive, setNewHabitActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Report state
  const [reportWeekStart, setReportWeekStart] = useState(() => {
    const now = new Date();
    const ws = startOfWeek(now, { weekStartsOn: 1 });
    return format(ws, 'yyyy-MM-dd');
  });
  const [trendWeeks, setTrendWeeks] = useState<number>(0); // 0 = all

  // Difficulty tier state
  const [showDifficultyPopup, setShowDifficultyPopup] = useState(false);
  const [difficultyWeekStart, setDifficultyWeekStart] = useState(() => getWeekStart(today));

  // To Do sub-tab state
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [todoSubTab, setTodoSubTab] = useState<'habits' | 'tasks'>('habits');
  const [taskViewDate, setTaskViewDate] = useState(today);
  const [habitViewDate, setHabitViewDate] = useState(today);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [addTodoType, setAddTodoType] = useState<'habit' | 'task'>('task');
  const [showEditTask, setShowEditTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPlannedDate, setNewTaskPlannedDate] = useState(today);
  const [newTaskGoalId, setNewTaskGoalId] = useState<string | null>(null);
  const [newTaskTimeEstimated, setNewTaskTimeEstimated] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [showFocusPopup, setShowFocusPopup] = useState(false);

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
    getHabitsByDate,
    getDifficultyTier,
    setDifficultyTier,
    setMissReason,
    getDailyFocus,
    setDailyFocus,
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

    return () => {
      unsubscribeFromRealtime();
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

  const habitDateCompletions = habitCompletions.filter((c) => c.date === habitViewDate);

  const isHabitCompleted = (habitId: string) => {
    return habitDateCompletions.some((c) => c.habit_id === habitId && c.completed);
  };

  const getHabitMissReason = (habitId: string): MissReason | undefined => {
    const completion = habitDateCompletions.find((c) => c.habit_id === habitId);
    return completion?.miss_reason;
  };

  const MISS_REASON_LABELS: Record<MissReason, string> = {
    no_time: 'No time',
    forgot: 'Forgot',
    not_prioritized: 'Skip',
    not_applicable: 'N/A',
  };

  const handleToggleHabit = async (habitId: string) => {
    await toggleHabit(habitId, habitViewDate);
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
    setEditingGoalNotes(goal.notes || '');
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
        notes: editingGoalNotes.trim() || null,
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
    setNewTaskGoalId(getDailyFocus(today).primary);
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

  const handleHabitDatePrev = () => {
    const d = new Date(habitViewDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setHabitViewDate(format(d, 'yyyy-MM-dd'));
  };

  const handleHabitDateNext = () => {
    const d = new Date(habitViewDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setHabitViewDate(format(d, 'yyyy-MM-dd'));
  };

  const handleHabitDateToday = () => {
    setHabitViewDate(today);
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
      case TABS.REPORT:
        return 'Report Card';
      case TABS.SUMMARY:
      default:
        return 'Goal Summary';
    }
  };

  // ============================================
  // REPORT CARD TAB
  // ============================================

  const computeWeeklyReport = (weekStartStr: string) => {
    const ws = new Date(weekStartStr + 'T00:00:00');
    const we = endOfWeek(ws, { weekStartsOn: 1 });
    const wsStr = format(ws, 'yyyy-MM-dd');
    const weStr = format(we, 'yyyy-MM-dd');
    const todayDate = format(new Date(), 'yyyy-MM-dd');
    const isCurrentWeek = wsStr <= todayDate && weStr >= todayDate;

    // Baseline check: zero out weeks before baseline_date
    const { baseline_date } = useSettingsStore.getState();
    if (baseline_date && weStr < baseline_date) {
      return {
        wsStr, weStr, isCurrentWeek,
        taskRate: 0, completedTasks: 0, totalTasks: 0,
        habitRate: 0, completedHabits: 0, totalHabitEntries: 0,
        daysLogged: 0, loggingRate: 0,
        goalSnapshots: [], avgGoalProgress: 0,
        weekWins: [] as string[],
        score: 0, grade: '\u2014' as string, gradeColor: '#808080',
      };
    }

    // Tasks in range
    const weekTasks = tasks.filter((t) => t.planned_date >= wsStr && t.planned_date <= weStr);
    const completedTasks = weekTasks.filter((t) => t.status === 'completed');
    const taskRate = weekTasks.length > 0 ? completedTasks.length / weekTasks.length : 0;

    // Habits in range — count scheduled vs actually completed
    const activeHabitsList = habits.filter((h) => h.active);
    const weekHabitCompletions = habitCompletions.filter((c) => c.date >= wsStr && c.date <= weStr);
    let totalHabitSlots = 0;
    let completedHabitSlots = 0;
    // For each day in the week, count how many habits were scheduled
    const dayLimit = isCurrentWeek ? todayDate : weStr;
    for (let d = new Date(ws); format(d, 'yyyy-MM-dd') <= dayLimit; d.setDate(d.getDate() + 1)) {
      const dateStr = format(d, 'yyyy-MM-dd');
      activeHabitsList.forEach((h) => {
        if (isHabitActiveOnDate(h, dateStr)) {
          totalHabitSlots++;
          const completion = weekHabitCompletions.find((c) => c.habit_id === h.habit_id && c.date === dateStr);
          if (completion?.completed) completedHabitSlots++;
        }
      });
    }
    const completedHabits = completedHabitSlots;
    const totalHabitEntries = totalHabitSlots;
    const habitRate = totalHabitSlots > 0 ? completedHabitSlots / totalHabitSlots : 0;

    // Days logged
    const weekLogs = dailyLogs.filter((l) => l.date >= wsStr && l.date <= weStr);
    const daysLogged = weekLogs.length;
    const loggingRate = daysLogged / 7;

    // Goal progress (current snapshot)
    const goalSnapshots = activeGoals.map((goal) => {
      const range = goal.target_value - goal.starting_value;
      const progress = range > 0 ? Math.round(((goal.current_value - goal.starting_value) / range) * 100) : 0;
      return { title: goal.title, progress: Math.min(100, progress) };
    });
    const avgGoalProgress = goalSnapshots.length > 0
      ? goalSnapshots.reduce((sum, g) => sum + g.progress, 0) / goalSnapshots.length / 100
      : 0;

    // Wins from daily logs in range
    const weekWins: string[] = [];
    weekLogs.forEach((log) => {
      if (log.accomplishments) {
        log.accomplishments.forEach((acc) => weekWins.push(acc));
      }
    });

    // Overall score: 30% tasks + 30% habits + 20% logging + 20% goals
    const score = Math.round(
      (taskRate * 0.3 + habitRate * 0.3 + loggingRate * 0.2 + avgGoalProgress * 0.2) * 100
    );

    // Letter grade
    const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
    const gradeColor = score >= 80 ? '#008000' : score >= 50 ? '#808000' : '#ff0000';

    return {
      wsStr, weStr, isCurrentWeek,
      taskRate, completedTasks: completedTasks.length, totalTasks: weekTasks.length,
      habitRate, completedHabits, totalHabitEntries,
      daysLogged, loggingRate,
      goalSnapshots, avgGoalProgress,
      weekWins,
      score, grade, gradeColor,
    };
  };

  const handleReportWeekPrev = () => {
    const ws = new Date(reportWeekStart + 'T00:00:00');
    const prev = subWeeks(ws, 1);
    setReportWeekStart(format(prev, 'yyyy-MM-dd'));
  };

  const handleReportWeekNext = () => {
    const ws = new Date(reportWeekStart + 'T00:00:00');
    const next = addWeeks(ws, 1);
    setReportWeekStart(format(next, 'yyyy-MM-dd'));
  };

  const handleReportWeekCurrent = () => {
    const now = new Date();
    const ws = startOfWeek(now, { weekStartsOn: 1 });
    setReportWeekStart(format(ws, 'yyyy-MM-dd'));
  };

  const computeMultiWeekData = (currentWeekStart: string, numWeeks: number) => {
    const weekScores: WeekScoreData[] = [];
    const categoryData: CategoryData[] = [];

    // If numWeeks is 0, compute "all" weeks from baseline (or earliest log) to currentWeekStart
    let actualWeeks = numWeeks;
    if (actualWeeks === 0) {
      const { baseline_date } = useSettingsStore.getState();
      const earliest = baseline_date
        || (dailyLogs.length > 0
          ? [...dailyLogs].sort((a, b) => a.date.localeCompare(b.date))[0].date
          : currentWeekStart);
      const earliestWs = startOfWeek(new Date(earliest + 'T00:00:00'), { weekStartsOn: 1 });
      const currentWs = new Date(currentWeekStart + 'T00:00:00');
      actualWeeks = Math.max(1, Math.round((currentWs.getTime() - earliestWs.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1);
    }

    for (let i = actualWeeks - 1; i >= 0; i--) {
      const ws = new Date(currentWeekStart + 'T00:00:00');
      ws.setDate(ws.getDate() - i * 7);
      const wsStr = format(ws, 'yyyy-MM-dd');
      const r = computeWeeklyReport(wsStr);
      const label = format(new Date(wsStr + 'T00:00:00'), 'M/d');
      weekScores.push({ label, score: r.score });
      categoryData.push({
        label,
        tasks: Math.round(r.taskRate * 100),
        habits: Math.round(r.habitRate * 100),
        logging: Math.round(r.loggingRate * 100),
        goals: Math.round(r.avgGoalProgress * 100),
      });
    }
    return { weekScores, categoryData };
  };

  const renderReport = () => {
    const report = computeWeeklyReport(reportWeekStart);
    const startLabel = format(new Date(report.wsStr + 'T00:00:00'), 'MMM d');
    const endLabel = format(new Date(report.weStr + 'T00:00:00'), 'MMM d');
    const { weekScores, categoryData } = computeMultiWeekData(reportWeekStart, trendWeeks);

    return (
      <>
        {/* Week navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
          <Button size="sm" onClick={handleReportWeekPrev}>&#9664;</Button>
          <span
            style={{ fontSize: 12, fontWeight: 'bold', cursor: 'pointer' }}
            onClick={handleReportWeekCurrent}
          >
            {report.isCurrentWeek ? 'This Week' : `${startLabel} - ${endLabel}`}
          </span>
          <Button size="sm" onClick={handleReportWeekNext}>&#9654;</Button>
        </div>

        {/* Score card */}
        <ReportCard>
          <ReportScoreContainer>
            <ReportScore $color={report.gradeColor}>{report.score}</ReportScore>
            <div>
              <ReportGrade $color={report.gradeColor}>{report.grade}</ReportGrade>
              {report.isCurrentWeek && (
                <ReportWeekLabel>(In Progress)</ReportWeekLabel>
              )}
            </div>
          </ReportScoreContainer>
        </ReportCard>

        {/* Breakdown */}
        <SectionHeader>Breakdown</SectionHeader>
        <ListContainer>
          <ReportStatRow>
            <StatLabel>Tasks Done</StatLabel>
            <StatValue $color={report.taskRate >= 0.8 ? '#008000' : report.taskRate >= 0.5 ? '#808000' : '#ff0000'}>
              {report.completedTasks}/{report.totalTasks} ({Math.round(report.taskRate * 100)}%)
            </StatValue>
          </ReportStatRow>
          <ReportStatRow>
            <StatLabel>Habit Completion</StatLabel>
            <StatValue $color={report.habitRate >= 0.8 ? '#008000' : report.habitRate >= 0.5 ? '#808000' : '#ff0000'}>
              {report.completedHabits}/{report.totalHabitEntries} ({Math.round(report.habitRate * 100)}%)
            </StatValue>
          </ReportStatRow>
          <ReportStatRow>
            <StatLabel>Days Logged</StatLabel>
            <StatValue>{report.daysLogged}/7</StatValue>
          </ReportStatRow>
        </ListContainer>

        {/* Trends */}
        <SectionHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Trends{trendWeeks > 0 ? ` (${trendWeeks}w)` : ' (All)'}</span>
          <div style={{ display: 'flex', gap: 2 }}>
            {[4, 8, 12, 0].map((w) => (
              <button
                key={w}
                onClick={() => setTrendWeeks(w)}
                style={{
                  fontSize: 9,
                  fontFamily: 'inherit',
                  padding: '1px 5px',
                  background: trendWeeks === w ? '#000080' : '#c0c0c0',
                  color: trendWeeks === w ? '#fff' : '#000',
                  border: '1px solid',
                  borderColor: trendWeeks === w
                    ? '#808080 #dfdfdf #dfdfdf #808080'
                    : '#dfdfdf #808080 #808080 #dfdfdf',
                  cursor: 'pointer',
                }}
              >
                {w === 0 ? 'All' : `${w}w`}
              </button>
            ))}
          </div>
        </SectionHeader>
        <ScoreTrendChart data={weekScores} />
        <CategoryBreakdownChart data={categoryData} />

        {/* Goal progress */}
        {report.goalSnapshots.length > 0 && (
          <>
            <SectionHeader>Goal Progress</SectionHeader>
            <ListContainer>
              {report.goalSnapshots.map((g, i) => (
                <GoalProgressRow key={i}>
                  <GoalProgressLabel>
                    <span>{g.title}</span>
                    <span style={{ fontWeight: 'bold', color: g.progress >= 70 ? '#008000' : g.progress >= 40 ? '#808000' : '#ff0000' }}>
                      {g.progress}%
                    </span>
                  </GoalProgressLabel>
                  <GoalProgressBarBg>
                    <GoalProgressBarFill
                      $width={g.progress}
                      $color={g.progress >= 70 ? '#008000' : g.progress >= 40 ? '#808000' : '#ff0000'}
                    />
                  </GoalProgressBarBg>
                </GoalProgressRow>
              ))}
            </ListContainer>
          </>
        )}

        {/* Wins */}
        {report.weekWins.length > 0 && (
          <>
            <SectionHeader>Wins This Week ({report.weekWins.length})</SectionHeader>
            <ListContainer>
              {report.weekWins.map((win, i) => (
                <WinItem key={i}>
                  <Win95Icon $bg="#FFD700" $color="#800000" style={{ width: 16, height: 16, fontSize: 10, flexShrink: 0 }}>★</Win95Icon>
                  {win}
                </WinItem>
              ))}
            </ListContainer>
          </>
        )}

        {report.totalTasks === 0 && report.totalHabitEntries === 0 && report.weekWins.length === 0 && (
          <EmptyState>
            <EmptyStateTitle>No data for this week</EmptyStateTitle>
            <EmptyStateText>Navigate to a week with activity to see your report card.</EmptyStateText>
          </EmptyState>
        )}
      </>
    );
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
    const viewHabits = getHabitsByDate(habitViewDate);
    const isHabitToday = habitViewDate === today;
    const isYesterday = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return habitViewDate === format(d, 'yyyy-MM-dd');
    })();

    if (viewHabits.length === 0 && isHabitToday) {
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

    const completedCount = habitDateCompletions.filter((c) => c.completed).length;
    const dateLabel = isHabitToday ? 'Today' : isYesterday ? 'Yesterday' : format(new Date(habitViewDate + 'T00:00:00'), 'MMM d, yyyy');

    return (
      <>
        {/* Date navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
          <Button size="sm" onClick={handleHabitDatePrev}>&#9664;</Button>
          <span
            style={{ fontSize: 12, fontWeight: 'bold', cursor: 'pointer' }}
            onClick={handleHabitDateToday}
          >
            {dateLabel}
          </span>
          <Button size="sm" onClick={handleHabitDateNext}>&#9654;</Button>
        </div>

        <SectionHeader>
          {dateLabel} - {completedCount}/{viewHabits.length} completed
        </SectionHeader>
        <ListContainer>
          {viewHabits.map((habit) => {
            const completed = isHabitCompleted(habit.habit_id);
            const missReason = getHabitMissReason(habit.habit_id);
            return (
              <React.Fragment key={habit.habit_id}>
                <ListItem
                  $completed={completed}
                  $clickable
                  onClick={() => handleToggleHabit(habit.habit_id)}
                >
                  <Checkbox $checked={completed}>
                    {completed && '\u2713'}
                  </Checkbox>
                  <ListItemText $completed={completed}>
                    {habit.name}
                    {habit.target_minutes && (
                      <span style={{ fontSize: 10, color: '#808080', marginLeft: 4 }}>({habit.target_minutes} min)</span>
                    )}
                  </ListItemText>
                  {habit.streak > 0 && (
                    <ListItemMeta>
                      <Win95Icon $bg="#FFD700" $color="#800000" style={{ width: 16, height: 16, fontSize: 10 }}>{'\u2605'}</Win95Icon>
                      {habit.streak}
                    </ListItemMeta>
                  )}
                  <Button
                    size="sm"
                    style={{ marginLeft: 8, minWidth: 32, padding: '2px 6px' }}
                    onClick={(e) => handleEditHabit(habit, e)}
                  >
                    {'\u270E'}
                  </Button>
                </ListItem>
                {!completed && (
                  <MissReasonRow>
                    {(Object.keys(MISS_REASON_LABELS) as MissReason[]).map((reason) => (
                      <MissReasonButton
                        key={reason}
                        $selected={missReason === reason}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMissReason(habit.habit_id, habitViewDate, reason);
                        }}
                      >
                        {MISS_REASON_LABELS[reason]}
                      </MissReasonButton>
                    ))}
                  </MissReasonRow>
                )}
              </React.Fragment>
            );
          })}
          {viewHabits.length === 0 && (
            <EmptyState style={{ minHeight: 80 }}>
              <EmptyStateText>No habits scheduled for this day.</EmptyStateText>
            </EmptyState>
          )}
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
              {isToday ? 'Today' : format(new Date(taskViewDate + 'T00:00:00'), 'MMM d')}
              <TierBadge $tier={getDifficultyTier(taskViewDate)}>{TIER_LABELS[getDifficultyTier(taskViewDate)]}</TierBadge>
              {' '}&mdash; {completed}/{dateTasks.length} done
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
                      {task.notes && (
                        <span style={{
                          fontSize: 9,
                          color: '#808080',
                          border: '1px solid #c0c0c0',
                          background: '#f0f0f0',
                          padding: '0 3px',
                          marginLeft: 4,
                          verticalAlign: 'middle',
                        }}>N</span>
                      )}
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
  const handleCycleTier = async (date: string) => {
    const current = getDifficultyTier(date);
    const next = cycleTier(current);
    await setDifficultyTier(date, next);
  };

  const handleDifficultyWeekPrev = () => {
    const d = new Date(difficultyWeekStart + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    setDifficultyWeekStart(format(d, 'yyyy-MM-dd'));
  };

  const handleDifficultyWeekNext = () => {
    const d = new Date(difficultyWeekStart + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    setDifficultyWeekStart(format(d, 'yyyy-MM-dd'));
  };

  const renderDifficultyPopup = () => {
    const weekDates = getWeekDates(difficultyWeekStart);
    const endDate = weekDates[6];
    const startLabel = format(new Date(difficultyWeekStart + 'T00:00:00'), 'MMM d');
    const endLabel = format(new Date(endDate + 'T00:00:00'), 'MMM d, yyyy');

    return (
      <PopupOverlay onClick={() => setShowDifficultyPopup(false)}>
        <PopupWindow onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <TitleBar>
            <span>Assign Weekly Difficulty</span>
            <TitleBarButton size="sm" onClick={() => setShowDifficultyPopup(false)}>&#10005;</TitleBarButton>
          </TitleBar>
          <PopupContent>
            {/* Week navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Button size="sm" onClick={handleDifficultyWeekPrev}>&#9664;</Button>
              <span style={{ fontSize: 12, fontWeight: 'bold' }}>{startLabel} - {endLabel}</span>
              <Button size="sm" onClick={handleDifficultyWeekNext}>&#9654;</Button>
            </div>

            {/* Day buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
              {weekDates.map((date, i) => {
                const tier = getDifficultyTier(date);
                const isToday = date === today;
                return (
                  <TierDayColumn key={date}>
                    <TierDayButton $tier={tier} onClick={() => handleCycleTier(date)}>
                      {new Date(date + 'T00:00:00').getDate()}
                    </TierDayButton>
                  </TierDayColumn>
                );
              })}
            </div>

            <div style={{ fontSize: 10, color: '#808080', textAlign: 'center', margin: '10px 0 4px' }}>
              Tap a day to cycle: Low &rarr; Med &rarr; High
            </div>

            <TierLegend>
              <TierLegendItem><TierLegendDot $color="#90EE90" /> Low</TierLegendItem>
              <TierLegendItem><TierLegendDot $color="#FFD700" /> Med</TierLegendItem>
              <TierLegendItem><TierLegendDot $color="#FF6B6B" /> High</TierLegendItem>
            </TierLegend>

            <div style={{ marginTop: 12 }}>
              <Button fullWidth onClick={() => setShowDifficultyPopup(false)}>Done</Button>
            </div>
          </PopupContent>
        </PopupWindow>
      </PopupOverlay>
    );
  };

  const getDailySummary = () => {
    const completedHabitsToday = todayCompletions.filter(c => c.completed).length;
    const totalHabitsToday = activeHabits.length;

    const todayTasks = tasks.filter(t => t.planned_date === today);
    const completedTasksToday = todayTasks.filter(t => t.status === 'completed').length;

    let aheadCount = 0, onTrackCount = 0, behindCount = 0;
    for (const g of activeGoals) {
      const progress = g.target_value > 0 ? ((g.current_value - g.starting_value) / (g.target_value - g.starting_value)) * 100 : 0;
      const totalDays = Math.max(1, Math.ceil((new Date(g.deadline).getTime() - new Date(g.start_date).getTime()) / (1000 * 60 * 60 * 24)));
      const elapsed = Math.ceil((Date.now() - new Date(g.start_date).getTime()) / (1000 * 60 * 60 * 24));
      const expected = (elapsed / totalDays) * 100;
      if (progress >= expected + 10) aheadCount++;
      else if (progress >= expected - 10) onTrackCount++;
      else behindCount++;
    }

    const sortedLogs = [...dailyLogs].sort((a, b) => b.date.localeCompare(a.date));
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = format(d, 'yyyy-MM-dd');
      if (sortedLogs.some(l => l.date === dateStr)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      habitsCompleted: completedHabitsToday,
      habitsTotal: totalHabitsToday,
      tasksCompleted: completedTasksToday,
      tasksTotal: todayTasks.length,
      goalsAhead: aheadCount,
      goalsOnTrack: onTrackCount,
      goalsBehind: behindCount,
      loggingStreak: streak,
    };
  };

  const renderTodo = () => {
    const focus = getDailyFocus(today);
    const focusGoal = focus.primary ? monthlyGoals.find((g) => g.goal_id === focus.primary) : null;
    const secondaryGoal = focus.secondary ? monthlyGoals.find((g) => g.goal_id === focus.secondary) : null;

    return (
      <>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          <Button
            style={{ flex: 1, fontSize: 11, padding: '4px 8px' }}
            onClick={() => {
              setDifficultyWeekStart(getWeekStart(today));
              setShowDifficultyPopup(true);
            }}
          >
            Assign Difficulty
          </Button>
          <Button
            style={{ flex: 1, fontSize: 11, padding: '4px 8px' }}
            onClick={() => setShowFocusPopup(true)}
          >
            {focusGoal ? `Focus: ${focusGoal.title.slice(0, 12)}...` : 'Set Focus'}
          </Button>
          <Button
            style={{ minWidth: 32, fontSize: 11, padding: '4px 6px' }}
            onClick={() => {
              const todayLog = dailyLogs.find(l => l.date === today);
              setEditingDayNotes(todayLog?.notes || '');
              setShowDailySummary(true);
            }}
          >
            [i]
          </Button>
        </div>

        {focusGoal && (
          <FocusBanner>
            Today&apos;s Focus: {focusGoal.title}
            {secondaryGoal && (
              <span style={{ fontWeight: 'normal', color: '#808080', fontSize: 10 }}>
                {' '}+ {secondaryGoal.title}
              </span>
            )}
          </FocusBanner>
        )}

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
              {activeTab === TABS.REPORT && renderReport()}
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
            $active={activeTab === TABS.REPORT}
            onClick={() => setActiveTab(TABS.REPORT)}
          >
            <TabIcon>
              <Win95Icon $bg="#ADD8E6" $color="#000080" style={{ width: 18, height: 18, fontSize: 10 }}>&#9776;</Win95Icon>
            </TabIcon>
            <TabLabel>Report</TabLabel>
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
              <FormRow>
                <FormLabel>Notes</FormLabel>
                <StyledTextArea
                  value={editingGoalNotes}
                  onChange={(e) => setEditingGoalNotes(e.target.value)}
                  placeholder="Optional notes about this goal..."
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

      {/* Difficulty Tier Popup */}
      {showDifficultyPopup && renderDifficultyPopup()}

      {/* Daily Focus Popup */}
      {showFocusPopup && (() => {
        const focus = getDailyFocus(today);
        return (
          <PopupOverlay onClick={() => setShowFocusPopup(false)}>
            <PopupWindow onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <TitleBar>
                <span>Set Daily Focus</span>
                <TitleBarButton size="sm" onClick={() => setShowFocusPopup(false)}>
                  {'\u2715'}
                </TitleBarButton>
              </TitleBar>
              <PopupContent>
                <FormRow>
                  <FormLabel>Primary Focus Goal</FormLabel>
                  <StyledSelect
                    value={focus.primary || ''}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const val = e.target.value || null;
                      // If selecting same as secondary, clear secondary
                      const sec = val && focus.secondary === val ? null : focus.secondary;
                      setDailyFocus(today, val, sec);
                    }}
                  >
                    <option value="">-- None --</option>
                    {monthlyGoals.map((g) => (
                      <option key={g.goal_id} value={g.goal_id}>{g.title}</option>
                    ))}
                  </StyledSelect>
                </FormRow>
                <FormRow>
                  <FormLabel>Secondary Focus (optional)</FormLabel>
                  <StyledSelect
                    value={focus.secondary || ''}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      setDailyFocus(today, focus.primary, e.target.value || null);
                    }}
                  >
                    <option value="">-- None --</option>
                    {monthlyGoals
                      .filter((g) => g.goal_id !== focus.primary)
                      .map((g) => (
                        <option key={g.goal_id} value={g.goal_id}>{g.title}</option>
                      ))}
                  </StyledSelect>
                </FormRow>
                <Button primary fullWidth onClick={() => setShowFocusPopup(false)}>
                  Done
                </Button>
              </PopupContent>
            </PopupWindow>
          </PopupOverlay>
        );
      })()}

      {/* Daily Summary Popup */}
      {showDailySummary && (() => {
        const summary = getDailySummary();
        return (
          <PopupOverlay onClick={() => setShowDailySummary(false)}>
            <PopupWindow onClick={(e) => e.stopPropagation()}>
              <TitleBar>
                <span>Daily Summary - {format(new Date(), 'MMM d')}</span>
                <TitleBarButton size="sm" onClick={() => setShowDailySummary(false)}>
                  &#10005;
                </TitleBarButton>
              </TitleBar>
              <PopupContent>
                <SectionHeader>Today</SectionHeader>
                <ListContainer>
                  <ReportStatRow>
                    <StatLabel>Habits</StatLabel>
                    <StatValue>{summary.habitsCompleted}/{summary.habitsTotal}</StatValue>
                  </ReportStatRow>
                  <ReportStatRow>
                    <StatLabel>Tasks</StatLabel>
                    <StatValue>{summary.tasksCompleted}/{summary.tasksTotal}</StatValue>
                  </ReportStatRow>
                </ListContainer>

                <SectionHeader>Goals</SectionHeader>
                <ListContainer>
                  <ReportStatRow>
                    <StatLabel>Ahead</StatLabel>
                    <StatValue $color="#008000">{summary.goalsAhead}</StatValue>
                  </ReportStatRow>
                  <ReportStatRow>
                    <StatLabel>On Track</StatLabel>
                    <StatValue $color="#808000">{summary.goalsOnTrack}</StatValue>
                  </ReportStatRow>
                  <ReportStatRow>
                    <StatLabel>Behind</StatLabel>
                    <StatValue $color="#ff0000">{summary.goalsBehind}</StatValue>
                  </ReportStatRow>
                </ListContainer>

                <SectionHeader>Streaks</SectionHeader>
                <ListContainer>
                  <ReportStatRow>
                    <StatLabel>Logging Streak</StatLabel>
                    <StatValue>{summary.loggingStreak} days</StatValue>
                  </ReportStatRow>
                </ListContainer>

                <SectionHeader>Day Notes</SectionHeader>
                <StyledTextArea
                  value={editingDayNotes}
                  onChange={(e) => setEditingDayNotes(e.target.value)}
                  placeholder="How was your day? Any thoughts..."
                  style={{ marginBottom: 8 }}
                />
                <Button
                  fullWidth
                  onClick={async () => {
                    const todayLog = dailyLogs.find(l => l.date === today);
                    await saveDailyLog({
                      date: today,
                      day_type: todayLog?.day_type ?? null,
                      energy_level: todayLog?.energy_level ?? null,
                      hours_slept: todayLog?.hours_slept ?? null,
                      work_hours: todayLog?.work_hours ?? null,
                      school_hours: todayLog?.school_hours ?? null,
                      free_hours: todayLog?.free_hours ?? null,
                      overall_rating: todayLog?.overall_rating ?? null,
                      notes: editingDayNotes.trim() || null,
                      sick: todayLog?.sick ?? false,
                      accomplishments: todayLog?.accomplishments,
                      difficulty_tier: todayLog?.difficulty_tier,
                      primary_goal_id: todayLog?.primary_goal_id,
                      secondary_goal_id: todayLog?.secondary_goal_id,
                      created_at: todayLog?.created_at ?? new Date().toISOString(),
                    });
                  }}
                  style={{ marginBottom: 8 }}
                >
                  Save Notes
                </Button>

                <Button fullWidth onClick={() => setShowDailySummary(false)} style={{ marginTop: 0 }}>
                  Close
                </Button>
              </PopupContent>
            </PopupWindow>
          </PopupOverlay>
        );
      })()}

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
                  <FormRow>
                    <FormLabel>Notes (optional)</FormLabel>
                    <StyledTextArea
                      value={newTaskNotes}
                      onChange={(e) => setNewTaskNotes(e.target.value)}
                      placeholder="Optional notes..."
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
