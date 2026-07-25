/**
 * Lightweight logger utility.
 *
 * Rules of use across the app:
 * - Use `logger.error` for caught exceptions and failed operations.
 * - Never log tokens, passwords, invite codes, session data, or full user objects.
 * - `logger.log` / `logger.warn` are silenced in production builds to avoid noise.
 * - `logger.error` is always active so real issues surface in browser devtools.
 *
 * A future monitoring hook (Sentry / LogRocket) can be plugged into `logger.error`
 * without touching call sites.
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
    // TODO: forward to monitoring service (Sentry, LogRocket, etc.)
  },
};
