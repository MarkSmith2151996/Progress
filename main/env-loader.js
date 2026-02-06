"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnvFile = loadEnvFile;
exports.applyEnvVars = applyEnvVars;
exports.initializeEnv = initializeEnv;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
/**
 * Load environment variables from .env.local at runtime.
 * This allows the Electron app to read credentials without hardcoding them.
 *
 * Priority order:
 * 1. App directory (next to the .exe) - for portable installs
 * 2. User data directory - for per-user config
 * 3. Built-in (bundled with app) - for pre-configured builds
 */
function loadEnvFile() {
    const envVars = {};
    // Possible locations for .env.local
    const locations = [
        // Next to the executable (for portable mode)
        path_1.default.join(path_1.default.dirname(electron_1.app.getPath('exe')), '.env.local'),
        // In app's user data directory
        path_1.default.join(electron_1.app.getPath('userData'), '.env.local'),
        // In the app resources (bundled)
        path_1.default.join(process.resourcesPath || '', '.env.local'),
        // Development: project root
        path_1.default.join(electron_1.app.getAppPath(), '.env.local'),
    ];
    for (const envPath of locations) {
        if (fs_1.default.existsSync(envPath)) {
            console.log(`[env-loader] Loading environment from: ${envPath}`);
            const content = fs_1.default.readFileSync(envPath, 'utf-8');
            // Parse .env file format
            const lines = content.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                // Skip comments and empty lines
                if (!trimmed || trimmed.startsWith('#'))
                    continue;
                const eqIndex = trimmed.indexOf('=');
                if (eqIndex > 0) {
                    const key = trimmed.substring(0, eqIndex).trim();
                    let value = trimmed.substring(eqIndex + 1).trim();
                    // Remove surrounding quotes if present
                    if ((value.startsWith('"') && value.endsWith('"')) ||
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    envVars[key] = value;
                }
            }
            // Found and loaded, stop searching
            break;
        }
    }
    return envVars;
}
/**
 * Apply loaded environment variables to process.env
 */
function applyEnvVars(envVars) {
    for (const [key, value] of Object.entries(envVars)) {
        if (!process.env[key]) {
            process.env[key] = value;
        }
    }
}
/**
 * Load and apply environment variables
 */
function initializeEnv() {
    const envVars = loadEnvFile();
    applyEnvVars(envVars);
    // Log which critical vars are loaded (without values for security)
    const criticalVars = [
        'GOOGLE_SHEETS_SPREADSHEET_ID',
        'GOOGLE_SHEETS_CLIENT_EMAIL',
        'GOOGLE_SHEETS_PRIVATE_KEY',
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];
    for (const key of criticalVars) {
        if (envVars[key] || process.env[key]) {
            console.log(`[env-loader] ${key}: loaded`);
        }
        else {
            console.warn(`[env-loader] ${key}: NOT FOUND`);
        }
    }
    return envVars;
}
