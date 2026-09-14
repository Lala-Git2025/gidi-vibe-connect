import { registerRootComponent } from 'expo';

import { initSentry, withSentryRoot } from './lib/sentry';
import App from './App';

// Before anything renders, so a crash during the first mount is reported too.
initSentry();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(withSentryRoot(App));
