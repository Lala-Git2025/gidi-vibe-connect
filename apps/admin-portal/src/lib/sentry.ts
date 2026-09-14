import * as Sentry from '@sentry/react';

/**
 * Error reporting. Everything here is a no-op until VITE_SENTRY_DSN is set,
 * so local dev and CI send nothing and behave exactly as before.
 *
 * VITE_APP_RELEASE ("<app>@<short sha>") and VITE_APP_ENV (Vercel's
 * production / preview / development) are stamped at build time by
 * vite.config.ts so every event can be traced to the deploy that produced it.
 */

const dsn = import.meta.env.VITE_SENTRY_DSN;

export const sentryEnabled = Boolean(dsn);

export function initSentry(): void {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE,
    release: import.meta.env.VITE_APP_RELEASE,
    integrations: [Sentry.browserTracingIntegration()],
    // 1 in 10 page loads / navigations is enough to spot slow Supabase calls
    // without spending the free quota on performance data.
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    initialScope: { tags: { surface: 'admin-portal' } },
    ignoreErrors: [
      // Benign browser noise from layout thrash; carries no useful stack.
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],
  });
}

/** Attach the signed-in account (id and role only, never email) to later events. */
export function identifyUser(user: { id: string; role?: string | null } | null): void {
  if (!sentryEnabled) return;
  Sentry.setUser(user ? { id: user.id } : null);
  Sentry.setTag('role', user?.role ?? 'signed-out');
}

/**
 * Report a render crash caught by ErrorBoundary. Returns the Sentry event id
 * so the error page can show a reference the user can quote to support.
 */
export function reportRenderError(error: unknown, componentStack?: string | null): string | undefined {
  if (!sentryEnabled) return undefined;
  return Sentry.captureReactException(error, { componentStack });
}
