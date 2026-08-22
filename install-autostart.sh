#!/bin/bash
# Install Bob's auto-start on macOS (launchd) or Linux (systemd)

set -e

BOB_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON="$(which python3)"

echo "🤖 Installing Bob's auto-start..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS — use launchd
    PLIST_PATH="$HOME/Library/LaunchAgents/com.bob.builder.plist"
    cat > "$PLIST_PATH" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
 "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.bob.builder</string>
    <key>ProgramArguments</key>
    <array>
        <string>${PYTHON}</string>
        <string>${BOB_DIR}/bob.py</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${BOB_DIR}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${BOB_DIR}/logs/bob.log</string>
    <key>StandardErrorPath</key>
    <string>${BOB_DIR}/logs/bob.log</string>
</dict>
</plist>
PLIST

    launchctl load "$PLIST_PATH"
    echo "✅ Bob will now start automatically on login (macOS launchd)"
    echo "   To remove: launchctl unload $PLIST_PATH"

elif [[ "$OSTYPE" == "linux"* ]]; then
    # Linux — use systemd
    SERVICE_PATH="$HOME/.config/systemd/user/bob.service"
    mkdir -p "$(dirname "$SERVICE_PATH")"

    cat > "$SERVICE_PATH" << SERVICE
[Unit]
Description=Bob - Autonomous Website Builder
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${BOB_DIR}
ExecStart=${PYTHON} ${BOB_DIR}/bob.py
Restart=on-failure
RestartSec=30

[Install]
WantedBy=default.target
SERVICE

    systemctl --user daemon-reload
    systemctl --user enable bob.service
    systemctl --user start bob.service
    echo "✅ Bob will now start automatically on login (systemd)"
    echo "   To remove: systemctl --user disable --now bob.service"

else
    echo "❌ Unsupported OS: $OSTYPE"
    echo "   Run 'python bob.py' manually instead"
fi
