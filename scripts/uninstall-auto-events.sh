#!/bin/bash

# Uninstall Auto Events Sync

PLIST_NAME="com.gidiconnect.events-sync"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"

echo "🗑️  Uninstalling Auto Events Sync"
echo "================================="
echo ""

if [ -f "$PLIST_PATH" ]; then
    # Unload from launchd
    launchctl unload "$PLIST_PATH" 2>/dev/null

    # Remove the plist file
    rm "$PLIST_PATH"

    echo "✅ Auto Events Sync has been removed"
    echo ""
    echo "To reinstall: npm run events-auto:install"
else
    echo "ℹ️  Auto Events Sync was not installed"
fi
