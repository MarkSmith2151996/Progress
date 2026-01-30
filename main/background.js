"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electron_serve_1 = __importDefault(require("electron-serve"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
    (0, electron_serve_1.default)({ directory: 'out' });
}
let mainWindow = null;
// Data directory for context.json
const DATA_DIR = path_1.default.join(electron_1.app.getPath('userData'), 'data');
const CONTEXT_FILE = path_1.default.join(DATA_DIR, 'context.json');
// Default context structure
const DEFAULT_CONTEXT = {
    user: "Anthony",
    planEndDate: "October 2026",
    goals: {
        sat: { type: "number", name: "SAT Score", start: 1340, current: 1340, target: 1500 },
        savings: { type: "cumulative", name: "FBA Savings", current: 0, target: 36000 },
        fbaPrep: { type: "checklist", name: "FBA Preparation", items: [] },
        workHours: { type: "time", name: "Work Hours", monthly: {}, total: 0 }
    },
    habits: [],
    dailyLogs: {},
    weekColors: {
        "1": "#4a90d9",
        "2": "#50c878",
        "3": "#daa520",
        "4": "#9370db",
        "5": "#ff6b6b"
    }
};
// Ensure data directory and context file exist
function ensureDataFile() {
    if (!fs_1.default.existsSync(DATA_DIR)) {
        fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs_1.default.existsSync(CONTEXT_FILE)) {
        fs_1.default.writeFileSync(CONTEXT_FILE, JSON.stringify(DEFAULT_CONTEXT, null, 2));
    }
}
// Read context
function readContext() {
    ensureDataFile();
    try {
        const data = fs_1.default.readFileSync(CONTEXT_FILE, 'utf-8');
        return JSON.parse(data);
    }
    catch (error) {
        console.error('Error reading context:', error);
        return DEFAULT_CONTEXT;
    }
}
// Write context
function writeContext(context) {
    ensureDataFile();
    fs_1.default.writeFileSync(CONTEXT_FILE, JSON.stringify(context, null, 2));
}
// Call Claude CLI
async function callClaudeCLI(systemPrompt, userMessage) {
    return new Promise((resolve, reject) => {
        console.log('[Claude CLI] Starting...');
        // Build command for Windows
        const args = [
            '--print',
            '--model', 'haiku',
            '--system-prompt', systemPrompt,
            userMessage
        ];
        const proc = (0, child_process_1.spawn)('claude', args, {
            shell: true,
            env: { ...process.env },
            windowsHide: true,
        });
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        proc.on('close', (code) => {
            console.log('[Claude CLI] Exited with code:', code);
            if (code === 0) {
                resolve(stdout.trim());
            }
            else {
                console.error('[Claude CLI] stderr:', stderr);
                reject(new Error(`Claude CLI failed: ${stderr || 'Unknown error'}`));
            }
        });
        proc.on('error', (err) => {
            console.error('[Claude CLI] Spawn error:', err);
            reject(err);
        });
    });
}
// Build system prompt with context
function buildCoachPrompt(context) {
    return `You are a supportive productivity coach for ${context.user}.

CURRENT GOALS:
${Object.entries(context.goals).map(([key, g]) => {
        if (g.type === 'number')
            return `- ${g.name}: ${g.current}/${g.target} (started at ${g.start})`;
        if (g.type === 'cumulative')
            return `- ${g.name}: $${g.current}/$${g.target}`;
        if (g.type === 'time')
            return `- ${g.name}: ${g.total} hours total`;
        if (g.type === 'checklist')
            return `- ${g.name}: ${g.items?.length || 0} items`;
        return `- ${g.name}`;
    }).join('\n')}

DEADLINE: ${context.planEndDate}

Be encouraging but realistic. Give specific, actionable advice. Keep responses concise (2-4 sentences unless asked for more).`;
}
// Build parsing prompt
function buildParsePrompt(context) {
    return `You are a data parser. Extract structured data from natural language input.

USER'S GOALS:
${Object.entries(context.goals).map(([key, g]) => `- ${key}: ${g.name} (${g.type})`).join('\n')}

Parse the user's input and return ONLY a JSON object with this structure:
{
  "items": [
    {
      "type": "work_hours" | "sat_score" | "savings" | "habit" | "note" | "goal_progress",
      "description": "what they did",
      "value": number or null,
      "goalKey": "matching goal key or null",
      "date": "YYYY-MM-DD or null"
    }
  ],
  "summary": "brief summary of what was logged"
}

PARSING RULES:
- "Worked X hours" → type: "work_hours", value: hours
- "SAT score X" or "practice test X" → type: "sat_score", value: score
- "Saved $X" → type: "savings", value: amount
- Generic accomplishments → type: "note"
- If date not specified, use today

Return ONLY valid JSON, no markdown or explanation.`;
}
const createWindow = async () => {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path_1.default.join(__dirname, 'preload.js'),
        },
        icon: path_1.default.join(__dirname, '../public/icon.ico'),
        title: 'Progress Tracker',
        backgroundColor: '#008080',
    });
    if (isProd) {
        await mainWindow.loadURL('app://./');
    }
    else {
        // Always use port 3000 - batch file ensures this is available
        const port = 3000;
        const url = `http://localhost:${port}`;
        console.log(`[Electron] Loading URL: ${url}`);
        // Retry loading with delay if server isn't ready
        let retries = 0;
        const maxRetries = 10;
        const tryLoad = async () => {
            try {
                await mainWindow.loadURL(url);
                console.log('[Electron] Page loaded successfully');
            }
            catch (error) {
                retries++;
                if (retries < maxRetries) {
                    console.log(`[Electron] Server not ready, retrying (${retries}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await tryLoad();
                }
                else {
                    console.error('[Electron] Failed to connect to server after retries');
                    mainWindow.loadURL(`data:text/html,<h1>Error: Could not connect to Next.js server at ${url}</h1><p>Make sure npm run dev is running.</p>`);
                }
            }
        };
        await tryLoad();
        mainWindow.webContents.openDevTools();
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};
// ============================================
// IPC HANDLERS
// ============================================
// Get context
electron_1.ipcMain.handle('get-context', async () => {
    return readContext();
});
// Update context
electron_1.ipcMain.handle('update-context', async (_, updates) => {
    const context = readContext();
    const newContext = { ...context, ...updates };
    writeContext(newContext);
    return newContext;
});
// Chat with coach
electron_1.ipcMain.handle('coach-chat', async (_, message) => {
    try {
        const context = readContext();
        const systemPrompt = buildCoachPrompt(context);
        const response = await callClaudeCLI(systemPrompt, message);
        return { success: true, response };
    }
    catch (error) {
        console.error('Coach chat error:', error);
        return { success: false, error: error.message };
    }
});
// Parse natural language input
electron_1.ipcMain.handle('parse-input', async (_, input) => {
    try {
        const context = readContext();
        const systemPrompt = buildParsePrompt(context);
        const response = await callClaudeCLI(systemPrompt, input);
        // Try to parse JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return { success: true, parsed };
        }
        return { success: false, error: 'Could not parse response' };
    }
    catch (error) {
        console.error('Parse error:', error);
        return { success: false, error: error.message };
    }
});
// Apply parsed items to context
electron_1.ipcMain.handle('apply-parsed-items', async (_, items) => {
    try {
        const context = readContext();
        const today = new Date().toISOString().split('T')[0];
        for (const item of items) {
            const date = item.date || today;
            // Ensure dailyLogs entry exists
            if (!context.dailyLogs[date]) {
                context.dailyLogs[date] = { notes: [], accomplishments: [] };
            }
            switch (item.type) {
                case 'work_hours':
                    if (item.value) {
                        const month = date.substring(0, 7);
                        if (!context.goals.workHours.monthly[month]) {
                            context.goals.workHours.monthly[month] = 0;
                        }
                        context.goals.workHours.monthly[month] += item.value;
                        context.goals.workHours.total += item.value;
                    }
                    context.dailyLogs[date].accomplishments.push({
                        description: item.description,
                        type: 'work',
                        value: item.value
                    });
                    break;
                case 'sat_score':
                    if (item.value) {
                        context.goals.sat.current = Math.max(context.goals.sat.current, item.value);
                    }
                    context.dailyLogs[date].accomplishments.push({
                        description: item.description,
                        type: 'study',
                        value: item.value
                    });
                    break;
                case 'savings':
                    if (item.value) {
                        context.goals.savings.current += item.value;
                    }
                    context.dailyLogs[date].accomplishments.push({
                        description: item.description,
                        type: 'savings',
                        value: item.value
                    });
                    break;
                default:
                    context.dailyLogs[date].notes.push(item.description);
            }
        }
        writeContext(context);
        return { success: true, context };
    }
    catch (error) {
        console.error('Apply error:', error);
        return { success: false, error: error.message };
    }
});
// Get data file path (for debugging)
electron_1.ipcMain.handle('get-data-path', async () => {
    return CONTEXT_FILE;
});
electron_1.app.on('ready', () => {
    ensureDataFile();
    createWindow();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
