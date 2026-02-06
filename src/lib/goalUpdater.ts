/**
 * Smart Goal Updater - Uses Claude CLI for intelligent matching
 *
 * Flow:
 * 1. User logs: "finished my practice test"
 * 2. Claude matches to goal: "Take 2 SAT tests"
 * 3. Claude extracts delta: 1
 * 4. Goal auto-updates: 0/2 → 1/2
 */

import { Goal } from '@/types';

// ============================================
// TYPES
// ============================================

export interface GoalUpdateResult {
  goal: Goal;
  previousValue: number;
  newValue: number;
  delta: number;
  matched: boolean;
}

// ============================================
// CLAUDE CLI INTEGRATION
// ============================================

/**
 * Call Claude CLI to match accomplishment to goals
 */
async function callClaudeCLI(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if we're in browser (Vercel) or Node (Electron)
    if (typeof window !== 'undefined') {
      // Browser environment - use API route
      fetch('/api/coach/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: prompt }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            resolve(JSON.stringify(data.parsed));
          } else {
            reject(new Error(data.error || 'Parse failed'));
          }
        })
        .catch(reject);
      return;
    }

    // Node environment (Electron) - call CLI directly
    // Use eval to hide from webpack static analysis
    // eslint-disable-next-line no-eval
    const childProcess = eval('require')('child_process');
    const spawn = childProcess.spawn;

    const args = [
      '--print',
      '--model', 'haiku',
      prompt
    ];

    const proc = spawn('claude', args, {
      shell: true,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code: number | null) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr || 'Claude CLI failed'));
      }
    });

    proc.on('error', (err: Error) => {
      reject(err);
    });
  });
}

/**
 * Use Claude to match an accomplishment to the best goal and extract delta
 */
export async function matchAccomplishmentToGoal(
  accomplishment: string,
  goals: Goal[]
): Promise<{ goalId: string | null; delta: number; reasoning: string }> {
  if (goals.length === 0) {
    return { goalId: null, delta: 0, reasoning: 'No goals available' };
  }

  const activeGoals = goals.filter(g => g.status === 'active');
  if (activeGoals.length === 0) {
    return { goalId: null, delta: 0, reasoning: 'No active goals' };
  }

  // Build prompt for Claude
  const goalsDescription = activeGoals.map(g =>
    `- ID: ${g.goal_id} | "${g.title}" | Progress: ${g.current_value}/${g.target_value} | Type: ${g.increment_type || 'count'}`
  ).join('\n');

  const prompt = `You are a goal tracking assistant. Match this accomplishment to the most relevant goal and extract the progress value.

ACCOMPLISHMENT: "${accomplishment}"

ACTIVE GOALS:
${goalsDescription}

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "goalId": "the goal_id that best matches, or null if no match",
  "delta": number (how much progress was made, e.g. "one test" = 1, "$50" = 50, "2 hours" = 2),
  "reasoning": "brief explanation"
}

Rules:
- Match based on semantic meaning, not just keywords
- "finished a practice test" matches "Take 2 SAT tests"
- "saved $50" matches "Save $1000"
- "ran 3 miles" matches "Run 10 miles"
- If no goal matches, return goalId: null
- Extract numbers from words: "one"=1, "two"=2, "a"=1, "an"=1
- For money goals, extract dollar amounts
- Default delta to 1 if unclear`;

  try {
    const response = await callClaudeCLI(prompt);

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        goalId: parsed.goalId || null,
        delta: typeof parsed.delta === 'number' ? parsed.delta : 1,
        reasoning: parsed.reasoning || ''
      };
    }
  } catch (error) {
    console.error('Claude matching failed:', error);
  }

  // Fallback to simple keyword matching if Claude fails
  return fallbackMatch(accomplishment, activeGoals);
}

/**
 * Fallback keyword matching if Claude is unavailable
 */
function fallbackMatch(
  accomplishment: string,
  goals: Goal[]
): { goalId: string | null; delta: number; reasoning: string } {
  const text = accomplishment.toLowerCase();

  for (const goal of goals) {
    const keywords = goal.keywords || generateKeywords(goal.title);
    const matchCount = keywords.filter(kw => text.includes(kw.toLowerCase())).length;

    if (matchCount >= 1) {
      const delta = extractDelta(text, goal.increment_type || 'count');
      return {
        goalId: goal.goal_id,
        delta,
        reasoning: `Matched ${matchCount} keywords`
      };
    }
  }

  return { goalId: null, delta: 0, reasoning: 'No keyword matches' };
}

/**
 * Generate keywords from goal title
 */
function generateKeywords(title: string): string[] {
  const stopWords = new Set(['a', 'an', 'the', 'to', 'of', 'in', 'for', 'and', 'or', 'my', 'i', 'this', 'that']);
  return title
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

/**
 * Extract numeric delta from text
 */
function extractDelta(text: string, incrementType: string): number {
  const numberWords: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'a': 1, 'an': 1
  };

  // Check for number words
  for (const [word, num] of Object.entries(numberWords)) {
    if (text.includes(word)) return num;
  }

  // Check for digits
  if (incrementType === 'value') {
    const dollarMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
    if (dollarMatch) return parseFloat(dollarMatch[1]);
  }

  if (incrementType === 'time') {
    const hoursMatch = text.match(/(\d+(?:\.\d+)?)\s*hours?/i);
    if (hoursMatch) return parseFloat(hoursMatch[1]);
    const minsMatch = text.match(/(\d+)\s*min/i);
    if (minsMatch) return parseFloat(minsMatch[1]) / 60;
  }

  const digitMatch = text.match(/(\d+)/);
  if (digitMatch) return parseInt(digitMatch[1]);

  return 1; // Default
}

// ============================================
// MAIN PROCESSING FUNCTION
// ============================================

/**
 * Process an accomplishment and update matching goal
 */
export async function processAccomplishment(
  accomplishmentText: string,
  goals: Goal[]
): Promise<GoalUpdateResult | null> {
  try {
    const match = await matchAccomplishmentToGoal(accomplishmentText, goals);

    if (!match.goalId || match.delta === 0) {
      return null;
    }

    const goal = goals.find(g => g.goal_id === match.goalId);
    if (!goal) return null;

    const previousValue = goal.current_value;
    const newValue = Math.min(previousValue + match.delta, goal.target_value);

    return {
      goal: {
        ...goal,
        current_value: newValue,
        updated_at: new Date().toISOString(),
      },
      previousValue,
      newValue,
      delta: match.delta,
      matched: true,
    };
  } catch (error) {
    console.error('Error processing accomplishment:', error);
    return null;
  }
}

/**
 * Generate user-friendly message for goal update
 */
export function formatUpdateMessage(result: GoalUpdateResult): string {
  const { goal, previousValue, newValue } = result;
  return `${goal.title}: ${previousValue}/${goal.target_value} → ${newValue}/${goal.target_value}`;
}
