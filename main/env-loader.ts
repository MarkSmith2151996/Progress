import fs from 'fs';
import path from 'path';
import { app } from 'electron';

/**
 * Load environment variables from .env.local at runtime.
 * This allows the Electron app to read credentials without hardcoding them.
 *
 * Priority order:
 * 1. App directory (next to the .exe) - for portable installs
 * 2. User data directory - for per-user config
 * 3. Built-in (bundled with app) - for pre-configured builds
 */
export function loadEnvFile(): Record<string, string> {
  const envVars: Record<string, string> = {};

  // Possible locations for .env.local
  const locations = [
    // Next to the executable (for portable mode)
    path.join(path.dirname(app.getPath('exe')), '.env.local'),
    // In app's user data directory
    path.join(app.getPath('userData'), '.env.local'),
    // In the app resources (bundled)
    path.join(process.resourcesPath || '', '.env.local'),
    // Development: project root
    path.join(app.getAppPath(), '.env.local'),
  ];

  for (const envPath of locations) {
    if (fs.existsSync(envPath)) {
      console.log(`[env-loader] Loading environment from: ${envPath}`);
      const content = fs.readFileSync(envPath, 'utf-8');

      // Parse .env file format
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) continue;

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
export function applyEnvVars(envVars: Record<string, string>): void {
  for (const [key, value] of Object.entries(envVars)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

/**
 * Load and apply environment variables
 */
export function initializeEnv(): Record<string, string> {
  const envVars = loadEnvFile();
  applyEnvVars(envVars);

  // Log which critical vars are loaded (without values for security)
  const criticalVars = [
    'GOOGLE_SHEETS_SPREADSHEET_ID',
    'GOOGLE_SHEETS_CLIENT_EMAIL',
    'GOOGLE_SHEETS_PRIVATE_KEY'
  ];

  for (const key of criticalVars) {
    if (envVars[key] || process.env[key]) {
      console.log(`[env-loader] ${key}: loaded`);
    } else {
      console.warn(`[env-loader] ${key}: NOT FOUND`);
    }
  }

  return envVars;
}
