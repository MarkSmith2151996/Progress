const DEBUG = true; // Set to false in production

type LogLevel = 'info' | 'warn' | 'error' | 'success';

const colors = {
  info: '#3498db',
  warn: '#f39c12',
  error: '#e74c3c',
  success: '#2ecc71'
};

export function debug(area: string, message: string, data?: any, level: LogLevel = 'info') {
  if (!DEBUG) return;

  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  const prefix = `[${timestamp}] [${area}]`;

  // Console log with color
  if (typeof window !== 'undefined') {
    console.log(
      `%c${prefix} ${message}`,
      `color: ${colors[level]}; font-weight: bold;`,
      data !== undefined ? data : ''
    );
  } else {
    // Server-side logging
    console.log(`${prefix} ${message}`, data !== undefined ? JSON.stringify(data) : '');
  }

  // Also save to localStorage for review (client-side only)
  if (typeof window !== 'undefined') {
    try {
      const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
      logs.push({ timestamp, area, message, data, level });
      // Keep last 500 logs
      if (logs.length > 500) logs.shift();
      localStorage.setItem('debug_logs', JSON.stringify(logs));
    } catch (e) {
      // Ignore storage errors
    }
  }
}

export function debugError(area: string, message: string, error: any) {
  debug(area, message, { error: error?.message || error, stack: error?.stack }, 'error');
}

export function debugSuccess(area: string, message: string, data?: any) {
  debug(area, message, data, 'success');
}

export function debugWarn(area: string, message: string, data?: any) {
  debug(area, message, data, 'warn');
}

// Get all logs for export
export function getDebugLogs(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('debug_logs') || '[]');
  } catch {
    return [];
  }
}

// Clear logs
export function clearDebugLogs(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('debug_logs');
}
