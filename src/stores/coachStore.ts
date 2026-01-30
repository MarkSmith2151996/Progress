import { create } from 'zustand';
import { ChatMessage, Alert } from '@/types';

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

interface CoachState {
  summary: string | null;
  chatHistory: ChatMessage[];
  alerts: Alert[];
  isLoadingSummary: boolean;
  isLoadingChat: boolean;
  error: string | null;

  // Actions
  setSummary: (summary: string) => void;
  addMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  setAlerts: (alerts: Alert[]) => void;
  dismissAlert: (alertId: string) => void;

  fetchSummary: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
}

export const useCoachStore = create<CoachState>((set, get) => ({
  summary: null,
  chatHistory: [],
  alerts: [],
  isLoadingSummary: false,
  isLoadingChat: false,
  error: null,

  setSummary: (summary) => set({ summary }),

  addMessage: (message) =>
    set((state) => ({
      chatHistory: [...state.chatHistory, message],
    })),

  clearChat: () => set({ chatHistory: [] }),

  setAlerts: (alerts) => set({ alerts }),

  dismissAlert: (alertId) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId ? { ...a, dismissed: true } : a
      ),
    })),

  fetchSummary: async () => {
    set({ isLoadingSummary: true, error: null });

    if (isElectron) {
      // Use Electron IPC
      try {
        const result = await window.electronAPI.coachChat('Give me a brief status update on my progress in 2-3 sentences.');
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
      // Fallback to API route
      try {
        const response = await fetch('/api/coach/summary');
        if (!response.ok) throw new Error('Failed to fetch summary');

        const data = await response.json();
        set({
          summary: data.summary,
          alerts: data.alerts || [],
          isLoadingSummary: false,
        });
      } catch (error) {
        set({
          error: (error as Error).message,
          isLoadingSummary: false,
          summary: 'Unable to load coach summary. Try the desktop app.',
        });
      }
    }
  },

  sendMessage: async (content) => {
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    get().addMessage(userMessage);
    set({ isLoadingChat: true, error: null });

    if (isElectron) {
      // Use Electron IPC
      try {
        const result = await window.electronAPI.coachChat(content);

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
      // Fallback to API route
      try {
        const response = await fetch('/api/coach/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            history: get().chatHistory,
          }),
        });

        if (!response.ok) throw new Error('Failed to get response');

        const data = await response.json();

        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
        };

        get().addMessage(assistantMessage);
        set({ isLoadingChat: false });
      } catch (error) {
        set({ error: (error as Error).message, isLoadingChat: false });

        const errorMessage: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: 'Sorry, I had trouble responding. Please try again.',
          timestamp: new Date().toISOString(),
        };

        get().addMessage(errorMessage);
      }
    }
  },
}));
