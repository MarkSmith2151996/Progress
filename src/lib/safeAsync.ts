import { debug, debugError, debugSuccess } from './debug';

/**
 * Wrap any async function with error handling and logging
 */
export async function safeAsync<T>(
  area: string,
  operation: string,
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  debug(area, `Starting: ${operation}`);

  try {
    const result = await fn();
    debugSuccess(area, `Completed: ${operation}`, result);
    return result;
  } catch (error: any) {
    debugError(area, `Failed: ${operation}`, error);

    if (fallback !== undefined) {
      debug(area, `Using fallback for: ${operation}`, fallback, 'warn');
      return fallback;
    }

    return undefined;
  }
}

/**
 * Wrap sync functions
 */
export function safeSync<T>(
  area: string,
  operation: string,
  fn: () => T,
  fallback?: T
): T | undefined {
  debug(area, `Starting: ${operation}`);

  try {
    const result = fn();
    debugSuccess(area, `Completed: ${operation}`, result);
    return result;
  } catch (error: any) {
    debugError(area, `Failed: ${operation}`, error);

    if (fallback !== undefined) {
      debug(area, `Using fallback for: ${operation}`, fallback, 'warn');
      return fallback;
    }

    return undefined;
  }
}
