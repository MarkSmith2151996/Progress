const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const { format, subDays, startOfWeek, endOfWeek } = require('date-fns');
const db = require('./supabase');

const server = new McpServer({
  name: 'progress-tracker',
  version: '1.0.0',
});

function getToday() {
  return format(new Date(), 'yyyy-MM-dd');
}

function getDefaultRange() {
  return {
    start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    end: getToday(),
  };
}

// ============================================
// READ TOOLS
// ============================================

server.tool(
  'get_goals',
  'Get all goals with progress. Returns active goals by default.',
  { include_inactive: z.boolean().optional().describe('Include completed/paused/abandoned goals') },
  async ({ include_inactive }) => {
    const goals = await db.fetchGoals(!include_inactive);
    const enriched = goals.map((g) => {
      const range = g.target_value - g.starting_value;
      const progress = range > 0 ? Math.round(((g.current_value - g.starting_value) / range) * 100) : 0;
      const daysLeft = Math.max(0, Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      return { ...g, progress_pct: Math.min(100, progress), days_remaining: daysLeft };
    });
    return { content: [{ type: 'text', text: JSON.stringify(enriched, null, 2) }] };
  }
);

server.tool(
  'get_tasks',
  'Get tasks for a date range. Defaults to last 7 days.',
  {
    start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
    end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
  },
  async ({ start_date, end_date }) => {
    const range = getDefaultRange();
    const tasks = await db.fetchTasks(start_date || range.start, end_date || range.end);
    return { content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }] };
  }
);

server.tool(
  'get_habits',
  "Get active habits with today's completion status.",
  { include_inactive: z.boolean().optional().describe('Include inactive habits') },
  async ({ include_inactive }) => {
    const habits = await db.fetchHabits(!include_inactive);
    const today = getToday();
    const completions = await db.fetchHabitCompletions(today, today);

    const enriched = habits.map((h) => {
      const completion = completions.find((c) => c.habit_id === h.habit_id);
      return { ...h, completed_today: completion?.completed ?? false };
    });
    return { content: [{ type: 'text', text: JSON.stringify(enriched, null, 2) }] };
  }
);

server.tool(
  'get_habit_completions',
  'Get habit completion records for a date range.',
  {
    start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
    end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
  },
  async ({ start_date, end_date }) => {
    const range = getDefaultRange();
    const completions = await db.fetchHabitCompletions(start_date || range.start, end_date || range.end);
    return { content: [{ type: 'text', text: JSON.stringify(completions, null, 2) }] };
  }
);

server.tool(
  'get_daily_logs',
  'Get daily logs (accomplishments, energy, sleep, ratings) for a date range.',
  {
    start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
    end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
  },
  async ({ start_date, end_date }) => {
    const range = getDefaultRange();
    const logs = await db.fetchDailyLogs(start_date || range.start, end_date || range.end);
    return { content: [{ type: 'text', text: JSON.stringify(logs, null, 2) }] };
  }
);

server.tool(
  'get_weekly_report',
  'Get computed weekly stats: task %, habit %, logging days, goal progress, wins, overall score and grade.',
  {
    week_start: z.string().optional().describe('Monday of the week (YYYY-MM-DD). Defaults to current week.'),
  },
  async ({ week_start }) => {
    const ws = week_start
      ? new Date(week_start + 'T00:00:00')
      : startOfWeek(new Date(), { weekStartsOn: 1 });
    const we = endOfWeek(ws, { weekStartsOn: 1 });
    const wsStr = format(ws, 'yyyy-MM-dd');
    const weStr = format(we, 'yyyy-MM-dd');
    const todayStr = getToday();
    const isCurrentWeek = wsStr <= todayStr && weStr >= todayStr;

    // Baseline check: return zeroed report for weeks before baseline_date
    try {
      const settings = await db.fetchUserSettings();
      const baselineDate = settings?.preferences?.baseline_date;
      if (baselineDate && weStr < baselineDate) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              week: `${wsStr} to ${weStr}`,
              is_current_week: isCurrentWeek,
              score: 0, grade: '—',
              message: `Week is before baseline date (${baselineDate}). Scores reset.`,
              tasks: { completed: 0, total: 0, rate: 0 },
              habits: { completed: 0, total: 0, rate: 0 },
              logging: { days: 0, rate: 0 },
              goals: [], wins: [],
            }, null, 2),
          }],
        };
      }
    } catch (e) {
      // If settings fetch fails, continue normally
    }

    const [tasks, habitCompletions, dailyLogs, goals] = await Promise.all([
      db.fetchTasks(wsStr, weStr),
      db.fetchHabitCompletions(wsStr, weStr),
      db.fetchDailyLogs(wsStr, weStr),
      db.fetchGoals(true),
    ]);

    const habits = await db.fetchHabits(true);

    const completedTasks = tasks.filter((t) => t.status === 'completed');
    const taskRate = tasks.length > 0 ? completedTasks.length / tasks.length : 0;

    // Count scheduled habit slots vs completed
    const dayLimit = isCurrentWeek ? todayStr : weStr;
    let totalHabitSlots = 0;
    let completedHabitSlots = 0;
    for (let d = new Date(ws); format(d, 'yyyy-MM-dd') <= dayLimit; d.setDate(d.getDate() + 1)) {
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayName = format(d, 'EEE').toLowerCase().slice(0, 3);
      habits.forEach((h) => {
        const daysActive = (h.days_active || []).map((x) => x.toLowerCase().slice(0, 3));
        const isActive = daysActive.length === 0 || daysActive.includes(dayName);
        if (isActive) {
          totalHabitSlots++;
          const completion = habitCompletions.find((c) => c.habit_id === h.habit_id && c.date === dateStr);
          if (completion && completion.completed) completedHabitSlots++;
        }
      });
    }
    const habitRate = totalHabitSlots > 0 ? completedHabitSlots / totalHabitSlots : 0;

    const daysLogged = dailyLogs.length;
    const loggingRate = daysLogged / 7;

    const goalSnapshots = goals.map((g) => {
      const range = g.target_value - g.starting_value;
      const progress = range > 0 ? Math.round(((g.current_value - g.starting_value) / range) * 100) : 0;
      return { title: g.title, progress: Math.min(100, progress) };
    });
    const avgGoalProgress = goalSnapshots.length > 0
      ? goalSnapshots.reduce((sum, g) => sum + g.progress, 0) / goalSnapshots.length / 100
      : 0;

    const weekWins = [];
    dailyLogs.forEach((log) => {
      if (log.accomplishments) log.accomplishments.forEach((a) => weekWins.push(a));
    });

    const score = Math.round((taskRate * 0.3 + habitRate * 0.3 + loggingRate * 0.2 + avgGoalProgress * 0.2) * 100);
    const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

    const report = {
      week: `${wsStr} to ${weStr}`,
      is_current_week: isCurrentWeek,
      score, grade,
      tasks: { completed: completedTasks.length, total: tasks.length, rate: Math.round(taskRate * 100) },
      habits: { completed: completedHabitSlots, total: totalHabitSlots, rate: Math.round(habitRate * 100) },
      logging: { days: daysLogged, rate: Math.round(loggingRate * 100) },
      goals: goalSnapshots,
      wins: weekWins,
    };

    return { content: [{ type: 'text', text: JSON.stringify(report, null, 2) }] };
  }
);

// ============================================
// WRITE TOOLS
// ============================================

server.tool(
  'add_task',
  'Create a new task/to-do item.',
  {
    description: z.string().describe('Task description'),
    planned_date: z.string().optional().describe('Date for the task (YYYY-MM-DD). Defaults to today.'),
    goal_id: z.string().optional().describe('Link to a goal by goal_id'),
    time_estimated: z.number().optional().describe('Estimated minutes'),
  },
  async ({ description, planned_date, goal_id, time_estimated }) => {
    const task = await db.upsertTask({
      task_id: `task_${Date.now()}`,
      description,
      planned_date: planned_date || getToday(),
      goal_id: goal_id || null,
      completed_date: null,
      status: 'planned',
      time_estimated: time_estimated || null,
      time_actual: null,
      difficulty: null,
      notes: null,
      created_at: new Date().toISOString(),
    });
    return { content: [{ type: 'text', text: `Task created: "${task.description}" for ${task.planned_date}` }] };
  }
);

server.tool(
  'log_accomplishment',
  'Add an accomplishment/win to a daily log.',
  {
    text: z.string().describe('The accomplishment text'),
    date: z.string().optional().describe('Date (YYYY-MM-DD). Defaults to today.'),
  },
  async ({ text, date }) => {
    const logDate = date || getToday();
    const existingLogs = await db.fetchDailyLogs(logDate, logDate);
    const existing = existingLogs[0];

    const currentAccomplishments = existing?.accomplishments || [];
    const updatedLog = {
      date: logDate,
      day_type: existing?.day_type ?? null,
      energy_level: existing?.energy_level ?? null,
      hours_slept: existing?.hours_slept ?? null,
      work_hours: existing?.work_hours ?? null,
      school_hours: existing?.school_hours ?? null,
      free_hours: existing?.free_hours ?? null,
      overall_rating: existing?.overall_rating ?? null,
      notes: existing?.notes ?? null,
      sick: existing?.sick ?? false,
      accomplishments: [...currentAccomplishments, text],
      created_at: existing?.created_at ?? new Date().toISOString(),
    };

    await db.upsertDailyLog(updatedLog);
    return { content: [{ type: 'text', text: `Accomplishment logged for ${logDate}: "${text}"` }] };
  }
);

server.tool(
  'toggle_habit',
  'Mark a habit as done or undone for a specific date. Optionally set a miss reason when marking undone.',
  {
    habit_id: z.string().describe('The habit ID'),
    date: z.string().optional().describe('Date (YYYY-MM-DD). Defaults to today.'),
    completed: z.boolean().optional().describe('Set to true (done) or false (undone). Defaults to true.'),
    miss_reason: z.enum(['no_time', 'forgot', 'not_prioritized', 'not_applicable']).optional().describe('Why the habit was missed (only when completed=false)'),
  },
  async ({ habit_id, date, completed, miss_reason }) => {
    const targetDate = date || getToday();
    const isDone = completed !== undefined ? completed : true;

    const existing = await db.fetchHabitCompletions(targetDate, targetDate);
    const existingCompletion = existing.find((c) => c.habit_id === habit_id);

    const completion = {
      completion_id: existingCompletion?.completion_id || `hc_${Date.now()}`,
      habit_id,
      date: targetDate,
      completed: isDone,
      miss_reason: isDone ? null : (miss_reason || null),
      created_at: existingCompletion?.created_at || new Date().toISOString(),
    };

    await db.upsertHabitCompletion(completion);
    return { content: [{ type: 'text', text: `Habit ${habit_id} marked as ${isDone ? 'done' : 'undone'} for ${targetDate}` }] };
  }
);

server.tool(
  'update_goal_progress',
  "Set or increment a goal's current_value.",
  {
    goal_id: z.string().describe('The goal ID'),
    current_value: z.number().optional().describe('Set current_value to this exact number'),
    increment: z.number().optional().describe('Add this amount to current_value'),
  },
  async ({ goal_id, current_value, increment }) => {
    if (current_value === undefined && increment === undefined) {
      return { content: [{ type: 'text', text: 'Error: provide either current_value or increment' }] };
    }

    const goals = await db.fetchGoals(false);
    const goal = goals.find((g) => g.goal_id === goal_id);
    if (!goal) {
      return { content: [{ type: 'text', text: `Error: goal ${goal_id} not found` }] };
    }

    const newValue = current_value !== undefined ? current_value : goal.current_value + (increment || 0);
    await db.upsertGoal({ goal_id, current_value: newValue });

    const range = goal.target_value - goal.starting_value;
    const progress = range > 0 ? Math.round(((newValue - goal.starting_value) / range) * 100) : 0;
    return { content: [{ type: 'text', text: `Goal "${goal.title}" updated: ${newValue}/${goal.target_value} (${Math.min(100, progress)}%)` }] };
  }
);

server.tool(
  'set_difficulty_tier',
  'Set the difficulty tier for a day (low/med/high).',
  {
    date: z.string().describe('Date (YYYY-MM-DD)'),
    tier: z.enum(['low', 'med', 'high']).describe('Difficulty tier'),
  },
  async ({ date, tier }) => {
    const existingLogs = await db.fetchDailyLogs(date, date);
    const existing = existingLogs[0];

    const log = {
      date,
      day_type: existing?.day_type ?? null,
      difficulty_tier: tier,
      energy_level: existing?.energy_level ?? null,
      hours_slept: existing?.hours_slept ?? null,
      work_hours: existing?.work_hours ?? null,
      school_hours: existing?.school_hours ?? null,
      free_hours: existing?.free_hours ?? null,
      overall_rating: existing?.overall_rating ?? null,
      notes: existing?.notes ?? null,
      sick: existing?.sick ?? false,
      accomplishments: existing?.accomplishments ?? [],
      created_at: existing?.created_at ?? new Date().toISOString(),
    };

    await db.upsertDailyLog(log);
    return { content: [{ type: 'text', text: `Difficulty for ${date} set to ${tier}` }] };
  }
);

server.tool(
  'generate_weekly_summary',
  'Store an AI-generated weekly summary text as a daily log note for the week.',
  {
    week_start: z.string().describe('Monday of the week (YYYY-MM-DD)'),
    summary: z.string().describe('The weekly summary text to store'),
  },
  async ({ week_start, summary }) => {
    const ws = new Date(week_start + 'T00:00:00');
    const sunday = new Date(ws);
    sunday.setDate(ws.getDate() + 6);
    const sundayStr = format(sunday, 'yyyy-MM-dd');

    const existingLogs = await db.fetchDailyLogs(sundayStr, sundayStr);
    const existing = existingLogs[0];

    const log = {
      date: sundayStr,
      day_type: existing?.day_type ?? null,
      energy_level: existing?.energy_level ?? null,
      hours_slept: existing?.hours_slept ?? null,
      work_hours: existing?.work_hours ?? null,
      school_hours: existing?.school_hours ?? null,
      free_hours: existing?.free_hours ?? null,
      overall_rating: existing?.overall_rating ?? null,
      notes: `[Weekly Summary ${week_start}]\n${summary}`,
      sick: existing?.sick ?? false,
      accomplishments: existing?.accomplishments ?? [],
      created_at: existing?.created_at ?? new Date().toISOString(),
    };

    await db.upsertDailyLog(log);
    return { content: [{ type: 'text', text: `Weekly summary stored for week of ${week_start}` }] };
  }
);

server.tool(
  'set_daily_focus',
  'Set the primary and optional secondary focus goal for a day.',
  {
    date: z.string().optional().describe('Date (YYYY-MM-DD). Defaults to today.'),
    primary_goal_id: z.string().nullable().describe('Primary focus goal ID (null to clear)'),
    secondary_goal_id: z.string().nullable().optional().describe('Secondary focus goal ID (null to clear)'),
  },
  async ({ date, primary_goal_id, secondary_goal_id }) => {
    const targetDate = date || getToday();
    const existingLogs = await db.fetchDailyLogs(targetDate, targetDate);
    const existing = existingLogs[0];

    const log = {
      date: targetDate,
      day_type: existing?.day_type ?? null,
      difficulty_tier: existing?.difficulty_tier ?? 'med',
      energy_level: existing?.energy_level ?? null,
      hours_slept: existing?.hours_slept ?? null,
      work_hours: existing?.work_hours ?? null,
      school_hours: existing?.school_hours ?? null,
      free_hours: existing?.free_hours ?? null,
      overall_rating: existing?.overall_rating ?? null,
      notes: existing?.notes ?? null,
      sick: existing?.sick ?? false,
      accomplishments: existing?.accomplishments ?? [],
      primary_goal_id: primary_goal_id,
      secondary_goal_id: secondary_goal_id ?? null,
      created_at: existing?.created_at ?? new Date().toISOString(),
    };

    await db.upsertDailyLog(log);

    // Fetch goal titles for confirmation
    let primaryTitle = 'None';
    let secondaryTitle = 'None';
    if (primary_goal_id || secondary_goal_id) {
      const goals = await db.fetchGoals(false);
      if (primary_goal_id) {
        const g = goals.find((g) => g.goal_id === primary_goal_id);
        primaryTitle = g ? g.title : primary_goal_id;
      }
      if (secondary_goal_id) {
        const g = goals.find((g) => g.goal_id === secondary_goal_id);
        secondaryTitle = g ? g.title : secondary_goal_id;
      }
    }

    return {
      content: [{
        type: 'text',
        text: `Daily focus set for ${targetDate}:\n  Primary: ${primaryTitle}\n  Secondary: ${secondaryTitle}`,
      }],
    };
  }
);

// ============================================
// GOAL EVALUATION TOOL
// ============================================

server.tool(
  'evaluate_goals',
  'Gather all data needed to evaluate goal progress: goals with linked tasks, matching accomplishments, and habit data. Use this before calling update_goal_progress. Returns everything Claude needs to reason about how much progress has been made.',
  {
    lookback_days: z.number().optional().describe('How many days of data to analyze. Defaults to 14.'),
  },
  async ({ lookback_days }) => {
    const days = lookback_days || 14;
    const endDate = getToday();
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

    const [goals, tasks, dailyLogs, habits, habitCompletions] = await Promise.all([
      db.fetchGoals(true),
      db.fetchTasks(startDate, endDate),
      db.fetchDailyLogs(startDate, endDate),
      db.fetchHabits(true),
      db.fetchHabitCompletions(startDate, endDate),
    ]);

    // Collect all accomplishments from the period
    const accomplishments = [];
    dailyLogs.forEach((log) => {
      if (log.accomplishments) {
        log.accomplishments.forEach((acc) => {
          accomplishments.push({ text: acc, date: log.date });
        });
      }
    });

    // Build per-goal evidence bundles
    const goalEvaluations = goals.map((goal) => {
      const range = goal.target_value - goal.starting_value;
      const currentProgress = range > 0
        ? Math.round(((goal.current_value - goal.starting_value) / range) * 100)
        : 0;
      const daysLeft = Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      const totalDays = Math.max(1, Math.ceil((new Date(goal.deadline).getTime() - new Date(goal.start_date).getTime()) / (1000 * 60 * 60 * 24)));
      const timeElapsedPct = Math.round(((totalDays - daysLeft) / totalDays) * 100);

      // Tasks directly linked to this goal
      const linkedTasks = tasks.filter((t) => t.goal_id === goal.goal_id);
      const completedLinkedTasks = linkedTasks.filter((t) => t.status === 'completed');

      // Accomplishments matching keywords
      const keywords = (goal.keywords || []).map((k) => k.toLowerCase());
      const matchingAccomplishments = keywords.length > 0
        ? accomplishments.filter((acc) => {
            const lower = acc.text.toLowerCase();
            return keywords.some((kw) => lower.includes(kw));
          })
        : [];

      return {
        goal_id: goal.goal_id,
        title: goal.title,
        type: goal.type,
        increment_type: goal.increment_type || 'count',
        keywords: goal.keywords || [],
        current_value: goal.current_value,
        target_value: goal.target_value,
        starting_value: goal.starting_value,
        current_progress_pct: Math.min(100, currentProgress),
        deadline: goal.deadline,
        days_remaining: daysLeft,
        time_elapsed_pct: Math.min(100, timeElapsedPct),
        evidence: {
          linked_tasks_completed: completedLinkedTasks.map((t) => ({
            description: t.description,
            date: t.completed_date || t.planned_date,
          })),
          linked_tasks_pending: linkedTasks.filter((t) => t.status !== 'completed').map((t) => ({
            description: t.description,
            planned_date: t.planned_date,
          })),
          keyword_matching_accomplishments: matchingAccomplishments,
          total_linked_tasks: linkedTasks.length,
          completed_linked_tasks: completedLinkedTasks.length,
        },
      };
    });

    // Summary stats for context
    const summary = {
      period: `${startDate} to ${endDate}`,
      total_tasks_completed: tasks.filter((t) => t.status === 'completed').length,
      total_tasks: tasks.length,
      total_accomplishments: accomplishments.length,
      days_logged: dailyLogs.length,
      habit_completion_rate: habitCompletions.length > 0
        ? Math.round((habitCompletions.filter((c) => c.completed).length / habitCompletions.length) * 100)
        : 0,
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ summary, goals: goalEvaluations }, null, 2),
      }],
    };
  }
);

// ============================================
// MCP PROMPT: Goal Progress Algorithm
// ============================================

server.prompt(
  'update_goals',
  'Evaluate and update progress for all active goals using data from the Progress Tracker.',
  {},
  async () => {
    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Check in on my goals and tell me how they're going.

IMPORTANT: The current progress numbers in the app might be wrong or arbitrary — do NOT just read them back to me. Your job is to CALCULATE what the real progress is by analyzing the actual evidence.

Here's how to evaluate each goal:

1. Call \`evaluate_goals\` to pull everything — goals, tasks, accomplishments, habits.

2. For EACH goal, determine real progress from scratch:
   - Read the goal title carefully. What does "done" actually look like for this goal?
   - Look at ALL completed tasks linked to this goal — what do they represent?
   - Look at ALL accomplishments that match the goal's keywords or relate to its title
   - Look at habit completion patterns if relevant
   - Think about the goal holistically: has meaningful progress been made? How much of the total work is done?
   - Estimate a COMPLETION PERCENTAGE (0-100%) based purely on the evidence you see
   - Calculate new current_value = starting_value + (percentage / 100) * (target_value - starting_value)
   - Round to a sensible number

   Examples of reasoning:
   - Goal "Build trading bot" (0/8): You see 3 completed tasks about building components and 2 accomplishments about testing. That's maybe 40% of the way there → set to 3/8.
   - Goal "Read 5 books" (0/5): You see accomplishments mentioning finishing 2 specific books → set to 2/5.
   - Goal "Save $1000" ($0/$1000): You see accomplishments mentioning "$200 saved" and "$150 deposit" → set to $350/$1000.
   - Goal "Complete website" (0/8): You see nothing related in tasks or accomplishments → stays at 0/8, flag it.

3. Present your analysis naturally — for each goal tell me:
   - What evidence you found (specific tasks/accomplishments)
   - What % complete you think it is and why
   - Your proposed new value (e.g., "I'd set this to 5/8")
   - Whether you're on pace, ahead, or behind based on deadline
   - If you found NO evidence, say so — ask me if I've been working on it outside the app

4. Show all proposed changes together, then ASK ME before updating anything. I might say "actually I also did X that I didn't log" or "no that task doesn't count toward that goal."

5. Only after I say go ahead, call \`update_goal_progress\` for each approved change.

Be conversational. You're a friend helping me take stock, not generating a spreadsheet.`,
        },
      }],
    };
  }
);

// ============================================
// COACHING TOOLS
// ============================================

server.tool(
  'get_coaching_snapshot',
  'Get a comprehensive snapshot for coaching: today\'s status, this week\'s report, last 3 weeks for comparison, habit streaks, upcoming deadlines, and recent accomplishments. One call gives Claude everything needed to coach.',
  {
    lookback_weeks: z.number().optional().describe('How many past weeks to include for trend comparison. Defaults to 3.'),
  },
  async ({ lookback_weeks }) => {
    const weeks = lookback_weeks || 3;
    const todayStr = getToday();
    const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const lookbackStart = format(subDays(new Date(), weeks * 7), 'yyyy-MM-dd');

    const [goals, tasks, dailyLogs, habits, habitCompletions, settings] = await Promise.all([
      db.fetchGoals(true),
      db.fetchTasks(lookbackStart, todayStr),
      db.fetchDailyLogs(lookbackStart, todayStr),
      db.fetchHabits(true),
      db.fetchHabitCompletions(lookbackStart, todayStr),
      db.fetchUserSettings(),
    ]);

    // TODAY
    const todayTasks = tasks.filter((t) => t.planned_date === todayStr);
    const todayCompletedTasks = todayTasks.filter((t) => t.status === 'completed');
    const todayCompletions = habitCompletions.filter((c) => c.date === todayStr);
    const todayLog = dailyLogs.find((l) => l.date === todayStr);

    const todayHabits = habits.map((h) => {
      const dayName = format(new Date(), 'EEE').toLowerCase().slice(0, 3);
      const daysActive = (h.days_active || []).map((x) => x.toLowerCase().slice(0, 3));
      const isScheduled = daysActive.length === 0 || daysActive.includes(dayName);
      const completion = todayCompletions.find((c) => c.habit_id === h.habit_id);
      return {
        name: h.name,
        scheduled_today: isScheduled,
        completed: completion?.completed ?? false,
        miss_reason: completion?.miss_reason ?? null,
      };
    }).filter((h) => h.scheduled_today);

    // HABIT STREAKS (per habit)
    const habitStreaks = habits.map((h) => {
      let streak = 0;
      const d = new Date();
      for (let i = 0; i < 60; i++) {
        const dateStr = format(d, 'yyyy-MM-dd');
        const dayName = format(d, 'EEE').toLowerCase().slice(0, 3);
        const daysActive = (h.days_active || []).map((x) => x.toLowerCase().slice(0, 3));
        const isScheduled = daysActive.length === 0 || daysActive.includes(dayName);
        if (!isScheduled) { d.setDate(d.getDate() - 1); continue; }
        const comp = habitCompletions.find((c) => c.habit_id === h.habit_id && c.date === dateStr);
        if (comp?.completed) { streak++; d.setDate(d.getDate() - 1); }
        else break;
      }
      return { habit_id: h.habit_id, name: h.name, current_streak: streak };
    });

    // LOGGING STREAK
    let loggingStreak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = format(d, 'yyyy-MM-dd');
      if (dailyLogs.some((l) => l.date === dateStr)) { loggingStreak++; d.setDate(d.getDate() - 1); }
      else break;
    }

    // WEEKLY REPORTS for trend
    const weeklyReports = [];
    for (let w = 0; w <= weeks; w++) {
      const ws = new Date(thisWeekStart);
      ws.setDate(ws.getDate() - w * 7);
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      const wsStr = format(ws, 'yyyy-MM-dd');
      const weStr = format(we, 'yyyy-MM-dd');
      const isCurrentWeek = w === 0;

      const wTasks = tasks.filter((t) => t.planned_date >= wsStr && t.planned_date <= weStr);
      const wCompleted = wTasks.filter((t) => t.status === 'completed');
      const taskRate = wTasks.length > 0 ? wCompleted.length / wTasks.length : 0;

      const dayLimit = isCurrentWeek ? todayStr : weStr;
      let habitSlots = 0, habitDone = 0;
      for (let dd = new Date(ws); format(dd, 'yyyy-MM-dd') <= dayLimit; dd.setDate(dd.getDate() + 1)) {
        const dateStr = format(dd, 'yyyy-MM-dd');
        const dayName = format(dd, 'EEE').toLowerCase().slice(0, 3);
        habits.forEach((h) => {
          const daysActive = (h.days_active || []).map((x) => x.toLowerCase().slice(0, 3));
          if (daysActive.length === 0 || daysActive.includes(dayName)) {
            habitSlots++;
            const comp = habitCompletions.find((c) => c.habit_id === h.habit_id && c.date === dateStr);
            if (comp?.completed) habitDone++;
          }
        });
      }
      const habitRate = habitSlots > 0 ? habitDone / habitSlots : 0;

      const wLogs = dailyLogs.filter((l) => l.date >= wsStr && l.date <= weStr);
      const loggingRate = wLogs.length / 7;

      const goalProgress = goals.length > 0
        ? goals.reduce((sum, g) => {
            const range = g.target_value - g.starting_value;
            return sum + (range > 0 ? Math.min(1, (g.current_value - g.starting_value) / range) : 0);
          }, 0) / goals.length
        : 0;

      const score = Math.round((taskRate * 0.3 + habitRate * 0.3 + loggingRate * 0.2 + goalProgress * 0.2) * 100);
      const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

      // Wins from that week
      const wins = [];
      wLogs.forEach((l) => { if (l.accomplishments) l.accomplishments.forEach((a) => wins.push(a)); });

      weeklyReports.push({
        week: `${wsStr} to ${weStr}`,
        is_current: isCurrentWeek,
        score, grade,
        tasks: { done: wCompleted.length, total: wTasks.length, pct: Math.round(taskRate * 100) },
        habits: { done: habitDone, total: habitSlots, pct: Math.round(habitRate * 100) },
        logging: { days: wLogs.length, pct: Math.round(loggingRate * 100) },
        wins,
      });
    }

    // GOALS with deadlines + pace
    const goalStatus = goals.map((g) => {
      const range = g.target_value - g.starting_value;
      const progress = range > 0 ? Math.round(((g.current_value - g.starting_value) / range) * 100) : 0;
      const daysLeft = Math.max(0, Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      const totalDays = Math.max(1, Math.ceil((new Date(g.deadline).getTime() - new Date(g.start_date).getTime()) / (1000 * 60 * 60 * 24)));
      const elapsed = totalDays - daysLeft;
      const expectedPct = Math.round((elapsed / totalDays) * 100);
      const pace = progress >= expectedPct + 10 ? 'ahead' : progress >= expectedPct - 10 ? 'on_track' : 'behind';
      return {
        title: g.title, goal_id: g.goal_id, notes: g.notes || null,
        progress_pct: Math.min(100, progress), expected_pct: Math.min(100, expectedPct), pace,
        current: g.current_value, target: g.target_value, unit: g.unit,
        days_remaining: daysLeft, deadline: g.deadline,
      };
    });

    // RECENT ACCOMPLISHMENTS (last 7 days)
    const recentAccomplishments = [];
    dailyLogs.filter((l) => l.date >= format(subDays(new Date(), 7), 'yyyy-MM-dd')).forEach((l) => {
      if (l.accomplishments) l.accomplishments.forEach((a) => recentAccomplishments.push({ text: a, date: l.date }));
      if (l.notes) recentAccomplishments.push({ text: `[Day note] ${l.notes}`, date: l.date });
    });

    // MISSED HABITS (last 7 days, with reasons)
    const missedHabits = [];
    habitCompletions
      .filter((c) => !c.completed && c.date >= format(subDays(new Date(), 7), 'yyyy-MM-dd'))
      .forEach((c) => {
        const habit = habits.find((h) => h.habit_id === c.habit_id);
        missedHabits.push({ habit: habit?.name || c.habit_id, date: c.date, reason: c.miss_reason || 'unknown' });
      });

    const snapshot = {
      today: {
        date: todayStr,
        day_notes: todayLog?.notes || null,
        difficulty_tier: todayLog?.difficulty_tier || null,
        tasks: { done: todayCompletedTasks.length, total: todayTasks.length, pending: todayTasks.filter((t) => t.status === 'planned').map((t) => t.description) },
        habits: todayHabits,
      },
      streaks: { logging_days: loggingStreak, per_habit: habitStreaks },
      weekly_trend: weeklyReports,
      goals: goalStatus,
      recent_accomplishments: recentAccomplishments,
      missed_habits_7d: missedHabits,
    };

    return { content: [{ type: 'text', text: JSON.stringify(snapshot, null, 2) }] };
  }
);

server.tool(
  'get_pattern_analysis',
  'Analyze behavioral patterns: best/worst days of the week for habits and tasks, most-missed habits, consistency trends, and energy/sleep correlations if logged.',
  {
    lookback_days: z.number().optional().describe('Days to analyze. Defaults to 28 (4 weeks).'),
  },
  async ({ lookback_days }) => {
    const days = lookback_days || 28;
    const endDate = getToday();
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

    const [tasks, dailyLogs, habits, habitCompletions] = await Promise.all([
      db.fetchTasks(startDate, endDate),
      db.fetchDailyLogs(startDate, endDate),
      db.fetchHabits(true),
      db.fetchHabitCompletions(startDate, endDate),
    ]);

    // HABITS BY DAY OF WEEK
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const habitsByDay = {};
    dayNames.forEach((d) => { habitsByDay[d] = { scheduled: 0, completed: 0 }; });

    habitCompletions.forEach((c) => {
      const dow = dayNames[new Date(c.date + 'T00:00:00').getDay()];
      habitsByDay[dow].scheduled++;
      if (c.completed) habitsByDay[dow].completed++;
    });

    const habitDayRates = Object.entries(habitsByDay).map(([day, data]) => ({
      day,
      rate: data.scheduled > 0 ? Math.round((data.completed / data.scheduled) * 100) : null,
      completed: data.completed,
      scheduled: data.scheduled,
    })).filter((d) => d.rate !== null);

    const bestHabitDay = habitDayRates.length > 0 ? habitDayRates.reduce((a, b) => (a.rate > b.rate ? a : b)) : null;
    const worstHabitDay = habitDayRates.length > 0 ? habitDayRates.reduce((a, b) => (a.rate < b.rate ? a : b)) : null;

    // TASKS BY DAY OF WEEK
    const tasksByDay = {};
    dayNames.forEach((d) => { tasksByDay[d] = { total: 0, completed: 0 }; });

    tasks.forEach((t) => {
      const dow = dayNames[new Date(t.planned_date + 'T00:00:00').getDay()];
      tasksByDay[dow].total++;
      if (t.status === 'completed') tasksByDay[dow].completed++;
    });

    const taskDayRates = Object.entries(tasksByDay).map(([day, data]) => ({
      day,
      rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : null,
      completed: data.completed,
      total: data.total,
    })).filter((d) => d.rate !== null);

    // MOST MISSED HABITS
    const habitMissCounts = {};
    habitCompletions.filter((c) => !c.completed).forEach((c) => {
      const habit = habits.find((h) => h.habit_id === c.habit_id);
      const name = habit?.name || c.habit_id;
      if (!habitMissCounts[name]) habitMissCounts[name] = { count: 0, reasons: {} };
      habitMissCounts[name].count++;
      const reason = c.miss_reason || 'unspecified';
      habitMissCounts[name].reasons[reason] = (habitMissCounts[name].reasons[reason] || 0) + 1;
    });

    const mostMissed = Object.entries(habitMissCounts)
      .map(([name, data]) => ({ name, missed: data.count, top_reason: Object.entries(data.reasons).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown' }))
      .sort((a, b) => b.missed - a.missed);

    // ENERGY & SLEEP CORRELATION (if data exists)
    const logsWithEnergy = dailyLogs.filter((l) => l.energy_level != null);
    const logsWithSleep = dailyLogs.filter((l) => l.hours_slept != null);

    let energyInsight = null;
    if (logsWithEnergy.length >= 3) {
      const avgEnergy = logsWithEnergy.reduce((sum, l) => sum + l.energy_level, 0) / logsWithEnergy.length;
      const highEnergyDays = logsWithEnergy.filter((l) => l.energy_level >= 7);
      const lowEnergyDays = logsWithEnergy.filter((l) => l.energy_level <= 3);
      energyInsight = {
        avg: Math.round(avgEnergy * 10) / 10,
        high_energy_days: highEnergyDays.length,
        low_energy_days: lowEnergyDays.length,
        total_logged: logsWithEnergy.length,
      };
    }

    let sleepInsight = null;
    if (logsWithSleep.length >= 3) {
      const avgSleep = logsWithSleep.reduce((sum, l) => sum + l.hours_slept, 0) / logsWithSleep.length;
      sleepInsight = {
        avg_hours: Math.round(avgSleep * 10) / 10,
        nights_under_6h: logsWithSleep.filter((l) => l.hours_slept < 6).length,
        nights_over_8h: logsWithSleep.filter((l) => l.hours_slept >= 8).length,
        total_logged: logsWithSleep.length,
      };
    }

    // DIFFICULTY vs PERFORMANCE
    const tierPerformance = { low: { tasks: 0, tasksDone: 0, habits: 0, habitsDone: 0 }, med: { tasks: 0, tasksDone: 0, habits: 0, habitsDone: 0 }, high: { tasks: 0, tasksDone: 0, habits: 0, habitsDone: 0 } };
    dailyLogs.forEach((l) => {
      const tier = l.difficulty_tier || 'med';
      if (!tierPerformance[tier]) return;
      const dayTasks = tasks.filter((t) => t.planned_date === l.date);
      tierPerformance[tier].tasks += dayTasks.length;
      tierPerformance[tier].tasksDone += dayTasks.filter((t) => t.status === 'completed').length;
      const dayCompletions = habitCompletions.filter((c) => c.date === l.date);
      tierPerformance[tier].habits += dayCompletions.length;
      tierPerformance[tier].habitsDone += dayCompletions.filter((c) => c.completed).length;
    });

    const analysis = {
      period: `${startDate} to ${endDate}`,
      habits_by_day_of_week: habitDayRates,
      best_habit_day: bestHabitDay,
      worst_habit_day: worstHabitDay,
      tasks_by_day_of_week: taskDayRates,
      most_missed_habits: mostMissed.slice(0, 5),
      performance_by_difficulty: Object.entries(tierPerformance).map(([tier, data]) => ({
        tier,
        task_rate: data.tasks > 0 ? Math.round((data.tasksDone / data.tasks) * 100) : null,
        habit_rate: data.habits > 0 ? Math.round((data.habitsDone / data.habits) * 100) : null,
      })),
      energy: energyInsight,
      sleep: sleepInsight,
    };

    return { content: [{ type: 'text', text: JSON.stringify(analysis, null, 2) }] };
  }
);

// ============================================
// MCP PROMPT: Observational Coach
// ============================================

server.prompt(
  'daily_coaching',
  'Get a personalized coaching session based on your real data — specific observations, not generic advice.',
  {},
  async () => {
    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Give me a quick coaching check-in based on my actual data.

You are my OBSERVATIONAL coach. That means:
- You only comment on what you can SEE in the data. No generic motivational fluff.
- If I'm doing well at something, say exactly what. ("You've hit your reading habit 6 days straight.")
- If I'm slipping, name the specific thing. ("You missed Exercise 3 of the last 5 days, and the reason was 'no time' every time.")
- If a goal is behind pace, do the math. ("You're at 30% with 12 days left — you need to average X per day to catch up.")
- If you spot a pattern, call it out. ("Your task completion drops on Thursdays and Fridays — your high-difficulty days.")

Here's how to run this session:

1. Call \`get_coaching_snapshot\` to get today's status + weekly trends + streaks + goals.

2. Call \`get_pattern_analysis\` to get behavioral patterns — day-of-week performance, missed habit reasons, difficulty correlations.

3. Based on the data, give me a coaching update structured like this:

   **Right Now** — What's on my plate today. What's done, what's pending. Am I on pace for the week?

   **What's Working** — Specific things I'm doing well. Name the habits, streaks, or improvements with actual numbers.

   **Watch Out** — Specific things that are slipping or at risk. Be direct. Name the habit, the goal, the pattern. Do the math on deadlines if relevant.

   **One Thing Today** — The single most impactful thing I could do today to move the needle. Not "try harder" — something concrete like "knock out the 2 pending tasks linked to [goal name]" or "you haven't logged today yet, even 30 seconds counts."

Keep it short and punchy. Talk to me like a friend who's been watching my data, not a therapist. No bullet points that start with "Great job!" unless I actually did a great job at something specific.`,
        },
      }],
    };
  }
);

// ============================================
// START SERVER
// ============================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP server error:', err);
  process.exit(1);
});
