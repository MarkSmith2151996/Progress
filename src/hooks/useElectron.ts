'use client';

import { useState, useEffect, useCallback } from 'react';

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

// Types
export interface ParsedItem {
  type: 'work_hours' | 'sat_score' | 'savings' | 'habit' | 'note' | 'goal_progress';
  description: string;
  value: number | null;
  goalKey: string | null;
  date: string | null;
  selected?: boolean; // For confirmation UI
}

export interface ParseResult {
  items: ParsedItem[];
  summary: string;
}

export interface Context {
  user: string;
  planEndDate: string;
  goals: Record<string, any>;
  habits: any[];
  dailyLogs: Record<string, any>;
  weekColors: Record<string, string>;
}

// Hook for Electron API
export function useElectron() {
  const [context, setContext] = useState<Context | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load context on mount
  useEffect(() => {
    if (isElectron) {
      loadContext();
    }
  }, []);

  const loadContext = useCallback(async () => {
    if (!isElectron) return null;

    try {
      const ctx = await window.electronAPI.getContext();
      setContext(ctx);
      return ctx;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  const updateContext = useCallback(async (updates: Partial<Context>) => {
    if (!isElectron) return null;

    try {
      const ctx = await window.electronAPI.updateContext(updates);
      setContext(ctx);
      return ctx;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  const coachChat = useCallback(async (message: string): Promise<string> => {
    if (!isElectron) {
      return 'Coach is only available in the desktop app.';
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.coachChat(message);
      if (result.success) {
        return result.response || '';
      } else {
        setError(result.error || 'Unknown error');
        return `Error: ${result.error}`;
      }
    } catch (err: any) {
      setError(err.message);
      return `Error: ${err.message}`;
    } finally {
      setLoading(false);
    }
  }, []);

  const parseInput = useCallback(async (input: string): Promise<ParseResult | null> => {
    if (!isElectron) {
      setError('Parsing is only available in the desktop app.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.parseInput(input);
      if (result.success && result.parsed) {
        // Add selected: true to all items by default
        const items = result.parsed.items.map((item: ParsedItem) => ({
          ...item,
          selected: true,
        }));
        return { items, summary: result.parsed.summary };
      } else {
        setError(result.error || 'Could not parse input');
        return null;
      }
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const applyItems = useCallback(async (items: ParsedItem[]): Promise<boolean> => {
    if (!isElectron) return false;

    setLoading(true);
    setError(null);

    try {
      // Only apply selected items
      const selectedItems = items.filter(item => item.selected !== false);
      const result = await window.electronAPI.applyParsedItems(selectedItems);

      if (result.success && result.context) {
        setContext(result.context);
        return true;
      } else {
        setError(result.error || 'Failed to apply items');
        return false;
      }
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDataPath = useCallback(async (): Promise<string | null> => {
    if (!isElectron) return null;
    return window.electronAPI.getDataPath();
  }, []);

  return {
    isElectron,
    context,
    loading,
    error,
    loadContext,
    updateContext,
    coachChat,
    parseInput,
    applyItems,
    getDataPath,
  };
}

// Simple hook just to check if in Electron
export function useIsElectron() {
  return isElectron;
}
