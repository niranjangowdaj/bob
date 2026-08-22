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
        urllib.request.urlopen("https://www.google.com", timeout=5)
        return True
    except Exception:
        return False


def check_gemini_api() -> bool:
    try:
        client.models.generate_content(
            model="gemini-2.0-flash",
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
    run_git("commit", "-m", message)
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
        model="gemini-2.0-flash",
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

CODE_PROMPT = """You are Bob, an autonomous website builder bot.
Build this project: {title}

Description: {description}
Framework: {framework}
Features: {features}

Generate a COMPLETE, production-quality project.

For plain-html: Return a single index.html with inline CSS and JS.
For react/nextjs/vite/svelte/vue/astro: Return the ENTIRE project file structure as a JSON object:
{{
  "framework": "{framework}",
  "setup_command": "the command to create the project (e.g. 'npx create-next-app@latest --typescript --tailwind --app')",
  "files": {{
    "path/to/file": "file content",
    "path/to/another": "file content"
  }},
  "build_command": "the build command if needed",
  "install_command": "npm install or equivalent"
}}

Important framework-specific rules:
- For Next.js: ALWAYS add `output: 'export'` in next.config.js for static export. Use App Router.
- For React (Vite): Use TypeScript, put source in src/
- For all frameworks: use TypeScript when possible

Requirements:
- Modern, beautiful design with smooth animations
- Responsive (works on mobile and desktop)
- Use a free Google Font
- Include at least one interactive element
- Color scheme should be cohesive and attractive
- This should look like a real production website, not a tutorial example
- For frameworks: use TypeScript, proper folder structure, components
- Make sure the project can be statically exported (no server-side features)
"""


def generate_project(project: dict) -> dict:
    """Generate the project. Returns {"type": "html", "content": "..."} or {"type": "framework", "setup": ..., "files": ...}"""
    prompt = CODE_PROMPT.format(
        title=project["title"],
        description=project["description"],
        framework=project.get("framework", "plain-html"),
        features=", ".join(project["features"]),
    )

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=16000,
        )
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]
    text = text.strip()

    framework = project.get("framework", "plain-html")

    if framework == "plain-html":
        return {"type": "html", "content": text}

    # Try to parse as JSON (framework project)
    try:
        data = json.loads(text)
        return {"type": "framework", **data}
    except json.JSONDecodeError:
        # Fallback: save as HTML
        return {"type": "html", "content": text}


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


def save_project_files(project_name: str, generated: dict):
    """Save generated project to disk."""
    project_dir = PROJECTS_DIR / project_name
    project_dir.mkdir(exist_ok=True)

    if generated["type"] == "html":
        (project_dir / "index.html").write_text(generated["content"], encoding="utf-8")
        log.info(f"📁 Saved HTML to {project_dir / 'index.html'}")

    elif generated["type"] == "framework":
        framework = generated.get("framework", "react")

        # Create the project from setup command if provided
        setup = generated.get("setup_command", "")
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

        # Write all files
        for file_path, content in generated.get("files", {}).items():
            full_path = project_dir / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content, encoding="utf-8")
            log.info(f"  📄 {file_path}")

        # Install dependencies
        install_cmd = generated.get("install_command", "")
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
        build_cmd = generated.get("build_command", "")
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

        # Generate GitHub Actions workflow for framework projects
        if framework != "plain-html":
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

    # Health checks
    if not check_internet():
        set_status("offline", "No internet connection")
        return None

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

    # 2. Generate project
    log.info(f"🔨 Building {idea['title']} with {idea.get('framework', 'html')}...")
    generated = generate_project(idea)

    # 3. Save files
    save_project_files(idea["name"], generated)

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
