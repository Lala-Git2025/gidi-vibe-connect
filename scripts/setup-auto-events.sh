#!/bin/bash

# Setup Auto Events Sync for macOS
# Runs events:sync daily at 3 AM

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PLIST_NAME="com.gidiconnect.events-sync"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"
LOG_DIR="$PROJECT_DIR/logs"

echo "🎫 Setting up Auto Events Sync"
echo "=============================="
echo ""

# Create logs directory
mkdir -p "$LOG_DIR"

# Get node path
NODE_PATH=$(which node)
if [ -z "$NODE_PATH" ]; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

echo "📍 Project: $PROJECT_DIR"
echo "📍 Node: $NODE_PATH"
echo "📍 Logs: $LOG_DIR"
echo ""

# Create the launchd plist
cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_NAME}</string>

    <key>ProgramArguments</key>
    <array>
        <string>${NODE_PATH}</string>
        <string>${PROJECT_DIR}/scripts/sync-all-events.js</string>
    </array>

    <key>WorkingDirectory</key>
    <string>${PROJECT_DIR}</string>

    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>3</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>

    <key>StandardOutPath</key>
    <string>${LOG_DIR}/events-sync.log</string>

    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/events-sync-error.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
    </dict>

    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
EOF

echo "✅ Created launchd plist: $PLIST_PATH"

# Unload if already loaded
launchctl unload "$PLIST_PATH" 2>/dev/null

# Load the new plist
launchctl load "$PLIST_PATH"

if [ $? -eq 0 ]; then
    echo "✅ Loaded into launchd"
    echo ""
    echo "🎉 Auto Events Sync is now active!"
    echo ""
    echo "📅 Schedule: Daily at 3:00 AM"
    echo "📝 Logs: $LOG_DIR/events-sync.log"
    echo ""
    echo "Commands:"
    echo "  npm run events-auto:status   - Check status"
    echo "  npm run events-auto:logs     - View logs"
    echo "  npm run events-auto:run      - Run manually now"
    echo "  npm run events-auto:uninstall - Remove auto-sync"
    echo ""
else
    echo "❌ Failed to load launchd plist"
    exit 1
fi
