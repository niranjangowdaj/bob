#!/bin/bash
# Stop Bob

cd "$(dirname "$0")"

if [ -f logs/bob.pid ]; then
    PID=$(cat logs/bob.pid)
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "🤖 Bob is stopping... (PID: $PID)"
        rm logs/bob.pid
    else
        echo "🤖 Bob was already stopped"
        rm logs/bob.pid
    fi
else
    echo "🤖 Bob wasn't running"
fi
