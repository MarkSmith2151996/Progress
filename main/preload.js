"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Context/Data management
    getContext: () => electron_1.ipcRenderer.invoke('get-context'),
    updateContext: (updates) => electron_1.ipcRenderer.invoke('update-context', updates),
    // Coach - Claude CLI integration
    coachChat: (message, userContext) => electron_1.ipcRenderer.invoke('coach-chat', message, userContext),
    // Natural language parsing
    parseInput: (input) => electron_1.ipcRenderer.invoke('parse-input', input),
    applyParsedItems: (items) => electron_1.ipcRenderer.invoke('apply-parsed-items', items),
    // Utility
    getDataPath: () => electron_1.ipcRenderer.invoke('get-data-path'),
    // Window controls
    minimizeWindow: () => electron_1.ipcRenderer.send('minimize-window'),
    maximizeWindow: () => electron_1.ipcRenderer.send('maximize-window'),
    closeWindow: () => electron_1.ipcRenderer.send('close-window'),
});
