# 🤖 Bob — Your Autonomous Website Builder

Bob lives on your machine in a single folder. He builds websites using **any framework** (React, Next.js, Vite, plain HTML, whatever). Everything lives inside his directory. He pushes to GitHub every hour.

## What Bob Does

1. **Starts up** → checks for uncommitted changes → pushes them
2. **Resumes** any incomplete project from last time
3. **Thinks** of a new idea (if no incomplete project)
4. **Plans** the project structure (which files to create)
5. **Builds** file by file, tracking progress
6. **Saves** to `projects/` inside his folder
7. **Pushes** everything to GitHub
8. **Waits** for next build cycle

## Setup (5 minutes)

### 1. Install dependencies

```bash
cd bob
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure API keys

```bash
cp config/.env.example config/.env
```

Edit `config/.env`:

```
GEMINI_API_KEY=your_gemini_api_key_here
GITHUB_TOKEN=your_github_personal_access_token_here
GITHUB_USERNAME=your_github_username
GITHUB_REPO=bob
```

**Where to get keys:**
- **Gemini API Key**: https://aistudio.google.com/apikey
- **GitHub**: Already configured via SSH — no token needed
  - Repo: `git@github.com:niranjangowdaj/bob.git`

### 3. Run Bob

**Terminal 1 — Widget:**
```bash
source .venv/bin/activate
python bob_widget.py
```

**Terminal 2 — Engine:**
```bash
source .venv/bin/activate
python bob.py
```

### 4. Auto-start on boot (optional)

```bash
chmod +x install-autostart.sh
./install-autostart.sh
```

## macOS Menu Bar Widget

| Icon | Status |
|------|--------|
| 🟢 | Awake — waiting for next build |
| 💡 | Thinking of ideas... |
| 🔨 | Building a website |
| 🚀 | Pushing to GitHub |
| ❌ | Error occurred |
| 📡 | Offline (no internet / API down) |

Right-click the widget to: View Logs, Open Projects, Start/Stop Bob, Quit.

## How Push Works

- **One repo** — all projects live in `bob` as subdirectories
- **Portfolio page** — `index.html` at the root lists all projects with links
- **On startup** — Bob checks for uncommitted changes and pushes them
- **Whenever he wants** — Bob pushes randomly (20% chance every 5 min)
- **Every hour** — guaranteed push, no matter what
- **Before each build** — pushes any pending work first
- **No new repos** — everything stays in one place

Your portfolio: **https://niranjangowdaj.github.io/bob/**

## How Bob Builds

Bob doesn't generate everything in one shot. He uses a **plan → build** approach:

1. **Plan** — Gemini creates a project structure (which files, what each does)
2. **Build** — Bob generates each file one by one, with context from the plan
3. **Assemble** — installs dependencies, builds if needed
4. **Push** — commits and pushes to GitHub

This gives better quality code and stays within API limits.

| Project Type | How it deploys |
|-------------|----------------|
| **Plain HTML** | Served directly by GitHub Pages |
| **React/Next.js/Vite/etc** | GitHub Actions workflow builds + deploys |

**Important:** Enable GitHub Pages with **"GitHub Actions"** as the source (not branch).

```
bob/
├── .github/workflows/        ← Auto-generated deploy workflows
│   ├── deploy-react-dashboard.yml
│   └── deploy-nextjs-blog.yml
├── index.html                ← Portfolio page (auto-generated)
├── projects/
│   ├── ai-pomodoro-timer/
│   │   └── index.html        ← Plain HTML, served directly
│   ├── react-dashboard/
│   │   ├── package.json
│   │   └── src/
│   ├── nextjs-blog/
│   │   ├── package.json
│   │   ├── next.config.js    ← output: 'export' for static
│   │   └── app/
│   └── .projects.json
├── bob.py
├── bob_widget.py
└── config/
```

## Project Structure

```
bob/
├── bob.py                  # Main bot — the brain
├── bob_widget.py           # macOS menu bar widget
├── start.sh                # Start Bob
├── stop.sh                 # Stop Bob
├── install-autostart.sh    # Install auto-start on boot
├── requirements.txt        # Python dependencies
├── config/
│   └── .env.example        # API key template
├── projects/               # All built websites live here
│   └── .projects.json      # Memory of past projects
└── logs/
    ├── bob.log             # Bob's thoughts
    └── bob_status.json     # Live status for widget
```

## Bob Can Build

- **React** (Vite + TypeScript)
- **Next.js** (App Router)
- **Plain HTML/CSS/JS**
- **Astro**
- **Svelte**
- **Vue**
- Whatever framework fits the project best

Each project is self-contained in its own subdirectory under `projects/`.

## Commands

```bash
python bob.py           # Normal mode: build new projects
python bob.py --rework  # Rework all failed projects
```

## How Bob Builds (Nested Planning)

Bob uses a 3-level planning system:

1. **Architecture** — how the app is structured
2. **Components** — small, focused pieces (3-5 files each)
3. **Files** — individual files within each component

This gives better quality code and easier debugging.

## Self-Healing

When a build fails:
1. Bob captures the full error
2. Creates a NEW simpler plan (fewer deps, different approach)
3. Regenerates files and retries (up to 3 times)
4. If still failing → saves error for later rework

## Customization

- **Build frequency**: Edit `wait` in `bob.py` (default: 1 hour)
- **Repo name**: Change `GITHUB_REPO` in `.env`
- **Problems**: Edit `PROBLEMS.md` to tell Bob about issues
