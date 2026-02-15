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

    const [tasks, habitCompletions, dailyLogs, goals] = await Promise.all([
      db.fetchTasks(wsStr, weStr),
      db.fetchHabitCompletions(wsStr, weStr),
      db.fetchDailyLogs(wsStr, weStr),
      db.fetchGoals(true),
    ]);

    const completedTasks = tasks.filter((t) => t.status === 'completed');
    const taskRate = tasks.length > 0 ? completedTasks.length / tasks.length : 0;

    const completedHabits = habitCompletions.filter((c) => c.completed).length;
    const habitRate = habitCompletions.length > 0 ? completedHabits / habitCompletions.length : 0;

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
      habits: { completed: completedHabits, total: habitCompletions.length, rate: Math.round(habitRate * 100) },
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
  'Mark a habit as done or undone for a specific date.',
  {
    habit_id: z.string().describe('The habit ID'),
    date: z.string().optional().describe('Date (YYYY-MM-DD). Defaults to today.'),
    completed: z.boolean().optional().describe('Set to true (done) or false (undone). Defaults to true.'),
  },
  async ({ habit_id, date, completed }) => {
    const targetDate = date || getToday();
    const isDone = completed !== undefined ? completed : true;

    const existing = await db.fetchHabitCompletions(targetDate, targetDate);
    const existingCompletion = existing.find((c) => c.habit_id === habit_id);

    const completion = {
      completion_id: existingCompletion?.completion_id || `hc_${Date.now()}`,
      habit_id,
      date: targetDate,
      completed: isDone,
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
          text: `You are the Progress Tracker goal evaluator. Follow this algorithm to update goal progress:

## Step 1: Gather Data
Call the \`evaluate_goals\` tool to get all active goals with their linked tasks, keyword-matching accomplishments, and current progress.

## Step 2: For Each Goal, Determine New Progress

Analyze the evidence and calculate what the current_value should be:

### Count-based goals (increment_type: "count")
- Each completed linked task = +1
- Each keyword-matching accomplishment = +1 (unless it clearly describes the same event as a linked task)
- Don't double-count: if an accomplishment matches a completed task, only count once

### Value-based goals (increment_type: "value")
- Look for dollar amounts, numbers, or quantities in accomplishments and task descriptions
- Extract the actual values mentioned (e.g., "saved $50" → +50, "sold 3 items" → +3)
- Sum these up and add to the starting_value

### Time-based goals (increment_type: "time")
- Look for time durations in accomplishments (e.g., "practiced piano 30 min", "ran for 1 hour")
- Convert everything to the same unit (usually minutes or hours based on the target)
- Sum total time spent

### General Rules
- Only count evidence from AFTER the goal's start_date
- Never set current_value higher than target_value
- If no new evidence exists since last update, don't change anything
- Be conservative — only count clear, unambiguous evidence
- Consider the goal title for context (e.g., "Read 5 books" — look for book-related accomplishments)

## Step 3: Update Goals
For each goal where you determined a new current_value, call \`update_goal_progress\` with the new value.

## Step 4: Report
Summarize what you updated and why, in a brief conversational format. Mention any goals that are behind schedule (progress % < time elapsed %).

Now call \`evaluate_goals\` to begin.`,
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
