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

// Created eagerly so App.tsx can hand it the NavigationContainer ref whether
// or not Sentry is on — registering with an unused integration does nothing.
export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: false,
});

export function initSentry(): void {
  if (!dsn) return;

  Sentry.init({
    dsn,
    // Dev client → development. EAS builds report their update channel
    // (preview / production) so test builds never pollute production alerts.
    environment: __DEV__ ? 'development' : Updates.channel ?? 'production',
    integrations: [navigationIntegration],
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    // All three surfaces currently share one Sentry project — this tag is
    // how events from the app stay distinguishable from the two portals.
    initialScope: { tags: { surface: 'consumer-app' } },
  });
}

/** Wrap the root component for touch breadcrumbs and app-start timing. */
export function withSentryRoot<P extends Record<string, unknown>>(
  Root: ComponentType<P>,
): ComponentType<P> {
  return sentryEnabled ? Sentry.wrap(Root) : Root;
}

/** Attach the signed-in account (id only, never email) to later events. */
export function identifyUser(userId: string | null): void {
  if (!sentryEnabled) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

/**
 * Report a render crash caught by ErrorBoundary. Returns the event id so the
 * fallback screen can show a reference the user can quote to support.
 */
export function reportRenderError(error: unknown, componentStack?: string | null): string | undefined {
  if (!sentryEnabled) return undefined;
  return Sentry.captureException(error, {
    contexts: { react: { componentStack: componentStack ?? undefined } },
  });
}
