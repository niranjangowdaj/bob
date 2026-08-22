#!/usr/bin/env python3
"""
Bob — Your Autonomous Website Builder Bot

Bob lives in a single directory. He builds websites using ANY framework
(React, Next.js, plain HTML, whatever). Everything stays inside his folder.
He pushes to GitHub every hour. On startup, he checks for uncommitted
changes and pushes them first.
"""

import os
import json
import time
import random
import logging
import subprocess
import urllib.request
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

from google import genai
from google.genai import types

# Load config
load_dotenv("config/.env")

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [BOB] %(message)s",
    handlers=[
        logging.FileHandler("logs/bob.log"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger("bob")

# Config
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_USERNAME = os.getenv("GITHUB_USERNAME")
GITHUB_REPO = os.getenv("GITHUB_REPO", "bob-projects")  # single repo for all projects
BOB_DIR = Path(__file__).parent.resolve()
PROJECTS_DIR = BOB_DIR / "projects"
PROJECTS_DIR.mkdir(exist_ok=True)
STATUS_FILE = BOB_DIR / "logs" / "bob_status.json"

# Initialize Gemini
client = genai.Client(api_key=GEMINI_API_KEY)


# ─── Status Reporting ────────────────────────────────────────────────────

def set_status(state: str, message: str = ""):
    """Write status for the menu bar widget."""
    status = {
        "state": state,
        "message": message,
        "updated_at": datetime.now().isoformat(),
    }
    STATUS_FILE.parent.mkdir(exist_ok=True)
    with open(STATUS_FILE, "w") as f:
        json.dump(status, f)
    log.info(f"[STATUS] {state}: {message}")


def check_internet() -> bool:
    try:
        urllib.request.urlopen("https://dns.google/resolve?name=google.com", timeout=5)
        return True
    except Exception:
        try:
            urllib.request.urlopen("https://httpbin.org/ip", timeout=5)
            return True
        except Exception:
            return False


def check_gemini_api() -> bool:
    try:
        client.models.generate_content(
            model="gemini-3.6-flash",
            contents="Say hi in 3 words",
            config=types.GenerateContentConfig(max_output_tokens=10),
        )
        return True
    except Exception:
        return False


# ─── Git Operations (single repo) ───────────────────────────────────────

def run_git(*args) -> subprocess.CompletedProcess:
    """Run a git command in the bob directory."""
    return subprocess.run(
        ["git"] + list(args),
        cwd=str(BOB_DIR),
        capture_output=True,
        text=True,
    )


def init_git_repo():
    """Initialize git repo and set up remote if needed."""
    # Check if already a git repo
    result = run_git("rev-parse", "--is-inside-work-tree")
    if result.returncode == 0:
        log.info("Git repo already initialized")
        # Make sure remote exists
        remote_result = run_git("remote", "get-url", "origin")
        if remote_result.returncode != 0 and GITHUB_USERNAME and GITHUB_REPO:
            remote_url = f"git@github.com:{GITHUB_USERNAME}/{GITHUB_REPO}.git"
            run_git("remote", "add", "origin", remote_url)
            log.info("Remote added")
        return

    log.info("Initializing git repo...")
    run_git("init")
    run_git("branch", "-M", "main")

    # Add remote via SSH
    if GITHUB_USERNAME and GITHUB_REPO:
        remote_url = f"git@github.com:{GITHUB_USERNAME}/{GITHUB_REPO}.git"
        run_git("remote", "add", "origin", remote_url)
        log.info(f"Remote added: {remote_url}")

    # Create .gitignore
    gitignore = BOB_DIR / ".gitignore"
    if not gitignore.exists():
        gitignore.write_text("""# Bob's gitignore
.env
.venv/
__pycache__/
*.pyc
logs/bob_status.json
node_modules/
.next/
dist/
build/
.DS_Store
*.log
""")

    log.info("Git repo initialized")


def has_changes() -> bool:
    """Check if there are uncommitted changes."""
    result = run_git("status", "--porcelain")
    return bool(result.stdout.strip())


def push_changes(message: str = ""):
    """Stage, commit, and push all changes."""
    if not has_changes():
        log.info("No changes to push")
        return

    if not message:
        projects = list(PROJECTS_DIR.iterdir())
        project_names = [p.name for p in projects if p.is_dir() and not p.name.startswith(".")]
        message = f"Bob update: {', '.join(project_names[-3:])} ({len(project_names)} total projects)"

    log.info(f"Pushing changes: {message}")
    run_git("add", "-A")
    run_git("commit", "--author=Bob <bob@bot.local>", "-m", message)
    result = run_git("push", "origin", "main")

    if result.returncode == 0:
        log.info("✅ Pushed to GitHub")
    else:
        log.error(f"Push failed: {result.stderr}")


# ─── Project Idea Generation ─────────────────────────────────────────────

IDEA_PROMPT = """You are Bob, an autonomous website builder bot.
You live on a developer's machine and build cool web projects in your spare time.

Generate ONE unique web project idea. Be creative and interesting.
You can use ANY framework or tech stack.

Respond with ONLY a JSON object (no markdown, no explanation):

{{
  "name": "short-kebab-case-name",
  "title": "Human Readable Title",
  "description": "One sentence description",
  "framework": "react | nextjs | vite | plain-html | astro | svelte | vue | other",
  "features": ["feature1", "feature2", "feature3"]
}}

Rules:
- Pick the BEST framework for the project (don't always pick the same one)
- Make it something actually cool and useful
- Never repeat previous ideas: {previous_projects}
- The project must be hostable (static export, Vercel-compatible, or plain HTML)
"""


def get_project_idea() -> dict:
    previous = get_previous_projects()
    previous_names = [p.get("name", "unknown") for p in previous[-20:]]

    prompt = IDEA_PROMPT.format(
        previous_projects=", ".join(previous_names) if previous_names else "none yet"
    )

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=1.0,
            max_output_tokens=500,
        )
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]

    return json.loads(text.strip())


# ─── Website Generation ──────────────────────────────────────────────────

PLAN_PROMPT = """You are Bob, an autonomous website builder bot.
Create a build plan for this project: {title}

Description: {description}
Framework: {framework}
Features: {features}

Return a JSON object with the project plan:
{{
  "framework": "{framework}",
  "setup_command": "command to create project (e.g. 'npx create-next-app@latest project --typescript --tailwind --app') or empty for plain-html",
  "install_command": "npm install or empty",
  "build_command": "npm run build or empty",
  "files": [
    {{"path": "path/to/file", "description": "what this file does"}},
    {{"path": "path/to/another", "description": "what this file does"}}
  ]
}}

Rules:
- List ALL files needed for the project
- For plain-html: just one index.html
- For React: src/App.tsx, src/main.tsx, index.html, package.json, vite.config.ts, etc.
- For Next.js: app/layout.tsx, app/page.tsx, next.config.js, package.json, etc.
- For Next.js: MUST include output: 'export' in next.config.js
- Keep file count reasonable (5-15 files max)
- Use TypeScript when possible
- Make sure the project can be statically exported (no server-side features)
"""

FILE_PROMPT = """You are Bob, an autonomous website builder bot.
Generate the file: {file_path}

For project: {title}
Description: {description}
Framework: {framework}
Features: {features}

Other files in this project:
{file_list}

This file should:
{file_description}

Return ONLY the raw file content. No markdown fences, no explanations.

Requirements:
- Modern, beautiful design with smooth animations
- Responsive (works on mobile and desktop)
- Use a free Google Font
- Include at least one interactive element
- Color scheme should be cohesive and attractive
- This should look like a real production website
- For TypeScript files: proper types, no `any`
- Import paths must match the project structure
"""


def generate_plan(project: dict) -> dict:
    """Generate a build plan for the project."""
    prompt = PLAN_PROMPT.format(
        title=project["title"],
        description=project["description"],
        framework=project.get("framework", "plain-html"),
        features=", ".join(project["features"]),
    )

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=2000,
        )
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]

    return json.loads(text.strip())


def generate_file(file_info: dict, project: dict, project_dir: Path) -> str:
    """Generate a single file's content."""
    # Build list of other files for context
    other_files = []
    for f in project.get("files", []):
        if f["path"] != file_info["path"]:
            other_files.append(f"{f['path']} - {f['description']}")

    prompt = FILE_PROMPT.format(
        file_path=file_info["path"],
        title=project["title"],
        description=project["description"],
        framework=project.get("framework", "plain-html"),
        features=", ".join(project["features"]),
        file_list="\n".join(other_files) if other_files else "(first file)",
        file_description=file_info["description"],
    )

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=8000,
        )
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]

    return text.strip()


def generate_github_actions_workflow(project_name: str, framework: str) -> str:
    """Generate a GitHub Actions workflow for framework projects."""
    # Determine build output directory and commands based on framework
    configs = {
        "react": {
            "node": "18",
            "install": "npm install",
            "build": "npm run build",
            "output_dir": "dist",
        },
        "nextjs": {
            "node": "18",
            "install": "npm install",
            "build": "npx next build && npx next export",
            "output_dir": "out",
        },
        "vite": {
            "node": "18",
            "install": "npm install",
            "build": "npm run build",
            "output_dir": "dist",
        },
        "astro": {
            "node": "18",
            "install": "npm install",
            "build": "npm run build",
            "output_dir": "dist",
        },
        "svelte": {
            "node": "18",
            "install": "npm install",
            "build": "npm run build",
            "output_dir": "build",
        },
        "vue": {
            "node": "18",
            "install": "npm install",
            "build": "npm run build",
            "output_dir": "dist",
        },
    }

    config = configs.get(framework, configs["react"])
    base_path = f"/projects/{project_name}/"

    workflow = f"""name: Deploy {project_name}

on:
  push:
    branches: [main]
    paths:
      - 'projects/{project_name}/**'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages-{project_name}"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: {config["node"]}

      - name: Install dependencies
        working-directory: projects/{project_name}
        run: {config["install"]}

      - name: Build
        working-directory: projects/{project_name}
        run: {config["build"]}

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: projects/{project_name}/{config["output_dir"]}

  deploy:
    environment:
      name: github-pages
      url: ${{{{ steps.deployment.outputs.page_url }}}}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
"""
    return workflow


def save_project_files(project_name: str, plan: dict):
    """Save generated project to disk, file by file."""
    project_dir = PROJECTS_DIR / project_name
    project_dir.mkdir(exist_ok=True)

    framework = plan.get("framework", "plain-html")

    # For plain HTML: generate single file
    if framework == "plain-html":
        file_info = plan["files"][0]  # just index.html
        content = generate_file(file_info, plan, project_dir)
        full_path = project_dir / file_info["path"]
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content, encoding="utf-8")
        log.info(f"📁 Saved {file_info['path']}")
    else:
        # Framework: run setup first
        setup = plan.get("setup_command", "")
        if setup:
            log.info(f"📦 Running setup: {setup}")
            subprocess.run(
                setup,
                shell=True,
                cwd=str(project_dir),
                capture_output=True,
                text=True,
                timeout=120,
            )

        # Generate each file individually
        for i, file_info in enumerate(plan["files"]):
            log.info(f"  📄 [{i+1}/{len(plan['files'])}] {file_info['path']}")
            content = generate_file(file_info, plan, project_dir)
            full_path = project_dir / file_info["path"]
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content, encoding="utf-8")

        # Install dependencies
        install_cmd = plan.get("install_command", "")
        if install_cmd:
            log.info(f"📥 Installing: {install_cmd}")
            subprocess.run(
                install_cmd,
                shell=True,
                cwd=str(project_dir),
                capture_output=True,
                text=True,
                timeout=120,
            )

        # Build if needed
        build_cmd = plan.get("build_command", "")
        if build_cmd:
            log.info(f"🔨 Building: {build_cmd}")
            subprocess.run(
                build_cmd,
                shell=True,
                cwd=str(project_dir),
                capture_output=True,
                text=True,
                timeout=120,
            )

        # Generate GitHub Actions workflow
        workflows_dir = BOB_DIR / ".github" / "workflows"
        workflows_dir.mkdir(parents=True, exist_ok=True)
        workflow_file = workflows_dir / f"deploy-{project_name}.yml"
        workflow_content = generate_github_actions_workflow(project_name, framework)
        workflow_file.write_text(workflow_content, encoding="utf-8")
        log.info(f"⚙️ Created workflow: {workflow_file}")


# ─── Project Memory ──────────────────────────────────────────────────────

def get_previous_projects() -> list:
    projects_file = PROJECTS_DIR / ".projects.json"
    if projects_file.exists():
        with open(projects_file) as f:
            return json.load(f)
    return []


def save_project(project: dict):
    projects_file = PROJECTS_DIR / ".projects.json"
    projects = get_previous_projects()
    project["built_at"] = datetime.now().isoformat()
    projects.append(project)
    with open(projects_file, "w") as f:
        json.dump(projects, f, indent=2)
    # Regenerate index page
    generate_index_page()


def generate_index_page():
    """Generate a portfolio index page listing all projects."""
    projects = get_previous_projects()
    username = GITHUB_USERNAME or "YOUR_USERNAME"
    repo = GITHUB_REPO or "bob-projects"

    cards = ""
    for p in reversed(projects):  # newest first
        name = p.get("name", "unknown")
        title = p.get("title", name)
        desc = p.get("description", "")
        framework = p.get("framework", "html")
        built = p.get("built_at", "")[:10]  # just the date
        url = f"https://{username}.github.io/{repo}/projects/{name}/"

        cards += f"""
        <a href="{url}" target="_blank" class="card">
          <div class="card-header">
            <h2>{title}</h2>
            <span class="badge">{framework}</span>
          </div>
          <p>{desc}</p>
          <div class="card-footer">
            <span class="date">{built}</span>
            <span class="link">Visit →</span>
          </div>
        </a>
"""

    if not cards:
        cards = '<p class="empty">Bob hasn\'t built anything yet. Check back soon!</p>'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bob's Projects</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {{
      --bg: #0a0a0a;
      --card-bg: #141414;
      --card-hover: #1a1a1a;
      --border: #222;
      --text: #e0e0e0;
      --text-dim: #888;
      --accent: #4ade80;
    }}
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem;
    }}
    .header {{
      text-align: center;
      margin-bottom: 3rem;
    }}
    .header h1 {{
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }}
    .header h1 span {{ color: var(--accent); }}
    .header p {{ color: var(--text-dim); font-size: 1.1rem; }}
    .count {{
      color: var(--accent);
      font-weight: 600;
    }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }}
    .card {{
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      text-decoration: none;
      color: inherit;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }}
    .card:hover {{
      background: var(--card-hover);
      border-color: var(--accent);
      transform: translateY(-2px);
    }}
    .card-header {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
    }}
    .card h2 {{ font-size: 1.1rem; font-weight: 600; }}
    .badge {{
      background: var(--accent);
      color: #000;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      white-space: nowrap;
    }}
    .card p {{ color: var(--text-dim); font-size: 0.9rem; line-height: 1.4; flex: 1; }}
    .card-footer {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
    }}
    .date {{ color: var(--text-dim); }}
    .link {{ color: var(--accent); font-weight: 600; }}
    .empty {{
      text-align: center;
      color: var(--text-dim);
      font-size: 1.2rem;
      margin-top: 4rem;
    }}
  </style>
</head>
<body>
  <div class="header">
    <h1>🤖 Bob's <span>Projects</span></h1>
    <p>Autonomously built by Bob · <span class="count">{len(projects)}</span> projects</p>
  </div>
  <div class="grid">
    {cards}
  </div>
</body>
</html>
"""

    index_file = BOB_DIR / "index.html"
    index_file.write_text(html, encoding="utf-8")
    log.info(f"📄 Index page updated: {index_file}")


# ─── Main Loop ───────────────────────────────────────────────────────────

def build_project():
    """Bob builds one project from start to finish."""
    log.info("🔧 Bob is thinking of something to build...")
    set_status("thinking", "Coming up with an idea...")

    # Health checks - just try the Gemini API directly
    try:
        if not check_gemini_api():
            set_status("offline", "Gemini API not responding")
            return None
    except Exception:
        set_status("offline", "Gemini API not responding")
        return None

    # 1. Get idea
    idea = get_project_idea()
    log.info(f"💡 Idea: {idea['title']} — {idea['description']} ({idea.get('framework', 'html')})")
    set_status("building", idea["title"])

    # 2. Generate plan
    log.info(f"📋 Creating plan for {idea['title']} ({idea.get('framework', 'html')})...")
    plan = generate_plan(idea)
    plan["title"] = idea["title"]
    plan["description"] = idea["description"]
    plan["features"] = idea["features"]
    file_count = len(plan.get("files", []))
    log.info(f"📋 Plan: {file_count} files to generate")

    # 3. Build file by file
    log.info(f"🔨 Building {idea['title']}...")
    save_project_files(idea["name"], plan)

    # 4. Commit and push
    set_status("pushing", idea["name"])
    push_changes(f"Build: {idea['title']}")

    # 5. Remember
    save_project(idea)
    set_status("idle", f"Built: {idea['title']}")
    log.info("✅ Bob finished! Ready for next build.")

    return idea


def main():
    log.info("🤖 Bob is alive! Starting up...")
    set_status("starting", "Booting up...")

    if not GEMINI_API_KEY:
        log.error("GEMINI_API_KEY not set! Copy config/.env.example to config/.env")
        set_status("error", "GEMINI_API_KEY not set")
        return

    # 1. Init git if needed
    init_git_repo()

    # 2. Push any existing changes first
    if has_changes():
        log.info("📦 Found uncommitted changes, pushing first...")
        push_changes("Bob startup: pushing pending changes")

    # 3. Build immediately
    build_project()

    # 4. Loop — Bob pushes whenever he wants, guaranteed push every hour
    last_push = time.time()
    while True:
        # Random break between builds (10-30 min)
        wait = random.randint(600, 1800)
        set_status("idle", "Waiting for next build")
        log.info(f"⏰ Next build in {wait // 60} minutes...")

        # Sleep in small chunks so Bob can push randomly during wait
        elapsed = 0
        while elapsed < wait:
            chunk = min(300, wait - elapsed)  # check every 5 min
            time.sleep(chunk)
            elapsed += chunk

            # Random push (20% chance every 5 min)
            if has_changes() and random.random() < 0.2:
                push_changes("Bob felt like saving")
                last_push = time.time()

            # Guaranteed push every hour
            if time.time() - last_push >= 3600 and has_changes():
                push_changes("Hourly save")
                last_push = time.time()

        try:
            # Push before building
            if has_changes():
                push_changes("Pre-build push")
                last_push = time.time()
            build_project()
        except Exception as e:
            log.error(f"❌ Bob encountered an error: {e}")
            set_status("error", str(e))
            log.info("💤 Bob will try again later...")


if __name__ == "__main__":
    main()
