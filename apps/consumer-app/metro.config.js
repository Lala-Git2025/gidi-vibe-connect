// Expo's default Metro config plus Sentry's serializer, which stamps a Debug
// ID into every bundle and its source map so uploaded maps can be matched to
// the exact build that crashed. Purely a build-time annotation — no runtime
// behaviour changes and nothing is uploaded from here.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
