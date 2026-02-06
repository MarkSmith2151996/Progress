import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Context/Data management
  getContext: () => ipcRenderer.invoke('get-context'),
  updateContext: (updates: any) => ipcRenderer.invoke('update-context', updates),

  // Coach - Claude CLI integration
  coachChat: (message: string, userContext?: string) => ipcRenderer.invoke('coach-chat', message, userContext),

  // Natural language parsing
  parseInput: (input: string) => ipcRenderer.invoke('parse-input', input),
  applyParsedItems: (items: any[]) => ipcRenderer.invoke('apply-parsed-items', items),

  // Utility
  getDataPath: () => ipcRenderer.invoke('get-data-path'),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
});

// Type definitions for renderer process
declare global {
  interface Window {
    electronAPI: {
      // Data
      getContext: () => Promise<any>;
      updateContext: (updates: any) => Promise<any>;

      // Coach
      coachChat: (message: string, userContext?: string) => Promise<{ success: boolean; response?: string; error?: string }>;

      // Parsing
      parseInput: (input: string) => Promise<{ success: boolean; parsed?: any; error?: string }>;
      applyParsedItems: (items: any[]) => Promise<{ success: boolean; context?: any; error?: string }>;

      // Utility
      getDataPath: () => Promise<string>;

      // Window
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
    };
  }
}
