import type { ComponentType } from 'react';
import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';

/**
 * Crash reporting. Everything here is a no-op until EXPO_PUBLIC_SENTRY_DSN is
 * set — it is inlined at bundle time, so for EAS builds it must be an EAS
 * environment variable and for local runs it lives in apps/consumer-app/.env.
 * Without it the app makes no Sentry network calls and the component tree is
 * exactly what it was before.
 *
 * Release and dist are read from the native binary by the SDK, so events line
 * up with the app.json version and the EAS build number without any wiring.
 */

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const sentryEnabled = Boolean(dsn);

/**
 * Nothing in this file may throw during import or init.
 *
 * `@sentry/react-native` is a NATIVE module. A dev client built before it was
 * added has no native counterpart, so touching the SDK throws on import — and
 * because index.ts calls initSentry() before registerRootComponent(), that
 * took the whole app down with `"main" has not been registered`, an error that
 * says nothing about Sentry and sends you looking at Metro instead.
 *
 * Crash reporting must never be load-bearing for startup. If the SDK is
 * unavailable for any reason, the app boots with reporting off.
 */

// Created eagerly so App.tsx can hand it the NavigationContainer ref whether
// or not Sentry is on. Null when the native module is missing.
export const navigationIntegration = (() => {
  try {
    return Sentry.reactNavigationIntegration({ enableTimeToInitialDisplay: false });
  } catch (err) {
    console.warn('[sentry] navigation integration unavailable:', err);
    return null;
  }
})();

export function initSentry(): void {
  if (!dsn) return;

  try {
    Sentry.init({
      dsn,
      // Dev client → development. EAS builds report their update channel
      // (preview / production) so test builds never pollute production alerts.
      environment: __DEV__ ? 'development' : Updates.channel ?? 'production',
      integrations: navigationIntegration ? [navigationIntegration] : [],
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
      // All three surfaces currently share one Sentry project — this tag is
      // how events from the app stay distinguishable from the two portals.
      initialScope: { tags: { surface: 'consumer-app' } },
    });
  } catch (err) {
    console.warn('[sentry] init failed, continuing without crash reporting:', err);
  }
}

/** Wrap the root component for touch breadcrumbs and app-start timing. */
export function withSentryRoot<P extends Record<string, unknown>>(
  Root: ComponentType<P>,
): ComponentType<P> {
  if (!sentryEnabled) return Root;
  try {
    return Sentry.wrap(Root);
  } catch (err) {
    // Returning the unwrapped root is always safe — the alternative is
    // registering nothing at all, which is how this file took down startup.
    console.warn('[sentry] wrap failed, using unwrapped root:', err);
    return Root;
  }
}

/** Attach the signed-in account (id only, never email) to later events. */
export function identifyUser(userId: string | null): void {
  if (!sentryEnabled) return;
  try {
    Sentry.setUser(userId ? { id: userId } : null);
  } catch (err) {
    console.warn('[sentry] setUser failed:', err);
  }
}

/**
 * Report a render crash caught by ErrorBoundary. Returns the event id so the
 * fallback screen can show a reference the user can quote to support.
 */
export function reportRenderError(error: unknown, componentStack?: string | null): string | undefined {
  if (!sentryEnabled) return undefined;
  try {
    return Sentry.captureException(error, {
      contexts: { react: { componentStack: componentStack ?? undefined } },
    });
  } catch (err) {
    // This runs from inside an ErrorBoundary that is already handling a crash.
    // Throwing here would replace a recoverable render error with a hard one.
    console.warn('[sentry] captureException failed:', err);
    return undefined;
  }
}
