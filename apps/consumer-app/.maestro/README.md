# Maestro flows

UI flows that drive the app on a booted simulator and capture screenshots, so
a change can be reviewed as rendered pixels rather than inferred from a
stylesheet. Screenshots land in `~/.maestro/tests/<timestamp>/<flow>/takeScreenshot/`.

## Running

Maestro needs a JRE on PATH:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$HOME/.maestro/bin:$PATH"

# Boot a simulator and install a debug build first:
#   xcrun simctl boot <device-udid> && open -a Simulator
#   npx expo run:ios --device <device-udid>

maestro test .maestro/home.yaml
```

## Notes

- Flows start with `launchApp` for a clean state each run.
- The expo-dev-client sheet appears in two states on a debug build — the
  first-run onboarding ("Continue") and the menu itself ("Reload"). Both
  dismissals are conditional, so the flow also works on a release build where
  neither appears.
- `takeScreenshot` paths must be bare names. Absolute paths are rejected as
  resolving outside the run's output folder.
- Only one iOS simulator runtime is kept installed; each is roughly 8 GB.
