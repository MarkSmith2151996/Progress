import { spawn } from 'child_process';
import { ContextPackage, ChatMessage, ParsedAccomplishment } from '@/types';

// Check if running on Vercel (Linux server, no CLI available)
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

// Helper to call Claude CLI with -p flag (only works on localhost with Windows)
async function callClaudeCLI(systemPrompt: string, userMessage: string): Promise<string> {
  // Skip CLI calls on Vercel - it won't work
  if (isVercel) {
    console.log('[Claude CLI] Skipping - running on Vercel');
    throw new Error('Claude CLI not available on Vercel');
  }

  return new Promise((resolve, reject) => {
    // Combine system prompt and user message into a single prompt
    // Flatten to single line to avoid cmd.exe issues with multi-line strings
    const flatSystemPrompt = systemPrompt.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    const flatUserMessage = userMessage.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    const fullPrompt = `${flatSystemPrompt} USER: ${flatUserMessage}`;

    console.log('[Claude CLI] Running command...');
    console.log('[Claude CLI] Prompt length:', fullPrompt.length);

    const proc = spawn('cmd.exe', ['/c', 'claude', '-p', fullPrompt], {
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    // Timeout after 60 seconds
    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error('Claude CLI timeout after 60s'));
    }, 60000);

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      console.log('[Claude CLI] Process exited with code:', code);

      // Filter out hook errors from output
      const cleanOutput = stdout
        .split('\n')
        .filter(line => !line.includes('SessionEnd hook'))
        .join('\n')
        .trim();

      if (code === 0) {
        resolve(cleanOutput);
      } else {
        console.error('[Claude CLI] Error - code:', code, 'stderr:', stderr);
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr || 'No error message'}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      console.error('[Claude CLI] Spawn error:', err);
      reject(err);
    });
  });
}

// ============================================
// SYSTEM PROMPT BUILDER
// ============================================

function buildSystemPrompt(ctx: ContextPackage): string {
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
Date: ${ctx.currentDate}
Day type: ${ctx.dayType || 'not logged'}
Energy: ${ctx.energy || 'not logged'}/5
Streak: ${ctx.streak} days

## ACTIVE GOALS
${ctx.activeGoals.map((g) =>
  `- ${g.title}: ${Math.round(g.progress)}% complete, ${g.daysRemaining} days left, ${g.status.toUpperCase()}`
).join('\n')}

## THIS WEEK
Tasks: ${ctx.tasksCompleted}/${ctx.tasksPlanned} completed
Weekly score: ${ctx.weeklyScore || 'calculating...'}
Habit completion: ${Math.round(ctx.habitCompletionRate * 100)}%

## TODAY'S HABITS
${ctx.habitsToday.map((h) =>
  `- ${h.completed ? '[x]' : '[ ]'} ${h.name} (${h.streak} day streak)`
).join('\n')}

## ALERTS
${ctx.alerts.length > 0
  ? ctx.alerts.map((a) => `- [${a.level.toUpperCase()}] ${a.message}`).join('\n')
  : 'No alerts'}

## RECENT TREND
${ctx.recentWeeks.map((w) =>
  `- ${w.weekId}: Score ${w.score} (${w.trend >= 0 ? '+' : ''}${w.trend})`
).join('\n')}

## PATTERNS DETECTED
${ctx.patterns.length > 0
  ? ctx.patterns.map((p) => `- ${p.insight} (${p.confidence} confidence)`).join('\n')
  : 'Insufficient data for patterns'}

## RESPONSE GUIDELINES
1. Lead with status (where they are)
2. One key insight from the data
3. One thing they're doing well
4. One thing to fix
5. One specific next action

## TONE CALIBRATION
${determineTone(ctx)}`;
}

function determineTone(ctx: ContextPackage): string {
  const score = ctx.weeklyScore || 50;
  const trend = ctx.recentWeeks.length > 1
    ? ctx.recentWeeks[ctx.recentWeeks.length - 1].trend
    : 0;

  if (score >= 80 && trend >= 0) {
    return 'User is crushing it. Be encouraging, suggest raising the bar.';
  } else if (score >= 60 && trend >= -5) {
    return 'User is on track. Be affirming, offer light suggestions.';
  } else if (score >= 40 || trend >= -10) {
    return 'User is slipping. Be direct, focus on specific fixes.';
  } else {
    return 'User is falling behind. Be honest but compassionate, focus on recovery.';
  }
}

// ============================================
// API FUNCTIONS
// ============================================

export async function getCoachSummary(ctx: ContextPackage): Promise<string> {
  // On Vercel, return a static message
  if (isVercel) {
    return 'Coach is only available on desktop. Use the desktop app to chat with your coach.';
  }

  try {
    const systemPrompt = buildSystemPrompt(ctx);
    const userMessage = 'Give me a brief status update in 2-3 sentences. Include one specific observation from the data.';

    const response = await callClaudeCLI(systemPrompt, userMessage);
    return response || 'Unable to generate summary.';
  } catch (error) {
    console.error('Claude CLI error:', error);
    return 'Unable to connect to coach. Make sure the Claude CLI is installed and authenticated.';
  }
}

export async function getChatResponse(
  ctx: ContextPackage,
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  // On Vercel, return unavailable message
  if (isVercel) {
    return 'Coach is only available on desktop (localhost). The mobile version is for viewing stats and tracking habits only.';
  }

  try {
    // Build conversation history into the prompt
    let conversationContext = '';
    if (history.length > 0) {
      conversationContext = '\n\n## CONVERSATION HISTORY\n';
      for (const msg of history.slice(-6)) { // Keep last 6 messages for context
        const role = msg.role === 'user' ? 'User' : 'Coach';
        conversationContext += `${role}: ${msg.content}\n`;
      }
      conversationContext += '\n';
    }

    const systemPrompt = buildSystemPrompt(ctx) + conversationContext;
    const response = await callClaudeCLI(systemPrompt, userMessage);
    return response || 'Unable to respond.';
  } catch (error) {
    console.error('Claude CLI error:', error);
    return 'Sorry, I had trouble responding. Make sure the Claude CLI is working.';
  }
}

// ============================================
// ENHANCED NLP PARSING
// ============================================

interface TimeExtraction {
  minutes: number;
  originalText: string;
}

interface DifficultyExtraction {
  level: number;
  reason: string;
}

// Pre-process: Extract time durations using regex patterns
function extractTimeDurations(text: string): TimeExtraction[] {
  const extractions: TimeExtraction[] = [];

  const patterns = [
    // "2 hours 30 minutes", "2h 30m", "2hrs 30mins"
    { regex: /(\d+)\s*(?:hours?|hrs?|h)\s*(?:and\s*)?(\d+)\s*(?:minutes?|mins?|m)/gi,
      calc: (m: RegExpMatchArray) => parseInt(m[1]) * 60 + parseInt(m[2]) },
    // "1.5 hours", "1.5h", "1.5 hrs"
    { regex: /(\d+\.?\d*)\s*(?:hours?|hrs?|h)(?!\s*\d)/gi,
      calc: (m: RegExpMatchArray) => Math.round(parseFloat(m[1]) * 60) },
    // "90 minutes", "90 mins", "90m", "90 min"
    { regex: /(\d+)\s*(?:minutes?|mins?|m)(?!\s*(?:ile|illion))/gi,
      calc: (m: RegExpMatchArray) => parseInt(m[1]) },
    // "an hour", "a half hour"
    { regex: /(?:an?\s+)?(?:half\s+)?hour/gi,
      calc: (m: RegExpMatchArray) => m[0].includes('half') ? 30 : 60 },
    // "couple hours", "few hours"
    { regex: /(?:a\s+)?(?:couple|few)\s+(?:of\s+)?hours?/gi,
      calc: () => 120 },
    // "couple minutes", "few minutes"
    { regex: /(?:a\s+)?(?:couple|few)\s+(?:of\s+)?(?:minutes?|mins?)/gi,
      calc: () => 15 },
    // Time ranges: "9-11pm" or "9am-11am" (calculate duration)
    { regex: /(\d{1,2})(?::(\d{2}))?\s*(?:am|pm)?\s*[-–to]+\s*(\d{1,2})(?::(\d{2}))?\s*(?:am|pm)/gi,
      calc: (m: RegExpMatchArray) => {
        let start = parseInt(m[1]);
        let end = parseInt(m[3]);
        const startMins = m[2] ? parseInt(m[2]) : 0;
        const endMins = m[4] ? parseInt(m[4]) : 0;
        // Assume PM for work hours if ambiguous
        if (end < start) end += 12;
        return ((end * 60 + endMins) - (start * 60 + startMins));
      }
    },
  ];

  for (const { regex, calc } of patterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const minutes = calc(match);
      if (minutes > 0 && minutes < 1440) { // Sanity check: less than 24 hours
        extractions.push({ minutes, originalText: match[0] });
      }
    }
  }

  return extractions;
}

// Pre-process: Detect difficulty indicators
function detectDifficultyIndicators(text: string): DifficultyExtraction | null {
  const lowerText = text.toLowerCase();

  // High difficulty indicators (4-5)
  const hardPatterns = [
    /(?:really|very|super|extremely)\s+(?:hard|difficult|challenging|tough)/i,
    /struggled\s+(?:with|through)/i,
    /(?:brutal|grueling|exhausting|intense)/i,
    /(?:finally|eventually)\s+(?:finished|completed|got through)/i,
    /took\s+(?:forever|all\s+day|way\s+longer)/i,
  ];

  // Medium difficulty indicators (3)
  const mediumPatterns = [
    /(?:somewhat|pretty|fairly)\s+(?:hard|difficult|challenging)/i,
    /(?:moderate|decent\s+amount\s+of)\s+(?:effort|work)/i,
    /took\s+(?:some|a\s+bit\s+of)\s+(?:effort|work)/i,
  ];

  // Low difficulty indicators (1-2)
  const easyPatterns = [
    /(?:easy|simple|quick|straightforward|no\s+problem)/i,
    /(?:breezed|sailed)\s+through/i,
    /(?:knocked\s+(?:it\s+)?out|got\s+it\s+done\s+fast)/i,
  ];

  for (const pattern of hardPatterns) {
    if (pattern.test(lowerText)) {
      return { level: 4, reason: 'Hard difficulty language detected' };
    }
  }

  for (const pattern of mediumPatterns) {
    if (pattern.test(lowerText)) {
      return { level: 3, reason: 'Medium difficulty language detected' };
    }
  }

  for (const pattern of easyPatterns) {
    if (pattern.test(lowerText)) {
      return { level: 2, reason: 'Easy difficulty language detected' };
    }
  }

  return null;
}

// Fuzzy match accomplishment to goals
function fuzzyMatchGoal(
  text: string,
  goals: Array<{ id: string; title: string }>
): { goalId: string; confidence: number } | null {
  const lowerText = text.toLowerCase();

  let bestMatch: { goalId: string; confidence: number } | null = null;

  for (const goal of goals) {
    const lowerTitle = goal.title.toLowerCase();
    let confidence = 0;

    // Extract keywords from goal title
    const keywords = lowerTitle
      .split(/[\s\-:→]+/)
      .filter((w) => w.length > 2 && !['the', 'and', 'for', 'with'].includes(w));

    // Check for keyword matches
    const matchedKeywords = keywords.filter((kw) => lowerText.includes(kw));
    if (matchedKeywords.length > 0) {
      confidence = matchedKeywords.length / keywords.length;
    }

    // Boost for specific patterns
    if (lowerTitle.includes('sat') && /sat|practice\s*test|khan|college\s*board/i.test(lowerText)) {
      confidence = Math.max(confidence, 0.8);
    }
    if (lowerTitle.includes('sav') && /sav(?:e|ed|ing)|bank|deposit|money/i.test(lowerText)) {
      confidence = Math.max(confidence, 0.8);
    }
    if (lowerTitle.includes('fba') && /amazon|fba|product|sourcing|inventory/i.test(lowerText)) {
      confidence = Math.max(confidence, 0.8);
    }
    if (lowerTitle.includes('work') && /work(?:ed)?|shift|hours?\s+at|job|restaurant/i.test(lowerText)) {
      confidence = Math.max(confidence, 0.7);
    }

    if (confidence > 0.5 && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = { goalId: goal.id, confidence };
    }
  }

  return bestMatch;
}

// Split raw input into separate accomplishments
function splitAccomplishments(rawInput: string): string[] {
  // Split by newlines, bullet points, numbered lists, or "and" between distinct items
  const lines = rawInput
    .split(/[\n\r]+|(?:^|\s)[-•*]\s|(?:^|\s)\d+[.)]\s/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // If no splits found, check for comma-separated items
  if (lines.length === 1) {
    const commaSplit = rawInput
      .split(/,\s*(?=(?:[^"]*"[^"]*")*[^"]*$)/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (commaSplit.length > 1) return commaSplit;
  }

  return lines.length > 0 ? lines : [rawInput];
}

export async function parseAccomplishments(
  ctx: ContextPackage,
  rawInput: string
): Promise<ParsedAccomplishment[]> {
  // Step 1: Pre-process with regex
  const timeExtractions = extractTimeDurations(rawInput);
  const difficultyHint = detectDifficultyIndicators(rawInput);
  const accomplishmentLines = splitAccomplishments(rawInput);

  // On Vercel, use regex-only parsing (no Claude CLI)
  if (isVercel) {
    return accomplishmentLines.map((line) => {
      const timeMatch = extractTimeDurations(line)[0];
      const goalMatch = fuzzyMatchGoal(line, ctx.activeGoals);

      return {
        description: line,
        goalId: goalMatch?.goalId || null,
        timeSpent: timeMatch?.minutes || null,
        difficulty: difficultyHint?.level || null,
      };
    });
  }

  // Build enriched goal list with keywords for Claude
  const goalsList = ctx.activeGoals
    .map((g) => `- ID: ${g.id}, Title: "${g.title}", Keywords: ${g.title.toLowerCase().split(/[\s\-:→]+/).filter((w) => w.length > 2).join(', ')}`)
    .join('\n');

  // Pre-computed hints for Claude
  const hints: string[] = [];
  if (timeExtractions.length > 0) {
    hints.push(`Time durations detected: ${timeExtractions.map((t) => `"${t.originalText}" = ${t.minutes} min`).join(', ')}`);
  }
  if (difficultyHint) {
    hints.push(`Difficulty indicator: ${difficultyHint.reason} (suggested level: ${difficultyHint.level})`);
  }

  try {
    const systemPrompt = `You are an expert parser that converts natural language accomplishment logs into structured data.

ACTIVE GOALS:
${goalsList}

${hints.length > 0 ? `PRE-EXTRACTED HINTS:\n${hints.join('\n')}\n` : ''}

Parse the user's input into a JSON array. Each accomplishment should be:
{
  "description": "clean, concise description of what they accomplished",
  "goalId": "matching goal ID from list above, or null if no match",
  "timeSpent": number in minutes, or null (use pre-extracted hints if available),
  "difficulty": 1-5 scale (1=trivial, 3=moderate, 5=very hard), or null,
  "category": "study" | "work" | "health" | "personal" | "project" | "other"
}

PARSING RULES:
1. TIME: Look for durations like "45 min", "2 hours", "1h 30m", "9-11pm" (2 hour range)
2. GOALS: Match to goals by keyword relevance. SAT practice → SAT goal, worked shift → work goal
3. DIFFICULTY: Infer from context ("struggled" = 4-5, "easy" = 1-2, "finally finished" = high)
4. SPLIT: If input contains multiple items, return multiple objects
5. CLEAN: Remove filler words, keep essence of accomplishment

EXAMPLES:
Input: "Did SAT practice for 45 min, worked 5-9 at Rocky's"
Output: [
  {"description": "SAT practice session", "goalId": "sat-goal-id", "timeSpent": 45, "difficulty": 3, "category": "study"},
  {"description": "Worked shift at Rocky's", "goalId": "work-goal-id", "timeSpent": 240, "difficulty": 2, "category": "work"}
]

Input: "Finally finished that brutal history essay after struggling all day"
Output: [
  {"description": "Completed history essay", "goalId": null, "timeSpent": null, "difficulty": 5, "category": "study"}
]

Return ONLY valid JSON array, no markdown code blocks.`;

    const text = await callClaudeCLI(systemPrompt, rawInput);

    // Clean up potential markdown formatting
    const cleanedText = text.replace(/```(?:json)?\n?/g, '').trim();

    try {
      const parsed = JSON.parse(cleanedText) as ParsedAccomplishment[];

      // Post-process: Validate and enhance results
      return parsed.map((item) => {
        // If Claude missed time but we extracted it, try to match
        if (!item.timeSpent && timeExtractions.length === 1) {
          item.timeSpent = timeExtractions[0].minutes;
        }

        // If no goalId but we can fuzzy match
        if (!item.goalId && item.description) {
          const match = fuzzyMatchGoal(item.description, ctx.activeGoals);
          if (match) {
            item.goalId = match.goalId;
          }
        }

        // Ensure difficulty is in range
        if (item.difficulty !== null) {
          item.difficulty = Math.max(1, Math.min(5, item.difficulty));
        }

        return item;
      });
    } catch {
      // Fallback: Return basic parsed structure
      return accomplishmentLines.map((line) => {
        const timeMatch = timeExtractions.find((t) =>
          line.toLowerCase().includes(t.originalText.toLowerCase())
        );
        const goalMatch = fuzzyMatchGoal(line, ctx.activeGoals);

        return {
          description: line,
          goalId: goalMatch?.goalId || null,
          timeSpent: timeMatch?.minutes || null,
          difficulty: difficultyHint?.level || null,
        };
      });
    }
  } catch (error) {
    console.error('Claude API error:', error);
    // Complete fallback using only regex
    return accomplishmentLines.map((line) => {
      const timeMatch = extractTimeDurations(line)[0];
      const goalMatch = fuzzyMatchGoal(line, ctx.activeGoals);

      return {
        description: line,
        goalId: goalMatch?.goalId || null,
        timeSpent: timeMatch?.minutes || null,
        difficulty: difficultyHint?.level || null,
      };
    });
  }
}

export async function generateWeeklySummary(ctx: ContextPackage): Promise<{
  summary: string;
  lessons: string;
}> {
  // On Vercel, return static message
  if (isVercel) {
    return {
      summary: 'Weekly summaries are generated on the desktop app.',
      lessons: 'Use the desktop version to get AI-powered insights.',
    };
  }

  try {
    const systemPrompt = buildSystemPrompt(ctx);
    const userMessage = `Generate a weekly summary with two parts:
1. SUMMARY: A 3-4 sentence analysis of this week's performance
2. LESSONS: 1-2 key takeaways or adjustments for next week

Format as:
SUMMARY: ...
LESSONS: ...`;

    const text = await callClaudeCLI(systemPrompt, userMessage);

    const summaryMatch = text.match(/SUMMARY:\s*([\s\S]*?)(?=LESSONS:|$)/);
    const lessonsMatch = text.match(/LESSONS:\s*([\s\S]*?)$/);

    return {
      summary: summaryMatch?.[1]?.trim() || text,
      lessons: lessonsMatch?.[1]?.trim() || '',
    };
  } catch (error) {
    console.error('Claude CLI error:', error);
    return {
      summary: 'Unable to generate summary.',
      lessons: '',
    };
  }
}

// ============================================
// SAFE WRAPPER
// ============================================

export async function safeClaudeCall<T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error('Claude CLI error:', error);
    return fallback;
  }
}
