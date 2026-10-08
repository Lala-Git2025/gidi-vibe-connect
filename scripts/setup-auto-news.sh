#!/bin/bash
set -euo pipefail

# Installs a launchd job that runs the Lagos news agent every 3 hours on macOS.
#
# This is a SUPPLEMENT to .github/workflows/news-agent.yml, not a replacement.
# GitHub runs the same agent hourly but throttles free-tier schedules, so a
# local job gives a second, more predictable cadence. Removing this does not
# stop news from being collected.
#
# ── Why the plist is generated rather than checked in ───────────────────────
#
# It used to be a committed file, com.gidiconnect.newsagent.plist, holding
# absolute paths under /Users/femimoritiwon/gidi-vibe-connect-1 — and this
# script only ever rewrote the *node* path inside it, never the project path.
# When the checkout was renamed to gidi-vibe-connect the job kept loading and
# kept failing: 53 consecutive MODULE_NOT_FOUND runs over two months, writing
# errors into a logs/ directory inside a folder that held nothing else. The
# failure was invisible because launchctl reports a loaded job either way.
#
# An absolute path baked into a committed file cannot survive a rename, a
# different username, or a second checkout. So the plist is now written at
# install time from this script's own location, which is correct by
# construction.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT_SCRIPT="$REPO_ROOT/scripts/lagos-news-agent.js"
LABEL="com.gidiconnect.newsagent"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$REPO_ROOT/logs"

echo "GIDI NEWS AUTO-UPDATE SETUP"
echo "==========================="
echo

NODE_PATH="$(command -v node || true)"
if [ -z "$NODE_PATH" ]; then
  echo "Error: node not found in PATH." >&2
  exit 1
fi

# Fail here rather than install a job that cannot work — the whole point of
# this rewrite.
if [ ! -f "$AGENT_SCRIPT" ]; then
  echo "Error: $AGENT_SCRIPT does not exist." >&2
  echo "Run this script from inside the repository." >&2
  exit 1
fi

echo "node:    $NODE_PATH"
echo "repo:    $REPO_ROOT"
echo "agent:   $AGENT_SCRIPT"
echo

mkdir -p "$LOG_DIR" "$HOME/Library/LaunchAgents"

cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$LABEL</string>

    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$AGENT_SCRIPT</string>
    </array>

    <key>WorkingDirectory</key>
    <string>$REPO_ROOT</string>

    <key>StartInterval</key>
    <integer>10800</integer>

    <key>StandardOutPath</key>
    <string>$LOG_DIR/news-agent.log</string>

    <key>StandardErrorPath</key>
    <string>$LOG_DIR/news-agent-error.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$(dirname "$NODE_PATH"):/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <false/>
</dict>
</plist>
PLIST

launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

echo "Installed. Runs every 3 hours, starting now."
echo
echo "  status:    launchctl list | grep gidiconnect"
echo "  logs:      tail -f $LOG_DIR/news-agent.log"
echo "  errors:    tail -f $LOG_DIR/news-agent-error.log"
echo "  uninstall: npm run news-auto:uninstall"
echo
# The last install failed every single run for two months without anyone
# noticing, so say plainly how to tell whether this one works.
echo "Check it actually ran — an empty error log after a few minutes is good:"
echo "  wc -l $LOG_DIR/news-agent-error.log"
