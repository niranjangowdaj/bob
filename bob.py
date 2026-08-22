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
    try:
        status = {
            "state": state,
            "message": message,
            "updated_at": datetime.now().isoformat(),
        }
        STATUS_FILE.parent.mkdir(exist_ok=True)
        with open(STATUS_FILE, "w") as f:
            json.dump(status, f)
            f.flush()
            os.fsync(f.fileno())
    except Exception:
        pass  # don't crash if status write fails
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


def _extract_json(text: str) -> dict:
    """Robustly extract JSON from AI response text."""
    text = text.strip()
    # Remove markdown fences
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("{"):
                return json.loads(part)
    # Find first { and last }
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(text[start:end+1])
    raise json.JSONDecodeError("No JSON found in response", text, 0)

# Model pool: Gemini free tier + OpenRouter free models
GEMINI_MODEL = "gemini-3.1-flash-lite"
OPENROUTER_MODELS = [
    "google/gemma-4-31b-it:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nvidia/nemotron-3.5-lightning:free",
    "z-ai/glm-5.2:free",
    "cohere/north-mini-code:free",
]

# OpenRouter client (optional)
or_client = None
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY")
if OPENROUTER_KEY:
    from openai import OpenAI
    or_client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_KEY,
    )


def _gemini_call(prompt: str, temperature: float = 0.7) -> str:
    """Call Gemini API."""
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(temperature=temperature),
    )
    return response.text.strip()


def _openrouter_call(prompt: str, temperature: float = 0.7) -> str:
    """Call OpenRouter free model."""
    if not or_client:
        raise Exception("No OpenRouter API key")
    for model in OPENROUTER_MODELS:
        try:
            response = or_client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
            )
            content = response.choices[0].message.content
            return (content or "").strip()
        except Exception as e:
            if "429" in str(e):
                log.warning(f"⏳ {model} rate limited, trying next...")
                continue
            raise
    raise Exception("All OpenRouter models exhausted")


def _clean_text(text: str) -> str:
    """Clean AI response text - handle None and markdown."""
    if not text:
        return ""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")
        for part in text:
            part = part.strip()
            for lang in ["json", "html", "css", "javascript", "typescript"]:
                if part.startswith(lang):
                    part = part[len(lang):].strip()
            if len(part) > 50:
                return part
    return text


def _api_call(prompt: str, temperature: float = 0.7) -> str:
    """Make an API call: try Gemini first, fall back to OpenRouter."""
    # Try Gemini first
    try:
        return _gemini_call(prompt, temperature)
    except Exception as e:
        if "429" in str(e):
            log.warning(f"⏳ Gemini rate limited, switching to OpenRouter...")
            set_status("idle", "Switching to OpenRouter...")
        else:
            raise

    # Fall back to OpenRouter
    try:
        return _openrouter_call(prompt, temperature)
    except Exception as e:
        if "429" in str(e):
            # Both exhausted, wait and retry Gemini
            log.warning(f"⏳ All models rate limited, waiting 30s...")
            set_status("idle", "All models busy, waiting 30s")
            time.sleep(30)
            return _gemini_call(prompt, temperature)
        raise


def check_gemini_api() -> bool:
    try:
        _api_call("Say hi in 3 words", temperature=0.1)
        return True
    except Exception:
        return False


# ─── Problem Tracking ───────────────────────────────────────────────────

def get_problems() -> str:
    """Read known problems from PROBLEMS.md."""
    problems_file = BOB_DIR / "PROBLEMS.md"
    if problems_file.exists():
        content = problems_file.read_text()
        # Extract lines under ## Problems
        lines = []
        in_problems = False
        for line in content.split("\n"):
            if line.strip() == "## Problems":
                in_problems = True
                continue
            if in_problems and line.startswith("## "):
                break
            if in_problems and line.strip().startswith("-"):
                lines.append(line.strip())
        return "\n".join(lines) if lines else "(none)"
    return "(none)"


def move_to_solved(problem: str):
    """Move a problem from PROBLEMS.md to SOLVED.md."""
    problems_file = BOB_DIR / "PROBLEMS.md"
    solved_file = BOB_DIR / "SOLVED.md"

    # Remove from PROBLEMS.md
    if problems_file.exists():
        content = problems_file.read_text()
        content = content.replace(problem, "")
        # Clean up empty lines
        lines = [l for l in content.split("\n") if l.strip()]
        problems_file.write_text("\n".join(lines) + "\n")

    # Add to SOLVED.md
    timestamp = datetime.now().strftime("%Y-%m-%d")
    solved_entry = f"- [{timestamp}] {problem}"
    if solved_file.exists():
        content = solved_file.read_text()
        content = content.replace("(none yet)", solved_entry)
        solved_file.write_text(content)
    else:
        solved_file.write_text(f"# Solved Problems\n\n{solved_entry}\n")

    log.info(f"✅ Problem marked as solved: {problem[:50]}...")


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
.DS_Store
*.log
.next/
out/
package-lock.json
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
- AVOID these known problems: {problems}
"""


def get_project_idea() -> dict:
    previous = get_previous_projects()
    previous_names = [p.get("name", "unknown") for p in previous[-20:]]
    problems = get_problems()

    prompt = IDEA_PROMPT.format(
        previous_projects=", ".join(previous_names) if previous_names else "none yet",
        problems=problems,
    )

    for attempt in range(3):
        try:
            text = _api_call(prompt, temperature=1.0)
            return _extract_json(text)
        except (json.JSONDecodeError, Exception) as e:
            log.warning(f"Attempt {attempt + 1} failed: {e}")
            if attempt == 2:
                raise


# ─── Website Generation ──────────────────────────────────────────────────

PLAN_PROMPT = """You are Bob, an autonomous website builder bot.
Create a DETAILED build plan for this project: {title}

Description: {description}
Framework: {framework}
Features: {features}

Return a JSON object with NESTED planning:
{{
  "framework": "{framework}",
  "install_command": "npm install",
  "build_command": "npm run build",
  "architecture": "Brief description of how the app is structured",
  "components": [
    {{
      "name": "component-name",
      "description": "what this component does",
      "files": [
        {{"path": "src/components/Name.tsx", "description": "what this file does"}},
        {{"path": "src/components/Name.css", "description": "styles for this component"}}
      ]
    }}
  ],
  "config_files": [
    {{"path": "package.json", "description": "dependencies and scripts"}},
    {{"path": "vite.config.ts", "description": "build configuration"}}
  ],
  "files": [
    {{"path": "src/main.tsx", "description": "app entry point"}},
    {{"path": "src/App.tsx", "description": "root component"}},
    {{"path": "index.html", "description": "HTML shell"}}
  ]
}}

IMPORTANT RULES:
- Break down into SMALL components (3-5 files each max)
- Each component should be self-contained and focused on ONE thing
- Do NOT include setup_command. Bob generates all files directly.
- For plain-html: just one index.html in files array
- For React (Vite): config_files + components + entry files. Build script MUST be "vite build" NOT "tsc && vite build". tsconfig.json MUST have "strict": false.
- For Next.js: MUST include output: 'export' in next.config.js. EVERY component using useState/useEffect/onClick MUST have "use client" as FIRST line.
- All dependencies must be listed in package.json with EXACT versions that exist on npm
- Use ONLY: react, react-dom, framer-motion, lucide-react (no experimental libs)
- NO path aliases (@/) - use relative imports only
- Simple favicon or none (no complex data: URIs)
- AVOID these known problems: {problems}
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
- For Next.js App Router: if this file uses useState/useEffect/onClick/browser APIs, add "use client" as the FIRST line
- AVOID these known problems: {problems}
"""


def generate_plan(project: dict) -> dict:
    """Generate a build plan for the project."""
    problems = get_problems()
    prompt = PLAN_PROMPT.format(
        title=project["title"],
        description=project["description"],
        framework=project.get("framework", "plain-html"),
        features=", ".join(project["features"]),
        problems=problems,
    )

    for attempt in range(3):
        try:
            text = _api_call(prompt, temperature=0.7)
            return _extract_json(text)
        except (json.JSONDecodeError, Exception) as e:
            log.warning(f"Plan attempt {attempt + 1} failed: {e}")
            if attempt == 2:
                raise


# Framework fallback order: try simpler options on failure
FRAMEWORK_FALLBACKS = {
    "nextjs": ["vite", "react", "plain-html"],
    "react": ["vite", "plain-html"],
    "vite": ["react", "plain-html"],
    "svelte": ["vite", "plain-html"],
    "vue": ["vite", "plain-html"],
    "astro": ["vite", "plain-html"],
}


def replan_with_error(old_plan: dict, error: str, project_name: str, attempt: int = 1) -> dict:
    """Generate a new plan based build error. Gets simpler with each attempt."""
    old_framework = old_plan.get("framework", "react")
    fallbacks = FRAMEWORK_FALLBACKS.get(old_framework, ["plain-html"])
    # Pick simpler framework each attempt
    new_framework = fallbacks[min(attempt - 1, len(fallbacks) - 1)]

    # Severity increases with attempts
    if attempt == 1:
        simplify = "Fix the specific error. Keep similar structure."
    elif attempt == 2:
        simplify = "Switch framework and use fewer dependencies. Max 5 files."
    else:
        simplify = "Build as PLAIN HTML with inline CSS/JS. No npm. Single index.html. Guaranteed to work."

    prompt = f"""You are Bob. The project "{old_plan.get('title', project_name)}" failed to build.

Build error:
{error[:1000]}

Attempt {attempt}/3. Strategy: {simplify}
Switch to framework: {new_framework}

Create a NEW plan. Return JSON:
{{
  "framework": "{new_framework}",
  "install_command": "npm install" or empty if plain-html,
  "build_command": "npm run build" or empty if plain-html,
  "architecture": "Brief description",
  "components": [{{"name": "comp", "description": "...", "files": [{{"path": "...", "description": "..."}}]}}],
  "config_files": [{{"path": "package.json", "description": "deps"}}],
  "files": [{{"path": "src/main.tsx", "description": "entry"}}]
}}

RULES:
- Fix the error above
- Use ONLY these safe packages: react, react-dom, react-router-dom, framer-motion, lucide-react
- For plain-html: just one index.html with inline CSS/JS
- Max {8 - attempt * 2} files
- All npm packages must have EXISTING versions
"""

    problems = get_problems()
    prompt += f"\nAVOID: {problems}"

    for retry in range(3):
        try:
            text = _api_call(prompt, temperature=0.7)
            return _extract_json(text)
        except Exception as e:
            log.warning(f"Replan attempt {retry + 1} failed: {e}")
            if retry == 2:
                raise


def generate_file(file_info: dict, project: dict, project_dir: Path) -> str:
    """Generate a single file's content."""
    # Build list of other files for context
    other_files = []
    for f in project.get("files", []):
        if f["path"] != file_info["path"]:
            other_files.append(f"{f['path']} - {f['description']}")

    problems = get_problems()
    prompt = FILE_PROMPT.format(
        file_path=file_info["path"],
        title=project["title"],
        description=project["description"],
        framework=project.get("framework", "plain-html"),
        features=", ".join(project["features"]),
        file_list="\n".join(other_files) if other_files else "(first file)",
        file_description=file_info["description"],
        problems=problems,
    )

    text = _api_call(prompt, temperature=0.7)
    # Clean up markdown fences
    if "```" in text:
        text = text.split("```")
        for part in text:
            part = part.strip()
            if part.startswith("html") or part.startswith("css") or part.startswith("javascript") or part.startswith("typescript") or part.startswith("json"):
                part = part.split("\n", 1)[1] if "\n" in part else part
            if part and not part.startswith("{") and len(part) > 50:
                return part.strip()
    return text.strip()


def _run_command(cmd: str, cwd: Path, env: dict = None) -> tuple[bool, str]:
    """Run a command and return (success, error_output)."""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=300,
            env=env,
        )
        if result.returncode != 0:
            error = result.stderr or result.stdout
            return False, error[:2000]  # truncate long errors
        return True, ""
    except subprocess.TimeoutExpired:
        return False, "Command timed out after 300s"
    except Exception as e:
        return False, str(e)


def flatten_plan(plan: dict) -> list[dict]:
    """Flatten nested plan into ordered list of files."""
    all_files = []
    # Config files first
    for f in plan.get("config_files", []):
        all_files.append(f)
    # Then component files (grouped by component)
    for comp in plan.get("components", []):
        log.info(f"  🧩 Component: {comp.get('name', '?')} — {comp.get('description', '')}")
        for f in comp.get("files", []):
            all_files.append(f)
    # Then root files
    for f in plan.get("files", []):
        all_files.append(f)
    # Deduplicate by path
    seen = set()
    unique = []
    for f in all_files:
        if f["path"] not in seen:
            seen.add(f["path"])
            unique.append(f)
    return unique


def save_project_files(project_name: str, plan: dict, attempt: int = 1):
    """Save generated project to disk, file by file. Retries on build errors."""
    project_dir = PROJECTS_DIR / project_name
    project_dir.mkdir(exist_ok=True)

    framework = plan.get("framework", "plain-html")

    # Flatten nested plan into file list
    all_files = flatten_plan(plan)
    total_files = len(all_files)
    log.info(f"📋 Total files to generate: {total_files}")

    # For plain HTML: generate single file
    if framework == "plain-html":
        file_info = all_files[0]
        content = generate_file(file_info, plan, project_dir)
        full_path = project_dir / file_info["path"]
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content, encoding="utf-8")
        log.info(f"📁 Saved {file_info['path']}")
        update_project_status(project_name, "complete", 1, 1)
        return

    # Framework: generate each file
    for i, file_info in enumerate(all_files):
        log.info(f"  📄 [{i+1}/{total_files}] {file_info['path']}")
        content = generate_file(file_info, plan, project_dir)
        full_path = project_dir / file_info["path"]
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content, encoding="utf-8")
        update_project_status(project_name, "in_progress", i + 1, total_files)

    # Install dependencies
    log.info("📥 Installing dependencies...")
    env = os.environ.copy()
    env["CI"] = "true"
    success, error = _run_command("npm install", project_dir, env)
    if not success:
            log.error(f"❌ npm install failed:\n{error}")
            if attempt < 5:
                log.info(f"🔄 Retrying with new plan (attempt {attempt + 1}/3)...")
                new_plan = replan_with_error(plan, error, project_name, attempt)
                # Carry over metadata from original plan
                new_plan["title"] = plan.get("title", project_name)
                new_plan["description"] = plan.get("description", "")
                new_plan["features"] = plan.get("features", [])
                save_project_files(project_name, new_plan, attempt + 1)
                return
            else:
                raise Exception(f"Build failed after 5 attempts: {error[:200]}")

    # Build
    log.info("🔨 Building...")
    success, error = _run_command("npm run build", project_dir)
    if not success:
            log.error(f"❌ npm build failed:\n{error}")
            if attempt < 5:
                log.info(f"🔄 Retrying with new plan (attempt {attempt + 1}/3)...")
                new_plan = replan_with_error(plan, error, project_name, attempt)
                new_plan["title"] = plan.get("title", project_name)
                new_plan["description"] = plan.get("description", "")
                new_plan["features"] = plan.get("features", [])
                save_project_files(project_name, new_plan, attempt + 1)
                return
            else:
                raise Exception(f"Build failed after 5 attempts: {error[:200]}")

    update_project_status(project_name, "complete", total_files, total_files)


# ─── Project Memory ──────────────────────────────────────────────────────

def get_previous_projects() -> list:
    projects_file = PROJECTS_DIR / ".projects.json"
    if projects_file.exists():
        with open(projects_file) as f:
            return json.load(f)
    return []


def get_incomplete_project() -> dict | None:
    """Find a project that was started but not finished."""
    projects = get_previous_projects()
    for p in reversed(projects):
        if p.get("status") == "in_progress":
            return p
    return None


def save_project(project: dict, status: str = "complete"):
    projects_file = PROJECTS_DIR / ".projects.json"
    projects = get_previous_projects()
    project["built_at"] = datetime.now().isoformat()
    project["status"] = status
    projects.append(project)
    with open(projects_file, "w") as f:
        json.dump(projects, f, indent=2)
    # Regenerate index page
    generate_index_page()


def update_project_status(project_name: str, status: str, files_done: int = 0, files_total: int = 0):
    """Update a project's progress."""
    projects_file = PROJECTS_DIR / ".projects.json"
    projects = get_previous_projects()
    for p in projects:
        if p.get("name") == project_name:
            p["status"] = status
            p["files_done"] = files_done
            p["files_total"] = files_total
            p["updated_at"] = datetime.now().isoformat()
            break
    with open(projects_file, "w") as f:
        json.dump(projects, f, indent=2)


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
        status = p.get("status", "complete")
        files_done = p.get("files_done", 0)
        files_total = p.get("files_total", 0)
        url = f"https://{username}.github.io/{repo}/projects/{name}/"

        # Status badge
        if status == "in_progress":
            status_badge = f'<span class="badge building">Building {files_done}/{files_total}</span>'
            link_text = "In progress..."
        else:
            status_badge = f'<span class="badge">{framework}</span>'
            link_text = "Visit →"

        cards += f"""
        <a href="{url}" target="_blank" class="card">
          <div class="card-header">
            <h2>{title}</h2>
            {status_badge}
          </div>
          <p>{desc}</p>
          <div class="card-footer">
            <span class="date">{built}</span>
            <span class="link">{link_text}</span>
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
    .badge.building {{
      background: #f59e0b;
      animation: pulse 2s infinite;
    }}
    @keyframes pulse {{
      0%, 100% {{ opacity: 1; }}
      50% {{ opacity: 0.6; }}
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
    try:
        # Health checks
        try:
            if not check_gemini_api():
                set_status("offline", "Gemini API not responding")
                return None
        except Exception:
            set_status("offline", "Gemini API not responding")
            return None

        # Check for incomplete project first
        incomplete = get_incomplete_project()
        if incomplete:
            log.info(f"🔄 Resuming incomplete project: {incomplete['title']}")
            set_status("building", f"Resuming: {incomplete['title']}")
            idea = incomplete
        else:
            # 1. Get new idea
            log.info("🔧 Bob is thinking of something to build...")
            set_status("thinking", "Coming up with an idea...")
            idea = get_project_idea()
            log.info(f"💡 Idea: {idea['title']} — {idea['description']} ({idea.get('framework', 'html')})")
            set_status("building", idea["title"])
            # Save as in_progress
            save_project(idea, status="in_progress")

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

        # 5. Mark complete
        update_project_status(idea["name"], "complete")
        set_status("idle", f"Built: {idea['title']}")
        log.info("✅ Bob finished! Ready for next build.")
        return idea

    except Exception as e:
        error_msg = str(e)[:200]
        set_status("error", error_msg)
        log.error(f"❌ Build failed: {e}")
        # Save error to project for rework later
        if 'idea' in dir() and idea:
            update_project_status(idea["name"], "error")
            projects_file = PROJECTS_DIR / ".projects.json"
            projects = get_previous_projects()
            for p in projects:
                if p.get("name") == idea.get("name"):
                    p["error"] = error_msg
                    break
            with open(projects_file, "w") as f:
                json.dump(projects, f, indent=2)
        raise


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

    # 3. Auto-rework failed projects
    failed = get_failed_projects()
    if failed:
        log.info(f"🔄 Found {len(failed)} failed project(s), reworking...")
        for p in failed:
            try:
                rework_project(p)
                push_changes(f"Reworked: {p['title']}")
            except Exception as e:
                log.error(f"❌ Rework failed for {p['name']}: {e}")

    # 4. Build new project
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


def _crash_handler(signum=None, frame=None):
    """Write error status on any crash."""
    set_status("error", "Process killed")
    import sys
    sys.exit(1)


def get_failed_projects() -> list:
    """Find projects that failed to build (have error in status)."""
    projects = get_previous_projects()
    return [p for p in projects if p.get("status") == "error"]


def rework_project(project: dict):
    """Re-plan and rebuild a failed project from scratch with escalating simplification."""
    name = project["name"]
    log.info(f"🔄 Reworking failed project: {project['title']}")
    set_status("building", f"Reworking: {project['title']}")

    # Delete old files
    project_dir = PROJECTS_DIR / name
    if project_dir.exists():
        import shutil
        shutil.rmtree(project_dir)
        log.info(f"🗑️ Deleted old files for {name}")

    # Try up to 5 times, getting simpler each time
    old_error = project.get("error", "Unknown error")
    old_framework = project.get("framework", "react")
    fallbacks = FRAMEWORK_FALLBACKS.get(old_framework, ["plain-html"])

    for attempt in range(5):
        # Pick framework: try fallbacks, then plain-html as last resort
        if attempt < len(fallbacks):
            use_framework = fallbacks[attempt]
        else:
            use_framework = "plain-html"

        # Escalating simplification
        if attempt == 0:
            strategy = "Fix the specific error. Keep similar structure."
            max_files = 10
        elif attempt == 1:
            strategy = "Switch to simpler framework. Reduce dependencies."
            max_files = 8
        elif attempt == 2:
            strategy = "Minimal approach. Only essential features."
            max_files = 5
        elif attempt == 3:
            strategy = "Ultra-simple. Basic HTML/CSS/JS only."
            max_files = 3
        else:
            strategy = "PLAIN HTML with inline CSS/JS. Single index.html. Guaranteed to work."
            max_files = 1

        log.info(f"  📋 Attempt {attempt + 1}/5: {use_framework} ({strategy})")

        prompt = f"""You are Bob. Rebuild "{project['title']}" - attempt {attempt + 1}/5.

Previous error: {old_error[:500]}
Framework: {use_framework}
Strategy: {strategy}
Max files: {max_files}

Return JSON:
{{"framework": "{use_framework}", "install_command": "npm install" or empty,
 "build_command": "npm run build" or empty,
 "architecture": "...",
 "components": [{{"name": "...", "description": "...", "files": [{{"path": "...", "description": "..."}}]}}],
 "config_files": [{{"path": "package.json", "description": "..."}}],
 "files": [{{"path": "index.html", "description": "..."}}]}}

RULES:
- Fix the error above
- Use ONLY: react, react-dom, framer-motion, lucide-react (or plain HTML)
- All npm packages must have EXISTING versions on npm
"""
        problems = get_problems()
        prompt += f"\nAVOID: {problems}"

        try:
            text = _api_call(prompt, temperature=0.7)
            plan = _extract_json(text)
            plan["title"] = project["title"]
            plan["description"] = project["description"]
            plan["features"] = project.get("features", [])

            # Try building
            try:
                save_project_files(name, plan)
                log.info(f"✅ Rework succeeded on attempt {attempt + 1}")
                update_project_status(name, "reworked")
                return plan
            except Exception as build_err:
                old_error = str(build_err)[:500]
                log.warning(f"  ❌ Attempt {attempt + 1} build failed: {old_error[:100]}")
                # Delete and try again
                if project_dir.exists():
                    shutil.rmtree(project_dir)
                continue
        except Exception as e:
            log.warning(f"  ❌ Plan generation failed: {e}")
            continue

    raise Exception(f"Could not rebuild {name} after 5 attempts")

    # Build with new plan
    save_project_files(name, plan)

    # Update status
    update_project_status(name, "reworked")
    log.info(f"✅ Reworked {project['title']}")


if __name__ == "__main__":
    import sys
    import signal
    signal.signal(signal.SIGTERM, _crash_handler)
    signal.signal(signal.SIGINT, lambda s, f: (_crash_handler(), None)[1])

    # Check for --rework flag
    if "--rework" in sys.argv:
        failed = get_failed_projects()
        if not failed:
            log.info("✅ No failed projects to rework")
        else:
            log.info(f"🔄 Found {len(failed)} failed project(s) to rework")
            for p in failed:
                try:
                    rework_project(p)
                except Exception as e:
                    log.error(f"❌ Rework failed for {p['name']}: {e}")
        sys.exit(0)

    try:
        main()
    except Exception as e:
        try:
            set_status("error", str(e)[:100])
        except Exception:
            pass
        log.error(f"💀 Bob crashed: {e}")
        raise
