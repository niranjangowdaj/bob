#!/usr/bin/env python3
"""
Bob — Template-Based Website Builder

Bob uses pre-tested templates and AI only customizes content.
This guarantees builds work every time.
"""

import os
import json
import time
import random
import logging
import subprocess
import shutil
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

from google import genai
from google.genai import types

load_dotenv("config/.env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [BOB] %(message)s",
    handlers=[
        logging.FileHandler("logs/bob.log"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger("bob")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GITHUB_USERNAME = os.getenv("GITHUB_USERNAME")
GITHUB_REPO = os.getenv("GITHUB_REPO", "bob")
BOB_DIR = Path(__file__).parent.resolve()
PROJECTS_DIR = BOB_DIR / "projects"
TEMPLATES_DIR = BOB_DIR / "templates"
PROJECTS_DIR.mkdir(exist_ok=True)
STATUS_FILE = BOB_DIR / "logs" / "bob_status.json"

client = genai.Client(api_key=GEMINI_API_KEY)
MODEL = "gemini-3.1-flash-lite"


# ─── Status ──────────────────────────────────────────────────────────────

def set_status(state, message=""):
    try:
        STATUS_FILE.parent.mkdir(exist_ok=True)
        with open(STATUS_FILE, "w") as f:
            json.dump({"state": state, "message": message, "updated_at": datetime.now().isoformat()}, f)
            f.flush()
            os.fsync(f.fileno())
    except Exception:
        pass


# ─── API ─────────────────────────────────────────────────────────────────

def _api_call(prompt, temperature=0.7):
    for attempt in range(5):
        try:
            response = client.models.generate_content(
                model=MODEL, contents=prompt,
                config=types.GenerateContentConfig(temperature=temperature),
            )
            return response.text.strip()
        except Exception as e:
            if "429" in str(e):
                wait = min(60, 4 * (2 ** attempt))
                log.warning(f"⏳ Rate limited, waiting {wait}s...")
                set_status("idle", f"Rate limited, waiting {wait}s")
                time.sleep(wait)
            else:
                raise
    raise Exception("Rate limited too many times")


def _extract_json(text):
    text = text.strip()
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            part = part.strip()
            for lang in ["json", "html", "css", "javascript", "typescript"]:
                if part.startswith(lang):
                    part = part[len(lang):].strip()
            if part.startswith("{"):
                return json.loads(part)
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(text[start:end+1])
    raise json.JSONDecodeError("No JSON found", text, 0)


def check_gemini_api():
    try:
        _api_call("Say ok", temperature=0.1)
        return True
    except Exception:
        return False


# ─── Problems ────────────────────────────────────────────────────────────

def get_problems():
    f = BOB_DIR / "PROBLEMS.md"
    if f.exists():
        lines = []
        in_sec = False
        for line in f.read_text().split("\n"):
            if "## Problems" in line:
                in_sec = True
                continue
            if in_sec and line.startswith("## "):
                break
            if in_sec and line.strip().startswith("-"):
                lines.append(line.strip())
        return "\n".join(lines) if lines else "(none)"
    return "(none)"


# ─── Git ─────────────────────────────────────────────────────────────────

def run_git(*args):
    return subprocess.run(["git"] + list(args), cwd=str(BOB_DIR), capture_output=True, text=True)


def has_changes():
    return bool(run_git("status", "--porcelain").stdout.strip())


def push_changes(message=""):
    if not has_changes():
        return
    if not message:
        message = f"Bob update {datetime.now().strftime('%H:%M')}"
    run_git("add", "-A")
    run_git("commit", "--author=Bob <bob@bot.local>", "-m", message)
    result = run_git("push", "origin", "main")
    if result.returncode == 0:
        log.info("✅ Pushed to GitHub")
    else:
        log.error(f"Push failed: {result.stderr}")


# ─── Project Memory ──────────────────────────────────────────────────────

def get_projects():
    f = PROJECTS_DIR / ".projects.json"
    if f.exists():
        return json.loads(f.read_text())
    return []


def get_incomplete():
    for p in reversed(get_projects()):
        if p.get("status") == "in_progress":
            return p
    return None


def get_failed():
    return [p for p in get_projects() if p.get("status") == "error"]


def save_project(project, status="complete"):
    projects = get_projects()
    project["built_at"] = datetime.now().isoformat()
    project["status"] = status
    projects.append(project)
    (PROJECTS_DIR / ".projects.json").write_text(json.dumps(projects, indent=2))
    generate_index_page()


def update_status(name, status, error=None):
    projects = get_projects()
    for p in projects:
        if p.get("name") == name:
            p["status"] = status
            if error:
                p["error"] = error
            break
    (PROJECTS_DIR / ".projects.json").write_text(json.dumps(projects, indent=2))


# ─── Template Engine ─────────────────────────────────────────────────────

def fill_template(template_file, replacements):
    """Read a template file and fill in placeholders."""
    path = TEMPLATES_DIR / template_file
    if not path.exists():
        return None
    content = path.read_text()
    for key, val in replacements.items():
        content = content.replace("{{" + key + "}}", str(val))
    return content


def build_react_project(project_dir, project_name, title, customization):
    """Build a React project from templates."""
    accent = customization.get("accent_color", "#4ade80")
    description = customization.get("description", "")
    sections = customization.get("sections", [])
    features = customization.get("features_list", [])
    js_code = customization.get("javascript", "")

    replacements = {
        "PROJECT_NAME": project_name,
        "TITLE": title,
        "ACCENT_COLOR": accent,
    }

    # Fill base templates
    for tpl in ["package.json", "vite.config.ts", "tsconfig.json", "index.html", "src/main.tsx", "src/index.css"]:
        content = fill_template("react-vite/" + tpl, replacements)
        if content:
            out = project_dir / tpl
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(content)

    # Generate App.tsx with sections
    sections_html = ""
    for s in sections:
        stitle = s.get("title", "")
        scontent = s.get("content", "")
        sections_html += '<section style="background:var(--surface);border-radius:12px;padding:2rem;margin-bottom:1.5rem">\n'
        sections_html += f'  <h2 style="font-size:1.5rem;margin-bottom:1rem;color:{accent}">{stitle}</h2>\n'
        sections_html += f'  <p style="color:var(--text-dim);line-height:1.6">{scontent}</p>\n'
        sections_html += '</section>\n'

    if not sections_html:
        sections_html = '<section style="background:var(--surface);border-radius:12px;padding:2rem">\n'
        sections_html += f'  <h2 style="font-size:1.5rem;margin-bottom:1rem;color:{accent}">{title}</h2>\n'
        sections_html += f'  <p style="color:var(--text-dim);line-height:1.6">{description}</p>\n'
        sections_html += '</section>\n'

    features_html = ""
    if features:
        items = "\n".join(f'        <li style="padding:0.5rem 0">{f}</li>' for f in features)
        features_html = f'''<div style="margin-top:2rem;padding:1.5rem;background:var(--surface);border-radius:12px">
      <h3 style="margin-bottom:1rem">Features</h3>
      <ul style="list-style:none;color:var(--text-dim)">
{items}
      </ul>
    </div>'''

    app_tsx = f"""import {{ useState }} from 'react'

export default function App() {{
  const [active, setActive] = useState(false)

  return (
    <div style={{{{"minHeight":"100vh","padding":"2rem","maxWidth":"900px","margin":"0 auto"}}}}>
      <header style={{{{"textAlign":"center","marginBottom":"3rem"}}}}>
        <h1 style={{{{"fontSize":"2.5rem","fontWeight":700}}}}>
          <span style={{{{"color":"{accent}"}}}}>{title.split()[0] if title else "App"}</span>
          {" " + " ".join(title.split()[1:]) if len(title.split()) > 1 else ""}
        </h1>
        <p style={{{{"color":"#888","marginTop":"0.5rem"}}}}>{description}</p>
      </header>
      <main>
{sections_html}
{features_html}
      </main>
      <footer style={{{{"textAlign":"center","marginTop":"3rem","color":"#555","fontSize":"0.85rem"}}}}>
        Built by Bob
      </footer>
    </div>
  )
}}
"""
    (project_dir / "src" / "App.tsx").write_text(app_tsx)


def build_html_project(project_dir, title, customization):
    """Build a plain HTML project."""
    accent = customization.get("accent_color", "#4ade80")
    description = customization.get("description", "")
    sections = customization.get("sections", [])
    js_code = customization.get("javascript", "")

    sections_html = ""
    for s in sections:
        stitle = s.get("title", "")
        scontent = s.get("content", "")
        sections_html += f'''    <section style="background:#141414;border-radius:12px;padding:2rem;margin-bottom:1.5rem">
      <h2 style="font-size:1.5rem;margin-bottom:1rem;color:{accent}">{stitle}</h2>
      <p style="color:#888;line-height:1.6">{scontent}</p>
    </section>
'''

    if not sections_html:
        sections_html = f'''    <section style="background:#141414;border-radius:12px;padding:2rem">
      <h2 style="font-size:1.5rem;margin-bottom:1rem;color:{accent}">{title}</h2>
      <p style="color:#888;line-height:1.6">{description}</p>
    </section>
'''

    title_parts = title.split()
    main_word = title_parts[0] if title_parts else "App"
    rest_words = " ".join(title_parts[1:]) if len(title_parts) > 1 else ""

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {{ --bg: #0a0a0a; --surface: #141414; --text: #e0e0e0; --text-dim: #888; --accent: {accent}; }}
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{ font-family: 'Inter', system-ui, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }}
  </style>
</head>
<body>
  <div style="max-width:900px;margin:0 auto;padding:2rem">
    <header style="text-align:center;margin-bottom:3rem">
      <h1 style="font-size:2.5rem;font-weight:700">
        <span style="color:{accent}">{main_word}</span> {rest_words}
      </h1>
      <p style="color:#888;margin-top:0.5rem">{description}</p>
    </header>
    <main>
{sections_html}
    </main>
    <footer style="text-align:center;margin-top:3rem;color:#555;font-size:0.85rem">
      Built by Bob
    </footer>
  </div>
  <script>
{js_code}
  </script>
</body>
</html>'''

    (project_dir / "index.html").write_text(html)


# ─── AI ──────────────────────────────────────────────────────────────────

CUSTOMIZE_PROMPT = """You are Bob. Generate customization for this website:

Title: {title}
Description: {description}
Features: {features}

Return JSON:
{{
  "accent_color": "#hex color",
  "sections": [{{"title": "Section", "content": "2-3 sentence paragraph"}}],
  "features_list": ["feature 1", "feature 2"],
  "javascript": "Optional JS for interactivity (animations, counters, toggles)"
}}

Rules:
- 2-4 sections with good copy
- JavaScript adds REAL interactivity (not just alerts)
- Make it visually appealing
"""


def get_customization(project):
    prompt = CUSTOMIZE_PROMPT.format(
        title=project["title"],
        description=project["description"],
        features=", ".join(project.get("features", [])),
    )
    for attempt in range(3):
        try:
            text = _api_call(prompt, temperature=0.8)
            return _extract_json(text)
        except Exception as e:
            log.warning(f"Customize attempt {attempt + 1}: {e}")
            if attempt == 2:
                raise


def generate_idea():
    previous = [p.get("name", "") for p in get_projects()[-20:]]
    problems = get_problems()

    prompt = f"""Generate ONE unique website idea. Return JSON:
{{
  "name": "kebab-case-name",
  "title": "Human Readable Title",
  "description": "One sentence description",
  "framework": "plain-html or react",
  "features": ["f1", "f2", "f3"]
}}

Rules:
- plain-html for simple interactive sites (games, tools, visualizers, landing pages)
- react for complex state management only
- Never repeat: {', '.join(previous) if previous else 'none'}
AVOID: {problems}"""

    for attempt in range(3):
        try:
            text = _api_call(prompt, temperature=1.0)
            return _extract_json(text)
        except Exception as e:
            log.warning(f"Idea attempt {attempt + 1}: {e}")
            if attempt == 2:
                raise


# ─── Build ───────────────────────────────────────────────────────────────

def build_project():
    try:
        if not check_gemini_api():
            set_status("offline", "Gemini API not responding")
            return None

        # Check for incomplete
        incomplete = get_incomplete()
        if incomplete:
            log.info(f"🔄 Resuming: {incomplete['title']}")
            set_status("building", f"Resuming: {incomplete['title']}")
            project = incomplete
        else:
            log.info("💡 Thinking of an idea...")
            set_status("thinking", "Coming up with an idea...")
            project = generate_idea()
            save_project(project, status="in_progress")

        # Prefer plain-html for reliability
        framework = "plain-html" if random.random() < 0.8 else "react"
        project_name = project["name"]
        project_dir = PROJECTS_DIR / project_name
        title = project["title"]

        log.info(f"🎨 Building: {title} ({framework})")
        set_status("building", title)

        # Get customization
        customization = get_customization(project)
        customization["title"] = title
        customization["description"] = project["description"]

        # Build
        project_dir.mkdir(exist_ok=True)

        if framework == "plain-html":
            build_html_project(project_dir, title, customization)
        else:
            build_react_project(project_dir, project_name, title, customization)

            # npm install + build
            log.info("📥 Installing...")
            env = os.environ.copy()
            env["CI"] = "true"
            r = subprocess.run("npm install", shell=True, cwd=str(project_dir),
                               capture_output=True, text=True, timeout=300, env=env)
            if r.returncode != 0:
                raise Exception(f"npm install failed: {r.stderr[:200]}")

            log.info("🔨 Building...")
            r = subprocess.run("npm run build", shell=True, cwd=str(project_dir),
                               capture_output=True, text=True, timeout=300)
            if r.returncode != 0:
                raise Exception(f"Build failed: {r.stderr[:200]}")

        # Push
        set_status("pushing", project_name)
        push_changes(f"Build: {title}")

        update_status(project_name, "complete")
        set_status("idle", f"Built: {title}")
        log.info(f"✅ Done: {title}")
        return project

    except Exception as e:
        error_msg = str(e)[:200]
        set_status("error", error_msg)
        log.error(f"❌ Failed: {e}")
        if "project" in dir() and project:
            update_status(project.get("name", ""), "error", error_msg)
        raise


# ─── Index Page ──────────────────────────────────────────────────────────

def generate_index_page():
    projects = get_projects()
    username = GITHUB_USERNAME or "YOUR_USERNAME"
    repo = GITHUB_REPO or "bob"

    cards = ""
    for p in reversed(projects):
        name = p.get("name", "")
        title = p.get("title", name)
        desc = p.get("description", "")
        framework = p.get("framework", "html")
        built = p.get("built_at", "")[:10]
        status = p.get("status", "complete")
        url = "https://" + username + ".github.io/" + repo + "/projects/" + name + "/"

        if status == "in_progress":
            badge = '<span class="badge building">Building...</span>'
            link = "In progress"
        elif status == "error":
            badge = '<span class="badge error">Error</span>'
            link = "Failed"
        else:
            badge = '<span class="badge">' + framework + '</span>'
            link = "Visit →"

        cards += '<a href="' + url + '" target="_blank" class="card">'
        cards += '<div class="card-header"><h2>' + title + '</h2>' + badge + '</div>'
        cards += '<p>' + desc + '</p>'
        cards += '<div class="card-footer"><span class="date">' + built + '</span><span class="link">' + link + '</span></div>'
        cards += '</a>\n'

    if not cards:
        cards = '<p class="empty">Bob hasn\'t built anything yet. Check back soon!</p>'

    count = len([p for p in projects if p.get("status") == "complete"])

    html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bob's Projects</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root { --bg: #0a0a0a; --card: #141414; --border: #222; --text: #e0e0e0; --dim: #888; --accent: #4ade80; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; padding: 2rem; }
    .header { text-align: center; margin-bottom: 3rem; }
    .header h1 { font-size: 2.5rem; font-weight: 700; }
    .header h1 span { color: var(--accent); }
    .header p { color: var(--dim); margin-top: 0.5rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; max-width: 1200px; margin: 0 auto; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; text-decoration: none; color: inherit; transition: all 0.2s; display: flex; flex-direction: column; gap: 0.75rem; }
    .card:hover { border-color: var(--accent); transform: translateY(-2px); }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .card h2 { font-size: 1.1rem; font-weight: 600; }
    .badge { background: var(--accent); color: #000; font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 4px; }
    .badge.building { background: #f59e0b; animation: pulse 2s infinite; }
    .badge.error { background: #ef4444; }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
    .card p { color: var(--dim); font-size: 0.9rem; line-height: 1.4; flex: 1; }
    .card-footer { display: flex; justify-content: space-between; font-size: 0.8rem; }
    .date { color: var(--dim); }
    .link { color: var(--accent); font-weight: 600; }
    .empty { text-align: center; color: var(--dim); font-size: 1.2rem; margin-top: 4rem; }
  </style>
</head>
<body>
  <div class="header">
    <h1>""" + "🤖 Bob's <span>Projects</span>" + """</h1>
    <p>Autonomously built by Bob · """ + str(count) + """ projects</p>
  </div>
  <div class="grid">
    """ + cards + """
  </div>
</body>
</html>"""

    (BOB_DIR / "index.html").write_text(html)


# ─── Main ────────────────────────────────────────────────────────────────

def main():
    log.info("🤖 Bob is alive!")
    set_status("starting", "Booting up...")

    if not GEMINI_API_KEY:
        log.error("GEMINI_API_KEY not set!")
        set_status("error", "No API key")
        return

    if has_changes():
        push_changes("Bob startup: pending changes")

    # Auto-rework failed projects
    for p in get_failed():
        log.info(f"🔄 Reworking: {p['title']}")
        set_status("building", f"Reworking: {p['title']}")
        try:
            project_dir = PROJECTS_DIR / p["name"]
            if project_dir.exists():
                shutil.rmtree(project_dir)
            update_status(p["name"], "in_progress")
        except Exception as e:
            log.error(f"Rework setup failed: {e}")

    build_project()

    while True:
        wait = random.randint(1800, 3600)
        set_status("idle", "Next build in " + str(wait // 60) + " min")
        log.info("⏰ Next build in " + str(wait // 60) + " min...")
        time.sleep(wait)
        try:
            build_project()
        except Exception as e:
            log.error("❌ Error: " + str(e))


if __name__ == "__main__":
    import signal
    import sys

    def crash_handler(sig=None, frame=None):
        set_status("error", "Process killed")
        sys.exit(1)

    signal.signal(signal.SIGTERM, crash_handler)
    try:
        main()
    except Exception as e:
        try:
            set_status("error", str(e)[:100])
        except Exception:
            pass
        log.error("💀 Crashed: " + str(e))
        raise
