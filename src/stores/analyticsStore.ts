import { create } from 'zustand';
import {
  CorrelationResult,
  PredictiveAlert,
  PatternInsight,
  AnalysisSummary,
} from '@/lib/analytics';
import { PersonalRecords, StreakMilestone } from '@/lib/metrics';
import { FieldProposal, CustomField } from '@/types';

interface AnalyticsState {
  // Analysis data
  correlations: CorrelationResult[];
  predictiveAlerts: PredictiveAlert[];
  patterns: PatternInsight[];
  overallHealth: 'excellent' | 'good' | 'fair' | 'needs_attention' | null;
  keyInsight: string | null;

  // Personal records & streaks
  personalRecords: PersonalRecords | null;
  currentStreak: number;
  streakMilestone: StreakMilestone | null;
  nextMilestone: StreakMilestone | null;

  // Field proposals
  pendingProposals: FieldProposal[];
  customFields: CustomField[];
  detectedKeywords: { keyword: string; count: number }[];

  // Loading states
  isLoadingAnalysis: boolean;
  isLoadingProposals: boolean;
  isAnalyzingNotes: boolean;
  error: string | null;

  // Cache management
  lastFetchTime: number | null;
  cacheValidityMs: number;

  // Actions
  fetchAnalysis: (force?: boolean) => Promise<void>;
  fetchProposals: () => Promise<void>;
  analyzeForProposals: () => Promise<void>;
  approveProposal: (proposalId: string) => Promise<void>;
  rejectProposal: (proposalId: string) => Promise<void>;
  clearError: () => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  correlations: [],
  predictiveAlerts: [],
  patterns: [],
  overallHealth: null,
  keyInsight: null,

  personalRecords: null,
  currentStreak: 0,
  streakMilestone: null,
  nextMilestone: null,

  pendingProposals: [],
  customFields: [],
  detectedKeywords: [],

  isLoadingAnalysis: false,
  isLoadingProposals: false,
  isAnalyzingNotes: false,
  error: null,

  lastFetchTime: null,
  cacheValidityMs: CACHE_TTL,

  fetchAnalysis: async (force = false) => {
    const state = get();

    // Check cache validity
    if (
      !force &&
      state.lastFetchTime &&
      Date.now() - state.lastFetchTime < state.cacheValidityMs
    ) {
      return;
    }

    set({ isLoadingAnalysis: true, error: null });

    try {
      const response = await fetch('/api/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');

      const data = await response.json();
      const analysis: AnalysisSummary = data.analysis;

      set({
        correlations: analysis.correlations,
        predictiveAlerts: analysis.predictiveAlerts,
        patterns: analysis.patterns,
        overallHealth: analysis.overallHealth,
        keyInsight: analysis.keyInsight,
        personalRecords: data.personalRecords || null,
        currentStreak: data.currentStreak || 0,
        streakMilestone: data.streakMilestone || null,
        nextMilestone: data.nextMilestone || null,
        isLoadingAnalysis: false,
        lastFetchTime: Date.now(),
      });
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoadingAnalysis: false,
      });
    }
  },

  fetchProposals: async () => {
    set({ isLoadingProposals: true, error: null });

    try {
      const response = await fetch('/api/field-proposals');
      if (!response.ok) throw new Error('Failed to fetch proposals');

      const data = await response.json();

      set({
        pendingProposals: data.proposals || [],
        isLoadingProposals: false,
      });
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoadingProposals: false,
      });
    }
  },

  analyzeForProposals: async () => {
    set({ isAnalyzingNotes: true, error: null });

    try {
      const response = await fetch('/api/field-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze' }),
      });

      if (!response.ok) throw new Error('Failed to analyze notes');

      const data = await response.json();

      set({
        detectedKeywords: data.keywords || [],
        isAnalyzingNotes: false,
      });

      // Refresh proposals list
      get().fetchProposals();
    } catch (error) {
      set({
        error: (error as Error).message,
        isAnalyzingNotes: false,
      });
    }
  },

  approveProposal: async (proposalId: string) => {
    try {
      const response = await fetch('/api/field-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', proposalId }),
      });

      if (!response.ok) throw new Error('Failed to approve proposal');

      // Remove from pending list
      set((state) => ({
        pendingProposals: state.pendingProposals.filter(
          (p) => p.proposal_id !== proposalId
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  rejectProposal: async (proposalId: string) => {
    try {
      const response = await fetch('/api/field-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', proposalId }),
      });

      if (!response.ok) throw new Error('Failed to reject proposal');

      // Remove from pending list
      set((state) => ({
        pendingProposals: state.pendingProposals.filter(
          (p) => p.proposal_id !== proposalId
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  clearError: () => set({ error: null }),
}));
