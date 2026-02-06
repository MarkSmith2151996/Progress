import { create } from 'zustand';
import { ChatMessage, Alert, CoachMessage, CoachDigest } from '@/types';
import {
  sendCoachMessage,
  getCoachMessages,
  subscribeToCoachMessages,
  getLatestDigest,
  getDigestHistory,
  unsubscribe,
  isSupabaseConfigured,
} from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

// Generate a session ID for this chat session
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface CoachState {
  summary: string | null;
  chatHistory: ChatMessage[];
  alerts: Alert[];
  isLoadingSummary: boolean;
  isLoadingChat: boolean;
  error: string | null;
  sessionId: string;
  coachOnline: boolean;
  latestDigest: CoachDigest | null;
  digestHistory: CoachDigest[];
  subscription: RealtimeChannel | null;

  // Actions
  setSummary: (summary: string) => void;
  addMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  setAlerts: (alerts: Alert[]) => void;
  dismissAlert: (alertId: string) => void;

  fetchSummary: (userContext?: string) => Promise<void>;
  sendMessage: (content: string, userContext?: string) => Promise<void>;
  initSession: () => void;
  loadChatHistory: () => Promise<void>;
  fetchDigest: () => Promise<void>;
  fetchDigestHistory: () => Promise<void>;
  cleanup: () => void;
}

export const useCoachStore = create<CoachState>((set, get) => ({
  summary: null,
  chatHistory: [],
  alerts: [],
  isLoadingSummary: false,
  isLoadingChat: false,
  error: null,
  sessionId: generateSessionId(),
  coachOnline: false,
  latestDigest: null,
  digestHistory: [],
  subscription: null,

  setSummary: (summary) => set({ summary }),

  addMessage: (message) =>
    set((state) => ({
      chatHistory: [...state.chatHistory, message],
    })),

  clearChat: () => {
    const { subscription } = get();
    if (subscription) unsubscribe(subscription);
    const newSessionId = generateSessionId();
    set({
      chatHistory: [],
      sessionId: newSessionId,
      subscription: null,
    });
    // Re-subscribe with new session
    get().initSession();
  },

  setAlerts: (alerts) => set({ alerts }),

  dismissAlert: (alertId) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId ? { ...a, dismissed: true } : a
      ),
    })),

  // Initialize Supabase subscription for this session
  initSession: () => {
    if (isElectron) return; // Desktop uses IPC directly

    const { sessionId, subscription: existingSub } = get();
    if (existingSub) unsubscribe(existingSub);

    if (!isSupabaseConfigured()) return;

    const sub = subscribeToCoachMessages(sessionId, (msg: CoachMessage) => {
      // Only process assistant responses (completed or error)
      if (msg.role === 'assistant' && (msg.status === 'completed' || msg.status === 'error')) {
        const assistantMessage: ChatMessage = {
          id: msg.id,
          role: 'assistant',
          content: msg.content,
          timestamp: msg.created_at,
        };
        get().addMessage(assistantMessage);
        set({ isLoadingChat: false, coachOnline: true });
      }
    });

    set({ subscription: sub });
  },

  // Load existing chat history from Supabase
  loadChatHistory: async () => {
    if (isElectron) return;

    const { sessionId } = get();
    const messages = await getCoachMessages(sessionId);
    const chatHistory: ChatMessage[] = messages
      .filter((m) => m.status === 'completed' || m.role === 'user')
      .map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.created_at,
      }));
    set({ chatHistory });
  },

  fetchSummary: async (userContext?: string) => {
    set({ isLoadingSummary: true, error: null });

    if (isElectron) {
      // Use Electron IPC
      try {
        const result = await window.electronAPI.coachChat('Give me a brief status update on my progress in 2-3 sentences.', userContext);
        if (result.success) {
          set({
            summary: result.response,
            isLoadingSummary: false,
          });
        } else {
          set({
            error: result.error,
            isLoadingSummary: false,
            summary: result.error || 'Unable to load coach. Make sure Claude CLI is working.',
          });
        }
      } catch (error) {
        set({
          error: (error as Error).message,
          isLoadingSummary: false,
          summary: 'Unable to connect to coach.',
        });
      }
    } else {
      // Use latest digest as summary
      try {
        const digest = await getLatestDigest('daily');
        if (digest) {
          set({
            summary: digest.content,
            isLoadingSummary: false,
            coachOnline: true,
          });
        } else {
          set({
            isLoadingSummary: false,
            summary: 'No daily digest yet. Send a message to check if the coach server is running.',
          });
        }
      } catch (error) {
        set({
          error: (error as Error).message,
          isLoadingSummary: false,
          summary: 'Unable to load summary.',
        });
      }
    }
  },

  sendMessage: async (content, userContext?: string) => {
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    get().addMessage(userMessage);
    set({ isLoadingChat: true, error: null });

    if (isElectron) {
      // Use Electron IPC directly
      try {
        const result = await window.electronAPI.coachChat(content, userContext);

        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: result.success ? result.response! : `Error: ${result.error}`,
          timestamp: new Date().toISOString(),
        };

        get().addMessage(assistantMessage);
        set({ isLoadingChat: false });
      } catch (error) {
        set({ error: (error as Error).message, isLoadingChat: false });

        const errorMessage: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: 'Sorry, I had trouble responding. Make sure Claude CLI is working.',
          timestamp: new Date().toISOString(),
        };

        get().addMessage(errorMessage);
      }
    } else {
      // Send via Supabase relay — coach server will pick it up
      try {
        const { sessionId } = get();
        await sendCoachMessage(sessionId, content, 'mobile');
        // Response will arrive via the subscription (initSession)
        // Set a timeout in case server is offline
        setTimeout(() => {
          const { isLoadingChat } = get();
          if (isLoadingChat) {
            set({ isLoadingChat: false, coachOnline: false });
            const offlineMsg: ChatMessage = {
              id: `msg_${Date.now() + 1}`,
              role: 'assistant',
              content: 'Coach server appears offline. Your message has been queued and will be processed when the server comes back online.',
              timestamp: new Date().toISOString(),
            };
            get().addMessage(offlineMsg);
          }
        }, 90000); // 90s timeout (CLI can take up to 60s + network)
      } catch (error) {
        set({ error: (error as Error).message, isLoadingChat: false });

        const errorMessage: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: 'Unable to send message. Check your internet connection.',
          timestamp: new Date().toISOString(),
        };

        get().addMessage(errorMessage);
      }
    }
  },

  fetchDigest: async () => {
    const digest = await getLatestDigest('daily');
    set({ latestDigest: digest });
  },

  fetchDigestHistory: async () => {
    const history = await getDigestHistory('daily', 7);
    set({ digestHistory: history });
  },

  cleanup: () => {
    const { subscription } = get();
    if (subscription) unsubscribe(subscription);
    set({ subscription: null });
  },
}));
