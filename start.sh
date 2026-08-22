#!/bin/bash
# Bob's startup script
# Run this to wake Bob up

cd "$(dirname "$0")"

# Check if Bob is already running
if pgrep -f "python.*bob.py" > /dev/null; then
    echo "🤖 Bob is already awake!"
    exit 0
fi

# Activate venv if it exists
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Start Bob in background
nohup python bob.py > logs/bob.log 2>&1 &
echo $! > logs/bob.pid

echo "🤖 Bob is awake! PID: $(cat logs/bob.pid)"
echo "📄 Logs: tail -f logs/bob.log"
