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
maestro test .maestro/areas-and-traffic.yaml
```

## Flows

| Flow | Covers |
|---|---|
| `home.yaml` | Home, top to bottom |
| `areas-and-traffic.yaml` | The area grid (which absorbed Vibe Check) and the full traffic list |
| `capture.yaml` | The camera-or-library chooser on posts and stories. **Needs a signed-in session** — both surfaces gate on auth, and as a guest the compose button routes to Profile instead. It asserts that up front so the reason is obvious. |

## Notes

- Flows start with `launchApp`, but that **foregrounds an already-running app
  without resetting its scroll position**. A Home screenshot that appears to be
  missing its header is usually the previous run's scroll offset, not a bug.
  Run `xcrun simctl terminate booted com.femola.consumerapp` first when the
  starting state matters.
- **Match on `accessibilityLabel`, not on visible text.** A composed row's
  nested `<Text>` is not surfaced in the accessibility tree on its own, so
  `tapOn: "Explore the area"` fails on a row that plainly shows those words.
  Where a label exists it also *overrides* the visible text, which is why the
  traffic link is matched as "See all 2 routes" rather than "All 2 routes".
  When a flow can't find an element, the fix is usually to add the missing
  label to the component — which is a real accessibility improvement, not a
  test workaround.
- Tab routes are siblings, so `- back` does not return to Home from the area
  screen. Tap the tab instead.
- The expo-dev-client sheet appears in two states on a debug build — the
  first-run onboarding ("Continue") and the menu itself ("Reload"). Both
  dismissals are conditional, so the flow also works on a release build where
  neither appears.
- `takeScreenshot` paths must be bare names. Absolute paths are rejected as
  resolving outside the run's output folder.
- Only one iOS simulator runtime is kept installed; each is roughly 8 GB.
