// ============================================
// CORE DATA TYPES
// ============================================

export type GoalType = 'monthly' | 'weekly_chunk' | 'bonus';
export type GoalStatus = 'active' | 'completed' | 'abandoned' | 'paused';
export type TaskStatus = 'planned' | 'completed' | 'skipped' | 'rolled';
export type DayType = 'school' | 'work' | 'both' | 'off';
export type AlertLevel = 'critical' | 'warning' | 'info' | 'positive';
export type FieldType = 'number' | 'string' | 'boolean' | 'enum';
export type AppliesTo = 'daily_log' | 'task' | 'session' | 'goal';
export type ExternalFactorType = 'illness' | 'exam_period' | 'heavy_work' | 'life_event' | 'travel';
export type IncrementType = 'count' | 'value' | 'time';

// ============================================
// GOALS
// ============================================

export interface Goal {
  goal_id: string;
  title: string;
  type: GoalType;
  parent_goal_id: string | null;
  target_value: number;
  starting_value: number;
  current_value: number;
  unit: string;
  start_date: string;
  deadline: string;
  status: GoalStatus;
  priority: number;
  keywords?: string[];  // For smart goal matching: ['sat', 'test', 'practice']
  increment_type?: IncrementType;  // How to extract delta: 'count' | 'value' | 'time'
  created_at: string;
  updated_at: string;
}

export interface GoalWithProgress extends Goal {
  progress: number;
  daysRemaining: number;
  statusIndicator: 'ahead' | 'on_track' | 'behind';
}

// ============================================
// TASKS
// ============================================

export interface Task {
  task_id: string;
  goal_id: string | null;
  description: string;
  planned_date: string;
  completed_date: string | null;
  status: TaskStatus;
  time_estimated: number | null;
  time_actual: number | null;
  difficulty: number | null;
  notes: string | null;
  created_at: string;
}

// ============================================
// DAILY LOGS
// ============================================

export type DifficultyTier = 'low' | 'med' | 'high';

export interface DailyLog {
  date: string;
  day_type: DayType | null;
  difficulty_tier?: DifficultyTier;
  energy_level: number | null;
  hours_slept: number | null;
  work_hours: number | null;
  school_hours: number | null;
  free_hours: number | null;
  overall_rating: number | null;
  notes: string | null;
  sick: boolean;
  accomplishments?: string[];
  primary_goal_id?: string | null;
  secondary_goal_id?: string | null;
  created_at: string;
  updated_at?: string;
}

// ============================================
// HABITS
// ============================================

export interface Habit {
  habit_id: string;
  name: string;
  target_minutes: number | null;
  days_active: string[];
  active: boolean;
  sort_order: number;
  created_at: string;
}

export type MissReason = 'no_time' | 'forgot' | 'not_prioritized' | 'not_applicable';

export interface HabitCompletion {
  completion_id: string;
  habit_id: string;
  date: string;
  completed: boolean;
  miss_reason?: MissReason;
  created_at: string;
}

export interface HabitWithStatus extends Habit {
  completed: boolean;
  streak: number;
}

// ============================================
// SESSIONS
// ============================================

export interface Session {
  session_id: string;
  date: string;
  task_id: string | null;
  goal_id: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  focus_quality: number | null;
  interruptions: number;
  notes: string | null;
}

// ============================================
// EXTERNAL FACTORS
// ============================================

export interface ExternalFactor {
  factor_id: string;
  date_start: string;
  date_end: string;
  type: ExternalFactorType;
  severity: number;
  description: string;
  affected_goals: string[];
  created_at: string;
}

// ============================================
// SNAPSHOTS & REVIEWS
// ============================================

export interface WeeklySnapshot {
  week_id: string;
  start_date: string;
  end_date: string;
  score: number;
  tasks_planned: number;
  tasks_completed: number;
  monthly_goal_progress: Record<string, number>;
  bonus_goals_hit: number;
  bonus_goals_total: number;
  consistency_streak: number;
  coach_summary: string | null;
  lessons: string | null;
  created_at: string;
}

export interface MonthlyReview {
  month_id: string;
  goals_set: Goal[];
  goals_completed: Goal[];
  overall_score: number;
  biggest_win: string | null;
  biggest_miss: string | null;
  coach_analysis: string | null;
  next_month_recommendations: string | null;
  created_at: string;
}

// ============================================
// CUSTOM FIELDS (Claude-Extensible)
// ============================================

export interface CustomField {
  field_id: string;
  field_name: string;
  field_type: FieldType;
  enum_options: string[] | null;
  applies_to: AppliesTo;
  created_by: 'user' | 'claude';
  rationale: string | null;
  approved: boolean;
  approved_at: string | null;
  active: boolean;
  created_at: string;
}

export interface CustomFieldValue {
  value_id: string;
  field_id: string;
  record_id: string;
  record_type: AppliesTo;
  value: string;
  created_at: string;
}

export interface FieldProposal {
  proposal_id: string;
  field_name: string;
  field_type: FieldType;
  applies_to: AppliesTo;
  rationale: string;
  expected_insight: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  resolved_at: string | null;
}

// ============================================
// ALERTS
// ============================================

export interface Alert {
  id: string;
  level: AlertLevel;
  type: string;
  message: string;
  contextualMessage?: string;
  timestamp: string;
  dismissed: boolean;
}

// ============================================
// METRICS
// ============================================

export interface DailyMetrics {
  date: string;
  completion_rate: number;
  tasks_planned: number;
  tasks_completed: number;
  time_estimated: number;
  time_actual: number;
  productive_hours: number;
  goal_touch_rate: number;
}

export interface WeeklyMetrics {
  week_id: string;
  weekly_score: number;
  completion_rate: number;
  goal_velocity: number;
  bonus_rate: number;
  consistency: number;
  trend: number;
}

// ============================================
// CLAUDE INTEGRATION
// ============================================

export interface ContextPackage {
  currentDate: string;
  dayType: DayType | null;
  energy: number | null;
  activeGoals: {
    id: string;
    title: string;
    type: GoalType;
    progress: number;
    daysRemaining: number;
    status: 'ahead' | 'on_track' | 'behind';
  }[];
  tasksPlanned: number;
  tasksCompleted: number;
  weeklyScore: number | null;
  habitsToday: {
    name: string;
    completed: boolean;
    streak: number;
  }[];
  habitCompletionRate: number;
  streak: number;
  alerts: {
    level: AlertLevel;
    message: string;
  }[];
  recentLogs: {
    date: string;
    energy: number | null;
    hoursSlept: number | null;
    tasksCompleted: number;
    overallRating: number | null;
  }[];
  recentWeeks: {
    weekId: string;
    score: number;
    trend: number;
  }[];
  patterns: {
    insight: string;
    confidence: 'high' | 'medium' | 'low';
  }[];
  customFields: {
    name: string;
    appliesTo: string;
    recentValues: unknown[];
  }[];
  pendingProposals: {
    fieldName: string;
    rationale: string;
  }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export type CoachMessageStatus = 'pending' | 'processing' | 'completed' | 'error';
export type CoachPlatform = 'mobile' | 'desktop';
export type CoachDigestType = 'daily' | 'weekly';

export interface CoachMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  platform: CoachPlatform;
  status: CoachMessageStatus;
  created_at: string;
  processed_at: string | null;
}

export interface CoachDigest {
  id: string;
  digest_type: CoachDigestType;
  content: string;
  metrics: Record<string, unknown> | null;
  digest_date: string;
  created_at: string;
}

export type AccomplishmentCategory = 'study' | 'work' | 'health' | 'personal' | 'project' | 'other';

export interface ParsedAccomplishment {
  description: string;
  goalId: string | null;
  timeSpent: number | null;
  difficulty: number | null;
  category?: AccomplishmentCategory;
}

// ============================================
// SETTINGS
// ============================================

export type FontSize = 'small' | 'medium' | 'large';
export type KeyboardSize = 'compact' | 'medium' | 'large' | 'xlarge';
export type CoachTone = 'direct' | 'encouraging' | 'balanced';
export type DigestFrequency = 'daily' | 'weekly';

export interface UserSettings {
  theme: string;
  coach_minimized: boolean;
  week_colors: Record<string, string>;
  notifications_enabled: boolean;
  // Profile
  display_name: string;
  // Appearance
  default_tab: number;
  accent_color: string;
  react95_theme: string;
  font_size: FontSize;
  // Coach
  coach_tone: CoachTone;
  digest_enabled: boolean;
  digest_frequency: DigestFrequency;
  // Keyboard
  keyboard_size: KeyboardSize;
  // Habits
  show_streaks: boolean;
  // Report Card
  baseline_date: string | null;
}

export interface WeekColor {
  year: number;
  week_number: number;
  color: string;
}

// ============================================
// UI STATE
// ============================================

export interface CalendarState {
  currentMonth: Date;
  selectedDay: string | null;
  selectedWeek: string | null;
}

export interface CoachState {
  minimized: boolean;
  summary: string | null;
  chatHistory: ChatMessage[];
  isLoading: boolean;
}

// ============================================
// THEME
// ============================================

export interface Theme {
  name: string;
  displayName: string;
  category: 'dark' | 'light' | 'retro' | 'special';
  variables: {
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    bgPopup: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accentPrimary: string;
    accentSecondary: string;
    accentWarning: string;
    accentError: string;
    accentSuccess: string;
    borderColor: string;
    borderRadius: string;
    fontPrimary: string;
    fontHeading: string;
    shadow: string;
    glow: string;
  };
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SheetsResponse<T> {
  rows: T[];
  headers: string[];
}
