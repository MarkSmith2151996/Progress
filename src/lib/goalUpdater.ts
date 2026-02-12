/**
 * Smart Goal Updater
 *
 * Flow:
 * 1. User logs: "finished my practice test"
 * 2. Try /api/goals/match (Anthropic API on Vercel, or Claude CLI on Electron)
 * 3. Fall back to enhanced keyword matching
 * 4. Goal auto-updates: 0/2 -> 1/2
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
// MATCHING
// ============================================

/**
 * Match an accomplishment to the best goal.
 * Tries API first, falls back to enhanced keyword matching.
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

  // Try API-based matching first (works on Vercel with ANTHROPIC_API_KEY)
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/goals/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accomplishment,
          goals: activeGoals.map(g => ({
            goal_id: g.goal_id,
            title: g.title,
            current_value: g.current_value,
            target_value: g.target_value,
            increment_type: g.increment_type || 'count',
            keywords: g.keywords || [],
            status: g.status,
          })),
        }),
      });
      const data = await res.json();
      if (data.success && data.goalId) {
        return {
          goalId: data.goalId,
          delta: data.delta || 1,
          reasoning: data.reasoning || 'API match',
        };
      }
    } catch (err) {
      console.warn('API goal matching failed, using fallback:', err);
    }
  }

  // Enhanced fallback
  return enhancedFallbackMatch(accomplishment, activeGoals);
}

// ============================================
// ENHANCED FALLBACK MATCHING
// ============================================

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'to', 'of', 'in', 'for', 'and', 'or', 'my', 'i',
  'is', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
  'this', 'that', 'these', 'those', 'it', 'its', 'with', 'at', 'by',
  'from', 'on', 'up', 'about', 'into', 'through', 'during', 'before',
  'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under',
  'again', 'then', 'once', 'here', 'there', 'when', 'where',
  'just', 'very', 'some', 'more', 'most', 'other', 'so', 'than', 'too',
  'only', 'own', 'same', 'no', 'not', 'but', 'because', 'as', 'until',
  'while', 'if', 'both', 'each', 'all', 'any', 'few',
  'finished', 'completed', 'done', 'did', 'today', 'yesterday', 'worked',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s$]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function crudeStem(word: string): string {
  // Strip common suffixes for rough matching
  return word
    .replace(/(ing|ed|er|est|ly|tion|ment|ness|ous|ive|ful|less|able|ible)$/, '')
    .replace(/(s|es)$/, '');
}

function enhancedFallbackMatch(
  accomplishment: string,
  goals: Goal[]
): { goalId: string | null; delta: number; reasoning: string } {
  const text = accomplishment.toLowerCase().trim();
  const tokens = tokenize(text);
  const stems = tokens.map(crudeStem);

  let bestMatch: { goalId: string; score: number; delta: number } | null = null;

  for (const goal of goals) {
    const keywords = goal.keywords || generateKeywords(goal.title);
    const goalTokens = tokenize(goal.title.toLowerCase());
    const goalStems = goalTokens.map(crudeStem);

    let score = 0;

    // Exact keyword matches (weight: 3)
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        score += 3;
      }
    }

    // Token overlap with goal title (weight: 2)
    for (const token of goalTokens) {
      if (tokens.includes(token)) {
        score += 2;
      }
    }

    // Stem matching (weight: 1)
    for (const stem of goalStems) {
      if (stem.length >= 3 && stems.some(s => s === stem)) {
        score += 1;
      }
    }

    // Substring matching: if a 4+ char token from the input appears in the goal title (weight: 2)
    for (const token of tokens) {
      if (token.length >= 4 && goal.title.toLowerCase().includes(token)) {
        score += 2;
      }
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      const delta = extractDelta(text, goal.increment_type || 'count');
      bestMatch = { goalId: goal.goal_id, score, delta };
    }
  }

  if (bestMatch && bestMatch.score >= 2) {
    return {
      goalId: bestMatch.goalId,
      delta: bestMatch.delta,
      reasoning: `Keyword match (score: ${bestMatch.score})`,
    };
  }

  return { goalId: null, delta: 0, reasoning: 'No matches found' };
}

// ============================================
// KEYWORD GENERATION
// ============================================

function generateKeywords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

// ============================================
// DELTA EXTRACTION
// ============================================

function extractDelta(text: string, incrementType: string): number {
  const numberWords: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'fifteen': 15, 'twenty': 20,
    'another': 1, 'couple': 2, 'few': 3, 'several': 4, 'half': 0.5,
  };

  // Money patterns first (for value type)
  if (incrementType === 'value') {
    const dollarMatch = text.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (dollarMatch) return parseFloat(dollarMatch[1].replace(',', ''));
    const dollarWordMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:dollars?|bucks?)/i);
    if (dollarWordMatch) return parseFloat(dollarWordMatch[1]);
  }

  // Time patterns
  if (incrementType === 'time') {
    const hoursMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
    if (hoursMatch) return parseFloat(hoursMatch[1]);
    const minsMatch = text.match(/(\d+)\s*(?:minutes?|mins?|m)\b/i);
    if (minsMatch) return parseFloat(minsMatch[1]) / 60;
    // Range: "9-11pm" = 2 hours
    const rangeMatch = text.match(/(\d{1,2})(?::\d{2})?\s*-\s*(\d{1,2})(?::\d{2})?\s*(?:am|pm)?/i);
    if (rangeMatch) {
      const diff = Math.abs(parseInt(rangeMatch[2]) - parseInt(rangeMatch[1]));
      if (diff > 0 && diff <= 12) return diff;
    }
  }

  // Number words (use word boundary to avoid false positives with "a")
  for (const [word, num] of Object.entries(numberWords)) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(text)) return num;
  }

  // Digits
  const digitMatch = text.match(/(\d+(?:\.\d+)?)/);
  if (digitMatch) return parseFloat(digitMatch[1]);

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
  return `${goal.title}: ${previousValue}/${goal.target_value} -> ${newValue}/${goal.target_value}`;
}
