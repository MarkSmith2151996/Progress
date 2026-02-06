// ============================================================================
// Progress Coach Server
// Standalone relay: mobile -> Supabase -> Claude CLI -> Supabase -> mobile
// ============================================================================

const { spawn } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ---------------------------------------------------------------------------
// Logging helper
// ---------------------------------------------------------------------------
function log(msg) {
  const ts = new Date().toLocaleString('en-US', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  console.log(`[${ts}] ${msg}`);
}

// ---------------------------------------------------------------------------
// Claude CLI wrapper
// Spawns the Claude CLI with the given prompt, returns the response text.
// Times out after 60 seconds.
// ---------------------------------------------------------------------------
function callClaudeCLI(prompt) {
  return new Promise((resolve, reject) => {
    // Flatten prompt to a single line for the CLI arg
    const flatPrompt = prompt.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    const proc = spawn('cmd.exe', ['/c', 'claude', '-p', flatPrompt], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error('Claude CLI timed out after 60s'));
    }, 60000);

    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    proc.on('close', (code) => {
      clearTimeout(timeout);
      // Strip internal hook messages from output
      const clean = stdout
        .split('\n')
        .filter((l) => !l.includes('SessionEnd hook'))
        .join('\n')
        .trim();

      if (code === 0) {
        resolve(clean);
      } else {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr || clean}`));
      }
    });

    proc.on('error', (e) => {
      clearTimeout(timeout);
      reject(e);
    });
  });
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
function todayStr() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function daysBetween(a, b) {
  const msPerDay = 86400000;
  return Math.round((new Date(b) - new Date(a)) / msPerDay);
}

// ---------------------------------------------------------------------------
// Fetch all user context from Supabase
// Returns an object with goals, tasks, habits, completions, logs
// ---------------------------------------------------------------------------
async function fetchUserContext() {
  const today = todayStr();
  const weekAgo = daysAgo(7);

  // Fetch everything in parallel
  const [goalsRes, tasksRes, habitsRes, completionsRes, logsRes] =
    await Promise.all([
      supabase.from('goals').select('*').eq('status', 'active'),
      supabase.from('tasks').select('*').gte('planned_date', weekAgo),
      supabase.from('habits').select('*').eq('active', true),
      supabase.from('habit_completions').select('*').gte('date', weekAgo),
      supabase.from('daily_logs').select('*').gte('date', weekAgo),
    ]);

  return {
    goals: goalsRes.data || [],
    tasks: tasksRes.data || [],
    habits: habitsRes.data || [],
    completions: completionsRes.data || [],
    logs: logsRes.data || [],
    today,
  };
}

// ---------------------------------------------------------------------------
// Calculate metrics from raw data
// ---------------------------------------------------------------------------
function calculateMetrics(ctx) {
  const { goals, tasks, habits, completions, logs, today } = ctx;

  // --- Goal progress ---
  const goalSummaries = goals.map((g) => {
    const start = g.starting_value || 0;
    const target = g.target_value || 1;
    const current = g.current_value || 0;
    const range = target - start;
    const progress = range > 0 ? Math.round(((current - start) / range) * 100) : 0;
    const daysLeft = g.deadline ? daysBetween(today, g.deadline) : null;
    return {
      title: g.title,
      progress: Math.min(100, Math.max(0, progress)),
      current,
      target,
      daysLeft,
      deadline: g.deadline,
    };
  });

  // --- Tasks this week ---
  const tasksCompleted = tasks.filter((t) => t.completed || t.status === 'completed').length;
  const tasksPlanned = tasks.length;

  // --- Habit completion rate ---
  const totalExpected = habits.length * 7; // 7 days in the window
  const completedHabits = completions.filter((c) => c.completed === true).length;
  const habitRate =
    totalExpected > 0 ? Math.round((completedHabits / totalExpected) * 100) : 0;

  // --- Today's habits ---
  const todayCompletions = completions.filter((c) => c.date === today);
  const todayHabits = habits.map((h) => {
    const done = todayCompletions.some((c) => c.habit_id === h.habit_id && c.completed);
    return { name: h.name, done, streak: 0 };
  });

  // --- Logging streak ---
  const logDates = new Set(logs.map((l) => l.date));
  let streak = 0;
  let checkDate = new Date();
  while (true) {
    const ds = checkDate.toISOString().split('T')[0];
    if (logDates.has(ds)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // --- Alerts ---
  const alerts = [];
  goalSummaries.forEach((g) => {
    if (g.daysLeft !== null && g.daysLeft <= 7 && g.progress < 80) {
      alerts.push(`WARNING: "${g.title}" has ${g.daysLeft} days left but only ${g.progress}% done`);
    }
    if (g.progress >= 90) {
      alerts.push(`GREAT: "${g.title}" is at ${g.progress}% -- almost there!`);
    }
  });
  if (habitRate < 50) {
    alerts.push(`Habit completion is low this week (${habitRate}%). Pick 1-2 habits to focus on.`);
  }
  if (streak >= 7) {
    alerts.push(`${streak}-day logging streak! Consistency is paying off.`);
  }

  return { goalSummaries, tasksCompleted, tasksPlanned, habitRate, todayHabits, streak, alerts };
}

// ---------------------------------------------------------------------------
// Build the system prompt with real data
// ---------------------------------------------------------------------------
function buildSystemPrompt(ctx) {
  const m = calculateMetrics(ctx);

  const goalsBlock = m.goalSummaries
    .map(
      (g) =>
        `- ${g.title}: ${g.progress}% (${g.current}/${g.target})` +
        (g.daysLeft !== null ? ` | ${g.daysLeft} days left (${g.deadline})` : '')
    )
    .join('\n');

  const habitsBlock = m.todayHabits
    .map((h) => `- [${h.done ? 'x' : ' '}] ${h.name} (streak: ${h.streak})`)
    .join('\n');

  const alertsBlock =
    m.alerts.length > 0 ? m.alerts.map((a) => `- ${a}`).join('\n') : '- None';

  return `You are a personal productivity coach for a 17-year-old preparing for multiple goals over the next 10 months. You have complete access to their tracking data.

## YOUR ROLE
- Be direct, specific, and data-driven
- Reference actual numbers from their data
- Adjust tone based on performance
- Never give generic advice
- Keep responses concise

## USER CONTEXT
- Age: 17, turning 18 in ~10 months
- Main goals: SAT (1500+), savings ($36K), FBA business prep
- Also: senior year, AP classes, part-time work at restaurants
- Building website for family restaurant (The Pines)

## CURRENT STATE
Date: ${ctx.today}
Streak: ${m.streak} days

## ACTIVE GOALS
${goalsBlock || '- No active goals'}

## THIS WEEK
Tasks: ${m.tasksCompleted}/${m.tasksPlanned} completed
Habit completion: ${m.habitRate}%

## TODAY'S HABITS
${habitsBlock || '- No habits tracked today'}

## ALERTS
${alertsBlock}

## RESPONSE GUIDELINES
1. Lead with status
2. One key insight from the data
3. One thing they're doing well
4. One thing to fix
5. One specific next action`;
}

// ---------------------------------------------------------------------------
// Process a single pending coach message
// ---------------------------------------------------------------------------
async function processMessage(msg) {
  log(`Processing message ${msg.id} from session ${msg.session_id}`);

  try {
    // 1. Mark as processing
    await supabase
      .from('coach_messages')
      .update({ status: 'processing' })
      .eq('id', msg.id);

    // 2. Fetch recent conversation history (last 6 messages from same session)
    const { data: history } = await supabase
      .from('coach_messages')
      .select('*')
      .eq('session_id', msg.session_id)
      .order('created_at', { ascending: true })
      .limit(6);

    const conversationHistory = (history || [])
      .filter((m) => m.id !== msg.id && m.status === 'completed')
      .map((m) => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
      .join('\n');

    // 3. Build context from Supabase data
    const ctx = await fetchUserContext();
    const systemPrompt = buildSystemPrompt(ctx);

    // 4. Assemble full prompt with history + new message
    let fullPrompt = systemPrompt;
    if (conversationHistory) {
      fullPrompt += `\n\n## RECENT CONVERSATION\n${conversationHistory}`;
    }
    fullPrompt += `\n\nUser message: ${msg.content}\n\nRespond as the coach:`;

    // 5. Call Claude CLI
    log('Calling Claude CLI...');
    const response = await callClaudeCLI(fullPrompt);
    log(`Got response (${response.length} chars)`);

    // 6. Insert assistant response
    await supabase.from('coach_messages').insert({
      session_id: msg.session_id,
      role: 'assistant',
      content: response,
      status: 'completed',
    });

    // 7. Mark original message as completed
    await supabase
      .from('coach_messages')
      .update({ status: 'completed' })
      .eq('id', msg.id);

    log(`Message ${msg.id} completed successfully`);
  } catch (err) {
    log(`ERROR processing message ${msg.id}: ${err.message}`);

    // Insert error response so mobile UI knows something went wrong
    await supabase.from('coach_messages').insert({
      session_id: msg.session_id,
      role: 'assistant',
      content: `Sorry, I hit an error: ${err.message}. Try again in a moment.`,
      status: 'error',
    });

    // Mark original as error
    await supabase
      .from('coach_messages')
      .update({ status: 'error' })
      .eq('id', msg.id);
  }
}

// ---------------------------------------------------------------------------
// Generate daily digest
// ---------------------------------------------------------------------------
async function generateDailyDigest() {
  log('Generating daily digest...');

  try {
    const ctx = await fetchUserContext();
    const systemPrompt = buildSystemPrompt(ctx);

    const digestPrompt =
      systemPrompt +
      '\n\nGenerate a concise daily digest summary. Include: ' +
      '1) Overall status (one sentence), ' +
      '2) Key wins from yesterday, ' +
      '3) Today\'s priorities, ' +
      '4) One motivational insight based on the data. ' +
      'Keep it under 200 words.';

    const response = await callClaudeCLI(digestPrompt);
    log(`Digest generated (${response.length} chars)`);

    // Insert into coach_digests table
    await supabase.from('coach_digests').insert({
      digest_type: 'daily',
      digest_date: todayStr(),
      content: response,
    });

    log('Daily digest saved to Supabase');
  } catch (err) {
    log(`ERROR generating digest: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Process any pending messages that arrived while server was offline
// ---------------------------------------------------------------------------
async function processPendingBacklog() {
  log('Checking for pending messages...');

  const { data: pending, error } = await supabase
    .from('coach_messages')
    .select('*')
    .eq('status', 'pending')
    .eq('role', 'user')
    .order('created_at', { ascending: true });

  if (error) {
    log(`Error fetching backlog: ${error.message}`);
    return;
  }

  if (pending && pending.length > 0) {
    log(`Found ${pending.length} pending message(s) in backlog`);
    for (const msg of pending) {
      await processMessage(msg);
    }
  } else {
    log('No pending messages in backlog');
  }
}

// ---------------------------------------------------------------------------
// Subscribe to real-time inserts on coach_messages
// ---------------------------------------------------------------------------
function startRealtimeSubscription() {
  const channel = supabase
    .channel('coach-messages-listener')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'coach_messages',
        filter: 'status=eq.pending',
      },
      (payload) => {
        const msg = payload.new;
        if (msg.role === 'user' && msg.status === 'pending') {
          log(`New pending message detected: ${msg.id}`);
          processMessage(msg);
        }
      }
    )
    .subscribe((status) => {
      log(`Realtime subscription status: ${status}`);
    });

  return channel;
}

// ---------------------------------------------------------------------------
// Digest scheduler -- runs every 24 hours
// ---------------------------------------------------------------------------
let digestInterval = null;

function startDigestScheduler() {
  // Generate digest on startup
  generateDailyDigest();

  // Then every 24 hours
  digestInterval = setInterval(
    () => {
      generateDailyDigest();
    },
    24 * 60 * 60 * 1000
  );

  log('Digest scheduler started (every 24h)');
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
function setupGracefulShutdown(channel) {
  const shutdown = async () => {
    log('Shutting down...');

    // Unsubscribe from realtime
    if (channel) {
      await supabase.removeChannel(channel);
      log('Realtime channel removed');
    }

    // Clear digest interval
    if (digestInterval) {
      clearInterval(digestInterval);
      log('Digest scheduler stopped');
    }

    log('Goodbye!');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('');
  console.log('============================================');
  console.log('  Progress Coach Server');
  console.log('  Mobile -> Supabase -> Claude CLI -> Reply');
  console.log('============================================');
  console.log('');

  // Validate env
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    log('ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }

  log(`Supabase URL: ${process.env.SUPABASE_URL}`);
  log('Connecting to Supabase...');

  // Process any messages that came in while we were offline
  await processPendingBacklog();

  // Start real-time subscription for new messages
  const channel = startRealtimeSubscription();
  log('Listening for new coach messages...');

  // Start daily digest scheduler
  startDigestScheduler();

  // Handle Ctrl+C gracefully
  setupGracefulShutdown(channel);

  log('Server is running. Press Ctrl+C to stop.');
}

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
