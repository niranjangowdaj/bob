#!/usr/bin/env python3
"""
Bob Menu Bar Widget — macOS status bar app

Lives in your menu bar and shows:
- 🟢 Bob is awake (waiting for next build)
- 💡 Bob is thinking of ideas
- 🔨 Bob is building: project-name
- 🚀 Bob is pushing to GitHub
- ❌ Bob had an error
- 📡 Bob is offline (reason)
"""

import rumps
import json
import os
import threading
import time
from datetime import datetime
from pathlib import Path

STATUS_FILE = Path(__file__).parent / "logs" / "bob_status.json"
PROJECTS_DIR = Path(__file__).parent / "projects"
PROJECTS_FILE = PROJECTS_DIR / ".projects.json"


def read_status() -> dict:
    """Read Bob's current status."""
    if STATUS_FILE.exists():
        try:
            with open(STATUS_FILE) as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {
        "state": "unknown",
        "message": "Status unknown",
        "updated_at": "",
    }


def get_recent_projects() -> list:
    """Get last 5 built projects."""
    if PROJECTS_FILE.exists():
        try:
            with open(PROJECTS_FILE) as f:
                projects = json.load(f)
            return projects[-5:][::-1]  # last 5, newest first
        except (json.JSONDecodeError, IOError):
            pass
    return []


def format_time(iso_str: str) -> str:
    """Format ISO timestamp to readable string."""
    if not iso_str:
        return ""
    try:
        dt = datetime.fromisoformat(iso_str)
        return dt.strftime("%I:%M %p")
    except ValueError:
        return iso_str


class BobWidget(rumps.App):
    """Bob's macOS menu bar widget."""

    def __init__(self):
        super().__init__("🤖", quit_button=None)

        # Menu items
        self.status_item = rumps.MenuItem("Loading...")
        self.project_item = rumps.MenuItem("")
        self.time_item = rumps.MenuItem("")
        self.error_item = rumps.MenuItem("")

        self.menu = [
            self.status_item,
            None,  # separator
            self.project_item,
            self.time_item,
            self.error_item,
            None,
            rumps.MenuItem("View Logs", callback=self.open_logs),
            rumps.MenuItem("Open Projects Folder", callback=self.open_projects),
            None,
            rumps.MenuItem("Start Bob", callback=self.start_bob),
            rumps.MenuItem("Stop Bob", callback=self.stop_bob),
            None,
            rumps.MenuItem("Quit Bob", callback=self.quit_bob),
        ]

        # Update status every 5 seconds
        self.timer = rumps.Timer(self.update_status, 5)
        self.timer.start()

        # Initial update
        self.update_status(None)

    def update_status(self, _):
        """Refresh the widget with Bob's current status."""
        status = read_status()
        state = status.get("state", "unknown")
        message = status.get("message", "")
        updated = format_time(status.get("updated_at", ""))

        # Icon based on state
        icons = {
            "building": "🔨",
            "thinking": "💡",
            "pushing": "🚀",
            "sleeping": "😴",
            "error": "❌",
            "offline": "📡",
            "idle": "🟢",
            "starting": "⚡",
            "unknown": "❓",
        }
        icon = icons.get(state, "🤖")

        # Status line
        state_labels = {
            "building": "Building...",
            "thinking": "Thinking of ideas...",
            "pushing": "Pushing to GitHub...",
            "sleeping": "Sleeping",
            "idle": "Awake — waiting for next build",
            "error": f"Error: {message}",
            "offline": f"Offline: {message}",
            "idle": "Idle",
            "starting": "Starting up...",
            "unknown": "Unknown",
        }
        self.status_item.title = f"{icon} {state_labels.get(state, state)}"

        # Update menu bar icon
        self.icon = icon

        # Project info
        if state == "building":
            self.project_item.title = f"Project: {message}"
        elif state == "pushing":
            self.project_item.title = f"Pushing: {message}"
        else:
            self.project_item.title = ""

        # Time
        if updated:
            self.time_item.title = f"Updated: {updated}"
        else:
            self.time_item.title = ""

        # Error details
        if state == "error" or state == "offline":
            self.error_item.title = f"Reason: {message}"
        else:
            self.error_item.title = ""

    def open_logs(self, _):
        """Open the log file in Console.app."""
        log_path = Path(__file__).parent / "logs" / "bob.log"
        os.system(f'open "{log_path}"')

    def open_projects(self, _):
        """Open the projects folder in Finder."""
        os.system(f'open "{PROJECTS_DIR}"')

    def start_bob(self, _):
        """Start Bob process."""
        bob_dir = Path(__file__).parent
        os.system(f'cd "{bob_dir}" && ./start.sh &')
        rumps.notification("Bob", "", "Starting Bob...")

    def stop_bob(self, _):
        """Stop Bob process."""
        bob_dir = Path(__file__).parent
        os.system(f'cd "{bob_dir}" && ./stop.sh')
        rumps.notification("Bob", "", "Bob is stopping...")

    def quit_bob(self, _):
        """Quit everything."""
        self.stop_bob(None)
        rumps.quit_application()


if __name__ == "__main__":
    BobWidget().run()
