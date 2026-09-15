import { registerRootComponent } from 'expo';

import { initSentry, withSentryRoot } from './lib/sentry';
import App from './App';

// Before anything renders, so a crash during the first mount is reported too.
//
// Guarded because registration below MUST happen. When this threw — as it did
// on a dev client built before @sentry/react-native, a native module, was
// added — the app never registered and RN reported `"main" has not been
// registered`, which points at Metro and says nothing about the real cause.
// lib/sentry.ts swallows its own failures too; this is the outer belt.
try {
  initSentry();
} catch (err) {
  console.warn('[startup] Sentry init failed, continuing:', err);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(withSentryRoot(App));
