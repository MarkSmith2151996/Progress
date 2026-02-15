const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// READ HELPERS
// ============================================

async function fetchGoals(activeOnly = true) {
  let query = supabase.from('goals').select('*');
  if (activeOnly) query = query.eq('status', 'active');
  const { data, error } = await query.order('priority', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function fetchTasks(startDate, endDate) {
  let query = supabase.from('tasks').select('*');
  if (startDate) query = query.gte('planned_date', startDate);
  if (endDate) query = query.lte('planned_date', endDate);
  const { data, error } = await query.order('planned_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function fetchHabits(activeOnly = true) {
  let query = supabase.from('habits').select('*');
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query.order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function fetchHabitCompletions(startDate, endDate) {
  let query = supabase.from('habit_completions').select('*');
  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);
  const { data, error } = await query.order('date', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function fetchDailyLogs(startDate, endDate) {
  let query = supabase.from('daily_logs').select('*');
  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);
  const { data, error } = await query.order('date', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ============================================
// WRITE HELPERS
// ============================================

async function upsertTask(task) {
  const { data, error } = await supabase
    .from('tasks')
    .upsert(task, { onConflict: 'task_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function upsertDailyLog(log) {
  const { data, error } = await supabase
    .from('daily_logs')
    .upsert(log, { onConflict: 'date' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function upsertHabitCompletion(completion) {
  const { data, error } = await supabase
    .from('habit_completions')
    .upsert(completion, { onConflict: 'completion_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function upsertGoal(goal) {
  const { data, error } = await supabase
    .from('goals')
    .upsert({ ...goal, updated_at: new Date().toISOString() }, { onConflict: 'goal_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = {
  fetchGoals,
  fetchTasks,
  fetchHabits,
  fetchHabitCompletions,
  fetchDailyLogs,
  upsertTask,
  upsertDailyLog,
  upsertHabitCompletion,
  upsertGoal,
};
