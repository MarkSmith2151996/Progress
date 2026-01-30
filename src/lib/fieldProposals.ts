import Anthropic from '@anthropic-ai/sdk';
import { FieldProposal, DailyLog, Task, CustomField, FieldType, AppliesTo } from '@/types';
import crypto from 'crypto';

const generateId = () => crypto.randomUUID();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// ============================================
// TYPES
// ============================================

export interface FieldProposalSuggestion {
  fieldName: string;
  fieldType: FieldType;
  appliesTo: AppliesTo;
  rationale: string;
  expectedInsight: string;
  enumOptions?: string[];
}

export interface FieldProposalAnalysis {
  shouldPropose: boolean;
  proposals: FieldProposalSuggestion[];
  analysisNotes: string;
}

// ============================================
// ANALYZE NOTES FOR FIELD PROPOSALS
// ============================================

export async function analyzeNotesForFieldProposals(
  recentNotes: { date: string; notes: string; source: 'daily_log' | 'task' }[],
  existingFields: CustomField[]
): Promise<FieldProposalAnalysis> {
  if (recentNotes.length < 5) {
    return {
      shouldPropose: false,
      proposals: [],
      analysisNotes: 'Need more data to analyze patterns',
    };
  }

  const existingFieldNames = existingFields.map((f) => f.field_name.toLowerCase());

  const notesContent = recentNotes
    .filter((n) => n.notes && n.notes.trim().length > 0)
    .map((n) => `[${n.date}] (${n.source}): "${n.notes}"`)
    .join('\n');

  if (notesContent.length < 50) {
    return {
      shouldPropose: false,
      proposals: [],
      analysisNotes: 'Notes are too short to identify patterns',
    };
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: `You are an analyst that identifies patterns in user notes that suggest new tracking fields would be valuable.

CURRENT TRACKED FIELDS:
- Daily: energy_level, hours_slept, work_hours, school_hours, day_type, notes, sick
- Tasks: description, time_estimated, time_actual, difficulty, notes

ALREADY CUSTOM FIELDS: ${existingFieldNames.length > 0 ? existingFieldNames.join(', ') : 'none'}

Your job is to find recurring themes in notes that would be better tracked as structured fields.

GOOD PROPOSALS:
- User frequently mentions "stress" or stress levels → propose stress_level (number 1-5)
- User mentions caffeine/coffee regularly → propose caffeine_intake (number or boolean)
- User mentions specific activities repeatedly → propose dedicated tracking
- User mentions mood/feelings often → propose mood field

BAD PROPOSALS:
- Things already tracked (don't duplicate)
- One-time mentions (need pattern)
- Overly specific (e.g., "tuesday_lunch_quality")

Respond with JSON only, no markdown:
{
  "shouldPropose": boolean,
  "proposals": [
    {
      "fieldName": "snake_case_name",
      "fieldType": "number" | "string" | "boolean" | "enum",
      "appliesTo": "daily_log" | "task",
      "rationale": "why this field would help based on the notes",
      "expectedInsight": "what patterns we could discover",
      "enumOptions": ["option1", "option2"] // only if fieldType is enum
    }
  ],
  "analysisNotes": "brief explanation of patterns found"
}`,
      messages: [{
        role: 'user',
        content: `Analyze these recent notes for patterns that suggest new fields:\n\n${notesContent}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

    try {
      const result = JSON.parse(text) as FieldProposalAnalysis;

      // Filter out proposals for fields that already exist
      result.proposals = result.proposals.filter(
        (p) => !existingFieldNames.includes(p.fieldName.toLowerCase())
      );

      // Limit to 3 proposals max
      result.proposals = result.proposals.slice(0, 3);

      return result;
    } catch {
      return {
        shouldPropose: false,
        proposals: [],
        analysisNotes: 'Failed to parse analysis',
      };
    }
  } catch (error) {
    console.error('Claude API error:', error);
    return {
      shouldPropose: false,
      proposals: [],
      analysisNotes: 'Analysis failed',
    };
  }
}

// ============================================
// CREATE PROPOSAL FROM SUGGESTION
// ============================================

export function createFieldProposal(suggestion: FieldProposalSuggestion): FieldProposal {
  const id = `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    proposal_id: id,
    field_name: suggestion.fieldName,
    field_type: suggestion.fieldType,
    applies_to: suggestion.appliesTo,
    rationale: suggestion.rationale,
    expected_insight: suggestion.expectedInsight,
    status: 'pending',
    created_at: new Date().toISOString(),
    resolved_at: null,
  };
}

// ============================================
// APPROVE PROPOSAL → CREATE CUSTOM FIELD
// ============================================

export function approveProposal(proposal: FieldProposal): CustomField {
  const id = `cf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    field_id: id,
    field_name: proposal.field_name,
    field_type: proposal.field_type,
    enum_options: null, // TODO: store enum options if needed
    applies_to: proposal.applies_to,
    created_by: 'claude',
    rationale: proposal.rationale,
    approved: true,
    approved_at: new Date().toISOString(),
    active: true,
    created_at: proposal.created_at,
  };
}

// ============================================
// ANALYZE USAGE PATTERNS FOR MORE PROPOSALS
// ============================================

export async function analyzeUsageForProposals(
  dailyLogs: DailyLog[],
  tasks: Task[],
  existingFields: CustomField[]
): Promise<FieldProposalAnalysis> {
  // Extract all notes
  const recentNotes: { date: string; notes: string; source: 'daily_log' | 'task' }[] = [];

  // Get last 30 days of notes
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  dailyLogs.forEach((log) => {
    if (log.notes && new Date(log.date) >= thirtyDaysAgo) {
      recentNotes.push({
        date: log.date,
        notes: log.notes,
        source: 'daily_log',
      });
    }
  });

  tasks.forEach((task) => {
    if (task.notes && task.planned_date && new Date(task.planned_date) >= thirtyDaysAgo) {
      recentNotes.push({
        date: task.planned_date,
        notes: task.notes,
        source: 'task',
      });
    }
  });

  return analyzeNotesForFieldProposals(recentNotes, existingFields);
}

// ============================================
// ANALYZE SPECIFIC PATTERNS
// ============================================

export async function analyzeSpecificPattern(
  pattern: string,
  dailyLogs: DailyLog[],
  tasks: Task[]
): Promise<FieldProposalSuggestion | null> {
  // Look for specific pattern mentions
  const mentions: string[] = [];

  dailyLogs.forEach((log) => {
    if (log.notes && log.notes.toLowerCase().includes(pattern.toLowerCase())) {
      mentions.push(`[${log.date}]: "${log.notes}"`);
    }
  });

  tasks.forEach((task) => {
    if (task.notes && task.notes.toLowerCase().includes(pattern.toLowerCase())) {
      mentions.push(`[${task.planned_date}]: "${task.notes}"`);
    }
  });

  if (mentions.length < 3) return null;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: `You analyze mentions of "${pattern}" in user notes to suggest how to track it as a field.

Respond with JSON only:
{
  "fieldName": "snake_case_name",
  "fieldType": "number" | "string" | "boolean" | "enum",
  "appliesTo": "daily_log" | "task",
  "rationale": "why tracking this would help",
  "expectedInsight": "what we could learn"
}

Or respond with {"skip": true, "reason": "..."} if not worth tracking.`,
      messages: [{
        role: 'user',
        content: `User frequently mentions "${pattern}". Here are the mentions:\n\n${mentions.slice(0, 10).join('\n')}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

    try {
      const result = JSON.parse(text);
      if (result.skip) return null;
      return result as FieldProposalSuggestion;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

// ============================================
// KEYWORD DETECTION FOR AUTO-PROPOSAL
// ============================================

const COMMON_TRACKABLE_KEYWORDS = [
  'stress', 'stressed', 'anxious', 'anxiety',
  'coffee', 'caffeine', 'tired', 'exhausted',
  'workout', 'exercise', 'gym',
  'headache', 'pain',
  'mood', 'happy', 'sad', 'frustrated',
  'focus', 'distracted', 'procrastinated',
  'meditation', 'meditate',
  'social', 'friends', 'alone',
];

export function detectTrackableKeywords(
  dailyLogs: DailyLog[],
  tasks: Task[]
): { keyword: string; count: number }[] {
  const keywordCounts: Record<string, number> = {};

  const checkText = (text: string | null) => {
    if (!text) return;
    const lower = text.toLowerCase();

    COMMON_TRACKABLE_KEYWORDS.forEach((keyword) => {
      if (lower.includes(keyword)) {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      }
    });
  };

  dailyLogs.forEach((log) => checkText(log.notes));
  tasks.forEach((task) => checkText(task.notes));

  return Object.entries(keywordCounts)
    .map(([keyword, count]) => ({ keyword, count }))
    .filter((k) => k.count >= 3)
    .sort((a, b) => b.count - a.count);
}
