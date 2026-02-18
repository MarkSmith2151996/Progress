-- Supabase Schema for Progress Tracker
-- Run this in the Supabase SQL Editor to create all tables
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- Goals (add keywords + increment_type for smart matching)
CREATE TABLE IF NOT EXISTS goals (
  goal_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'monthly' | 'weekly_chunk' | 'bonus'
  parent_goal_id TEXT,
  target_value REAL NOT NULL,
  starting_value REAL DEFAULT 0,
  current_value REAL DEFAULT 0,
  unit TEXT DEFAULT '',
  start_date DATE NOT NULL,
  deadline DATE NOT NULL,
  status TEXT DEFAULT 'active',
  priority INTEGER DEFAULT 1,
  keywords TEXT[],  -- For smart matching: ['sat', 'test', 'practice']
  increment_type TEXT DEFAULT 'count',  -- 'count' | 'value' | 'time'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Logs (accomplishments as JSONB array)
CREATE TABLE IF NOT EXISTS daily_logs (
  date DATE PRIMARY KEY,
  day_type TEXT,
  difficulty_tier TEXT DEFAULT 'med',  -- 'low' | 'med' | 'high'
  energy_level INTEGER,
  hours_slept REAL,
  work_hours REAL,
  school_hours REAL,
  free_hours REAL,
  overall_rating INTEGER,
  notes TEXT,
  sick BOOLEAN DEFAULT FALSE,
  accomplishments TEXT[],
  primary_goal_id TEXT REFERENCES goals(goal_id) ON DELETE SET NULL,
  secondary_goal_id TEXT REFERENCES goals(goal_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habits
CREATE TABLE IF NOT EXISTS habits (
  habit_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target_minutes INTEGER,
  days_active TEXT[] DEFAULT ARRAY['mon','tue','wed','thu','fri','sat','sun'],
  active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habit Completions
CREATE TABLE IF NOT EXISTS habit_completions (
  completion_id TEXT PRIMARY KEY,
  habit_id TEXT REFERENCES habits(habit_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  miss_reason TEXT,  -- 'no_time' | 'forgot' | 'not_prioritized' | 'not_applicable'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id, date)
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  task_id TEXT PRIMARY KEY,
  goal_id TEXT REFERENCES goals(goal_id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  planned_date DATE NOT NULL,
  completed_date DATE,
  status TEXT DEFAULT 'planned',
  time_estimated INTEGER,
  time_actual INTEGER,
  difficulty INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Settings (for coach context, preferences)
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY DEFAULT 'default_user',
  coach_context TEXT,  -- Custom context for AI coach
  theme TEXT DEFAULT 'terminal-classic',
  preferences JSONB DEFAULT '{}',  -- All app preferences (display, coach, habits, etc.)
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coach Messages (relay between mobile and desktop via Claude CLI)
CREATE TABLE IF NOT EXISTS coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,  -- 'user' | 'assistant'
  content TEXT NOT NULL,
  platform TEXT DEFAULT 'mobile',  -- 'mobile' | 'desktop'
  status TEXT DEFAULT 'pending',  -- 'pending' | 'processing' | 'completed' | 'error'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Coach Digests (daily/weekly AI-generated summaries)
CREATE TABLE IF NOT EXISTS coach_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_type TEXT NOT NULL,  -- 'daily' | 'weekly'
  content TEXT NOT NULL,
  metrics JSONB,
  digest_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable real-time for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE goals;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE habits;
ALTER PUBLICATION supabase_realtime ADD TABLE habit_completions;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE user_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE coach_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE coach_digests;

-- Enable Row Level Security (optional - enable when you add auth)
-- ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date);
CREATE INDEX IF NOT EXISTS idx_habits_active ON habits(active);
CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(date);
CREATE INDEX IF NOT EXISTS idx_tasks_planned_date ON tasks(planned_date);
CREATE INDEX IF NOT EXISTS idx_coach_messages_session ON coach_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_coach_messages_status ON coach_messages(status);
CREATE INDEX IF NOT EXISTS idx_coach_digests_date ON coach_digests(digest_date);
